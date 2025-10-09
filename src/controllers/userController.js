import createError from "http-errors";
import { validateString } from "../utils/validateString.js";
import validator from "validator";
import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  accessTokenCookieMaxAge,
  jwtAccessExpiresIn,
  jwtAccessSecret,
  jwtRefreshExpiresIn,
  jwtRefreshSecret,
  nodeEnv,
  refreshTokenCookieMaxAge,
} from "../../important.js";

export const handleCreateUser = async (req, res, next) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name) {
      throw createError(400, "Name is required");
    }
    if (!email) {
      throw createError(400, "Email is required");
    }
    if (!mobile) {
      throw createError(400, "Mobile is required");
    }
    if (!password) {
      throw createError(400, "Password is required");
    }

    const processedName = validateString(name, "Name", 3, 30);
    const processedEmail = email?.toLowerCase();

    if (!validator.isEmail(processedEmail)) {
      throw createError(400, "Invalid email address");
    }

    if (mobile?.length !== 11) {
      throw createError(400, "Mobile number must be 11 characters");
    }

    if (!validator.isMobilePhone(mobile, "any")) {
      throw createError(400, "Invalid mobile number");
    }

    const trimmedPassword = password.replace(/\s/g, "");
    if (trimmedPassword.length < 8 || trimmedPassword.length > 30) {
      throw createError(
        400,
        "Password must be at least 8 characters long and not more than 30 characters long"
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

    const [rows] = await pool.query(
      `SELECT *, 
    CASE 
      WHEN email = ? THEN 'email'
      WHEN mobile = ? THEN 'mobile'
      ELSE NULL
    END as matched_field
  FROM users 
  WHERE email = ? OR mobile = ? 
  LIMIT 1`,
      [processedEmail, mobile, processedEmail, mobile]
    );

    const existingUser = rows[0] || null;

    if (existingUser) {
      const field = existingUser.matched_field;
      throw createError(400, `User with this ${field} already exists`);
    }

    // Insert user into database
    const [result] = await pool.query(
      "INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)",
      [processedName, processedEmail, mobile, hashedPassword]
    );

    if (!result?.insertId) {
      throw createError(500, "Failed to create user");
    }

    res.status(200).send({
      success: true,
      message: "User register in successfully",
      data: {
        id: result?.insertId,
        name: processedName,
        email: processedEmail,
        mobile: mobile,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleLoginUser = async (req, res, next) => {
  const { email_mobile, password } = req.body;
  try {
    if (!email_mobile || !password) {
      throw createError(400, "Email or mobile and password are required");
    }
    const stringData = email_mobile?.trim().replace(/\s+/g, "").toLowerCase();

    if (email_mobile?.length > 50 || email_mobile?.length < 3) {
      throw createError(400, "Email, or mobile should be valid");
    }

    const trimmedPassword = password.replace(/\s/g, "");

    if (trimmedPassword.length < 8 || trimmedPassword.length > 30) {
      throw createError(
        400,
        "Password must be at least 8 characters long and not more than 30 characters long"
      );
    }

    // Find user by email or mobile
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? OR mobile = ? LIMIT 1",
      [stringData, stringData]
    );

    const user = rows[0] || null;

    if (!user) {
      throw createError(401, "Invalid credentials");
    }

    // Check if user is not active
    if (user?.active_status === 0) {
      throw createError(403, "Your account is not active yet");
    }
    // Check if user is banned
    if (user?.banned_user) {
      throw createError(403, "Your account has been banned");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      trimmedPassword,
      user?.password
    );

    if (!isPasswordValid) {
      throw createError(401, "Invalid credentials");
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      {
        id: user?.id,
        active_status: user?.active_status,
        role: user?.role,
      },
      jwtAccessSecret,
      { expiresIn: jwtAccessExpiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user?.id },
      jwtRefreshSecret,
      { expiresIn: jwtRefreshExpiresIn } // Longer-lived refresh token
    );

    // Set HTTP-only cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: nodeEnv === "production",
      sameSite: "strict",
      maxAge: accessTokenCookieMaxAge,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: nodeEnv === "production",
      sameSite: "strict",
      maxAge: refreshTokenCookieMaxAge, // 7 days
    });

    // Optionally store refresh token in database for better security
    await pool.query(
      "UPDATE users SET refresh_token = ?, last_login = NOW() WHERE id = ?",
      [refreshToken, user?.id]
    );

    res.status(200).send({
      success: true,
      message: "User login successfully",
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        role: user?.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw createError(401, "Refresh token is required");
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret);
    // console.log("object", decoded);
    // Verify token exists in database
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE id = ? AND refresh_token = ? LIMIT 1",
      [decoded?.id, refreshToken]
    );

    const user = rows[0];
    // console.log(user);
    if (!user) {
      throw createError(403, "Invalid refresh token");
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        id: user?.id,
        active_status: user?.active_status,
        role: user?.role || "user",
      },
      jwtAccessSecret,
      { expiresIn: jwtAccessExpiresIn }
    );

    // Set new access token cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: accessTokenCookieMaxAge,
    });

    res.status(200).send({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const handleLogout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Remove refresh token from database
      await pool.query(
        "UPDATE users SET refresh_token = NULL WHERE refresh_token = ?",
        [refreshToken]
      );
    }

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).send({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
