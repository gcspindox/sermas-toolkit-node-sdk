import axios, { isAxiosError } from "axios";
import * as https from "https";
import { defaults } from "../config/defaults.js";

export type AuthConfig = {
  PUBLIC_AUTH_URL?: string;
  PUBLIC_AUTH_REALM?: string;
  PRIVATE_AUTH_CLIENT_ID?: string;
  PRIVATE_AUTH_CLIENT_SECRET?: string;
  PRIVATE_API_BASE_URL?: string;
};

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: Date;
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV !== "development",
});

/**
 * Returns access and refresh tokens for the given appId
 * @param {string} appId null by default
 * @param {AuthConfig} authConfig
 */
export const getAvatarToken = async (
  appId: string | null = null,
  authConfig: AuthConfig = defaults.auth,
) => {
  const logger = console;
  const tokens: Record<string, TokenResponse | null> = {};
  let kioskToken: TokenResponse | null = null;

  const PUBLIC_AUTH_URL =
    authConfig.PUBLIC_AUTH_URL || defaults.auth.PUBLIC_AUTH_URL;
  const PUBLIC_AUTH_REALM =
    authConfig.PUBLIC_AUTH_REALM || defaults.auth.PUBLIC_AUTH_REALM;
  const PRIVATE_AUTH_CLIENT_ID =
    authConfig.PRIVATE_AUTH_CLIENT_ID || defaults.auth.PRIVATE_AUTH_CLIENT_ID;
  const PRIVATE_AUTH_CLIENT_SECRET =
    authConfig.PRIVATE_AUTH_CLIENT_SECRET ||
    defaults.auth.PRIVATE_AUTH_CLIENT_SECRET;
  const PRIVATE_API_BASE_URL =
    authConfig.PRIVATE_API_BASE_URL || defaults.auth.PRIVATE_API_BASE_URL;

  const getAvatarToken = async (appId: string | null = null) => {
    await getSystemAccessToken();

    let appToken: TokenResponse | null = null;
    if (appId) {
      appToken = await getAppAccessToken(appId);
    }

    return {
      ...(appToken || {}),
      appId,
    };
  };

  const getAppAccessToken = async (
    appId: string,
    clientId = "avatar",
  ): Promise<TokenResponse | null> => {
    logger.log(`Fetch app token for appId=${appId} clientId=${clientId}`);

    const cacheKey = `${appId}-${clientId}`;

    tokens[cacheKey] = tokens[cacheKey] || null;

    if (tokens[cacheKey]) {
      const expiresIn = tokens[cacheKey]?.expiresIn;
      if (!expiresIn || new Date(expiresIn).getTime() - 30000 < Date.now()) {
        tokens[cacheKey] = null;
      }
    }

    if (tokens[cacheKey]) {
      logger.log(`Using cached token for ${cacheKey}`);
      return tokens[cacheKey];
    }

    try {
      const url = `${PRIVATE_API_BASE_URL}/platform/token`;
      const data = {
        appId,
        clientId,
      };

      logger.debug(`Requesting to ${url}`);
      const res = await axios.post(url, data, {
        httpsAgent,
        headers: {
          Authorization: `Bearer ${kioskToken?.accessToken}`,
        },
      });

      // expires 1min before
      const expiresIn = res.data.expires_in * 1000;
      logger.log(
        `Token for ${appId} expires in ${Math.round(expiresIn / 60 / 60 / 1000)}min`,
      );

      const { access_token, refresh_token } = res.data;

      const token = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: new Date(Date.now() + expiresIn),
      };

      tokens[cacheKey] = token;

      return token;
    } catch (e) {
      if (e instanceof Error) logger.error(`Request failed ${e?.message}`);
      if (isAxiosError(e)) {
        logger.error(e.response?.data);
        delete tokens[cacheKey];
      }
    }
    return null;
  };

  const getSystemAccessToken = async (): Promise<TokenResponse | null> => {
    const cacheKey = "___kiosk___";

    if (tokens[cacheKey]) {
      const expiresIn = tokens[cacheKey]?.expiresIn;
      if (!expiresIn || new Date(expiresIn).getTime() - 30000 < Date.now()) {
        tokens[cacheKey] = null;
      }
    }

    if (tokens[cacheKey]) return tokens[cacheKey];

    logger.debug(`Load kiosk access token`);

    const url = `${PUBLIC_AUTH_URL}/realms/${PUBLIC_AUTH_REALM}/protocol/openid-connect/token`;
    const data = {
      client_id: PRIVATE_AUTH_CLIENT_ID,
      client_secret: PRIVATE_AUTH_CLIENT_SECRET,
      grant_type: "client_credentials",
    };

    try {
      logger.debug(`Requesting to ${url}`);
      const res = await axios.post(url, data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${btoa(PRIVATE_AUTH_CLIENT_ID + ":" + PRIVATE_AUTH_CLIENT_SECRET)}`,
        },
      });

      // expires 1min before
      const expiresIn = res.data.expires_in * 1000;
      logger.debug(
        `kioskToken expires in ${Math.round(expiresIn / 60 / 60 / 1000)}min`,
      );

      // const access_token = await getAuthorizationToken(res.data.access_token)
      const { access_token, refresh_token } = res.data;

      kioskToken = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: new Date(Date.now() + expiresIn),
      };

      tokens["__kiosk"] = kioskToken;

      return kioskToken;
    } catch (e) {
      kioskToken = null;
      if (e instanceof Error) logger.error(`Request failed ${e.message}`);
      if (isAxiosError(e)) {
        logger.error(e.response?.data);
      }
    }
    return null;
  };

  return await getAvatarToken(appId);
};

/**
 * Returns access and refresh tokens for the given appId
 * @param {string} appId null by default
 * @param {AuthConfig} authConfig only PRIVATE_API_BASE_URL and PRIVATE_AUTH_CLIENT_ID are used
 * @param {string} clientSecret needed for server2server authentication
 */
export const getAvatarTokenWithClientSecret = async (
  appId: string | null = null,
  authConfig: AuthConfig = defaults.auth,
  clientSecret: string = "",
) => {
  const logger = console;
  const tokens: Record<string, TokenResponse | null> = {};

  const PRIVATE_API_BASE_URL =
    authConfig.PRIVATE_API_BASE_URL || defaults.auth.PRIVATE_API_BASE_URL;
  const PRIVATE_AUTH_CLIENT_ID =
    authConfig.PRIVATE_AUTH_CLIENT_ID || defaults.auth.PRIVATE_AUTH_CLIENT_ID;

  const getAppAccessTokenWithClientSecret = async (
    appId: string,
    clientId = "avatar",
    clientSecret = "",
  ): Promise<TokenResponse | null> => {
    logger.log(
      `Fetch app token for appId=${appId} clientId=${clientId} clientSecret=${clientSecret}`,
    );

    const cacheKey = `${appId}-${clientId}`;

    tokens[cacheKey] = tokens[cacheKey] || null;

    if (tokens[cacheKey]) {
      const expiresIn = tokens[cacheKey]?.expiresIn;
      if (
        !expiresIn ||
        new Date(expiresIn).getTime() - 60 * 1000 < Date.now()
      ) {
        tokens[cacheKey] = null;
      }
    }

    if (tokens[cacheKey]) {
      logger.log(`Using cached token for ${cacheKey}`);
      return tokens[cacheKey];
    }

    try {
      const url = `${PRIVATE_API_BASE_URL}/platform/token/access_token`;
      logger.debug(`Requesting to ${url}`);
      const data = {
        appId,
        clientId,
        clientSecret,
      };
      logger.debug(`get token from ${url}`);
      const res = await axios.post(url, data, {
        httpsAgent,
      });

      // expires 1min before
      const expiresIn = res.data.expires_in * 1000;
      logger.log(
        `Token for ${appId} expires in ${Math.round(expiresIn / 60 / 60 / 1000)}min`,
      );

      const { access_token, refresh_token } = res.data;

      const token = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: new Date(Date.now() + expiresIn),
      };

      tokens[cacheKey] = token;

      return token;
    } catch (e) {
      if (e instanceof Error) logger.error(`Request failed ${e.message}`);
      if (isAxiosError(e)) {
        logger.error(e.response?.data);
        delete tokens[cacheKey];
      }
    }
    return null;
  };

  const getAvatarTokenWithClientSecret = async (
    appId: string | null = null,
    clientId: string = "",
    clientSecret = "",
  ) => {
    let appToken: TokenResponse | null = null;
    if (appId) {
      appToken = await getAppAccessTokenWithClientSecret(
        appId,
        clientId,
        clientSecret,
      );
    }

    return {
      ...(appToken || {}),
      appId,
    };
  };

  return await getAvatarTokenWithClientSecret(
    appId,
    PRIVATE_AUTH_CLIENT_ID,
    clientSecret,
  );
};
