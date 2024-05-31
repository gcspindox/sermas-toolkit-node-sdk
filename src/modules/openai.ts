import { createLogger } from "../config/logger.js";
import OpenAI, { ClientOptions } from "openai";

export type OpenAIConfig = {
  apiKey: string;
} & ClientOptions;

type ChatCompletionMessage = {
  messages: Array<OpenAI.Chat.ChatCompletionMessageParam>;
};

/**
 * Wrapper for OpenAI client to implement sermas functionalities
 */
class OpenAIClient {
  private logger = createLogger(OpenAIClient.name);
  private openAI: OpenAI;

  constructor(openAIConfig: OpenAIConfig) {
    if (!openAIConfig.apiKey)
      this.logger.warn("No API key provided for OpenAIClient");
    this.openAI = new OpenAI(openAIConfig);
  }

  async chat(
    body: string | ChatCompletionMessage,
    options?: OpenAI.RequestOptions<unknown>,
  ) {
    try {
      const result: OpenAI.Chat.ChatCompletion =
        await this.openAI.chat.completions.create(
          {
            model: "gpt-3.5-turbo",
            ...(typeof body === "string"
              ? { messages: [{ role: "user", content: body }] }
              : body),
          },
          options,
        );
      return result.choices[0].message.content;
    } catch (e: unknown) {
      if (e instanceof Error)
        this.logger.error(`OpenAI request failed: ${e.stack}`);
      return null;
    }
  }

  async json<T = Record<string, unknown>>(
    body: string | OpenAI.Chat.ChatCompletionCreateParams,
    options?: OpenAI.RequestOptions<unknown>,
  ) {
    let text = await this.chat(body, options);
    if (text === null) return;
    try {
      if (text.startsWith("```json")) {
        text = text.replace("```json", "").replace("```", "");
      }

      return JSON.parse(text) as T;
    } catch (e: unknown) {
      if (e instanceof Error)
        this.logger.error(`Failed to parse content: ${e.stack}`);
      this.logger.debug(`Content: ${text}`);
      return null;
    }
  }
}

export { OpenAIClient };
