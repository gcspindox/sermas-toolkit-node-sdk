import { format, transports, createLogger as wCreateLogger } from "winston";

export const createLogger = (name: string) =>
  wCreateLogger({
    defaultMeta: { name },
    format: format.json(),
    transports: new transports.Console(),
  });
