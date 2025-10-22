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

export const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
export const cloudinaryAPIKey = process.env.CLOUDINARY_API_KEY;
export const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

export const otpExpiringAge = parseInt(process.env.OTP_AGE);

export const smtpUsername = process.env.SMTP_USERNAME;
export const smtpPassword = process.env.SMTP_PASSWORD;
export const smtpClientUrl = process.env.CLIENT_URL;

export const nodeEnv = process.env.NODE_ENV;

export const developmentOrigin = process.env.DEVELOPMENT_ORIGIN;
export const productionOrigin = process.env.PRODUCTION_ORIGIN;

export const maxDeviceCount = process.env.MAX_DEVICES;
