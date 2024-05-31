import {
  AppToolsDTO,
  DialogueToolsRepositoryOptionsDto,
} from "@sermas/api-client";
import { BaseSessionWrapper } from "../dto/session.js";
import { SermasApp } from "./sermas.js";

type ToolsSchemaValues = string | number | boolean | undefined;
type ToolsSchemaParameters = Record<string, ToolsSchemaValues>;

class Tools {
  private sermas: SermasApp;

  constructor(sermasApp: SermasApp) {
    this.sermas = sermasApp;
  }

  async reset(session: BaseSessionWrapper) {
    await this.sermas.setTools(session.sessionId, []);
  }

  async set(session: BaseSessionWrapper, tools: AppToolsDTO[]) {
    await this.sermas.setTools(session.sessionId, tools);
  }

  async add(
    session: BaseSessionWrapper,
    tools: AppToolsDTO[],
    options?: DialogueToolsRepositoryOptionsDto,
  ) {
    await this.sermas.addTools(session.sessionId, tools, options);
  }

  getSchemaValues<T extends ToolsSchemaParameters = ToolsSchemaParameters>(
    tool: AppToolsDTO,
  ): T {
    const values: ToolsSchemaParameters = {};

    if (!tool.schema) return values as T;

    tool.schema.forEach((schema) => (values[schema.parameter] = schema.value));

    return values as T;
  }

  getSchemaValue(tool: AppToolsDTO, parameterName: string) {
    const values = this.getSchemaValues(tool);
    return values[parameterName];
  }
}

export { Tools };
