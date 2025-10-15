export interface BaseSessionWrapper {
  [key: string]: unknown;
  storageId: string;
  appId: string;
  sessionId: string;
  userId: string;
  language?: string;
}
