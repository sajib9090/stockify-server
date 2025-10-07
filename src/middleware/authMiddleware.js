import jwt from "jsonwebtoken";
import { jwtAccessSecret } from "../../important.js";
import createError from "http-errors";

export const isLoggedIn = (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    // console.log(accessToken);

    if (!accessToken) {
      throw createError(401, "Access token is required");
    }

    jwt.verify(accessToken, jwtAccessSecret, (err, decoded) => {
      if (err) {
        throw createError(403, "Invalid or expired token");
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    next(error);
  }
};
