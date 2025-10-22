import jwt from "jsonwebtoken";
import { jwtAccessSecret, nodeEnv } from "../../important.js";
import createError from "http-errors";

// export const isLoggedIn = (req, res, next) => {
//   try {
//     const accessToken = req.cookies.accessToken;
//     // console.log(accessToken);

//     if (!accessToken) {
//       throw createError(401, "Access token is required");
//     }

//     jwt.verify(accessToken, jwtAccessSecret, (err, decoded) => {
//       if (err) {
//         throw createError(403, "Invalid or expired token");
//       }
//       req.user = decoded;
//       next();
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const isLoggedIn = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken) {
      throw createError(401, "Access token is required");
    }

    // Verify the access token synchronously
    let decoded;
    try {
      decoded = jwt.verify(accessToken, jwtAccessSecret);
    } catch (err) {
      throw createError(403, "Invalid or expired token");
    }

    // Check if the session is still active in the database
    if (refreshToken) {
      const [sessions] = await pool.query(
        "SELECT id, is_active FROM user_sessions WHERE refresh_token = ? AND user_id = ?",
        [refreshToken, decoded?.id]
      );

      // If session doesn't exist or is inactive, reject the request
      if (sessions.length === 0 || !sessions[0].is_active) {
        // Clear invalid cookies
        res.clearCookie("accessToken", {
          httpOnly: true,
          secure: nodeEnv === "production",
          sameSite: nodeEnv === "production" ? "none" : "strict",
        });

        res.clearCookie("refreshToken", {
          httpOnly: true,
          secure: nodeEnv === "production",
          sameSite: nodeEnv === "production" ? "none" : "strict",
        });

        throw createError(
          401,
          "Session has been terminated. Please login again."
        );
      }

      // Update last active timestamp
      await pool.query("UPDATE user_sessions SET updated_at = ? WHERE id = ?", [
        new Date(),
        sessions[0].id,
      ]);
    } else {
      // No refresh token means session can't be verified
      throw createError(401, "Session invalid. Please login again.");
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
