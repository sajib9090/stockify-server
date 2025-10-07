import "dotenv/config";

export const port = process.env.PORT;

export const dbHost = process.env.DB_HOST;
export const dbPort = process.env.DB_PORT;
export const dbUser = process.env.DB_USER;
export const dbPassword = process.env.DB_PASSWORD;
export const dbName = process.env.DB_NAME;

export const jwtSecret = process.env.JWT_SECRET;
export const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
export const jwtAccessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN;
export const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN;
export const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

export const accessTokenCookieMaxAge = parseInt(
  process.env.ACCESS_TOKEN_COOKIE_MAXAGE
);
export const refreshTokenCookieMaxAge = parseInt(
  process.env.REFRESH_TOKEN_COOKIE_MAXAGE
);

export const nodeEnv = process.env.NODE_ENV;
