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
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

export const handleCreateUser = async (req, res, next) => {
  const { name, email, mobile, password } = req.body;
  try {
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

    // generate a six digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    console.log("Verification Code:", verificationCode);

    const hashedVerificationCode = await bcrypt.hash(verificationCode, salt);

    // store verification code in otp table
    const [otpResult] = await pool.query(
      "INSERT INTO otp (user_id, otp) VALUES (?, ?)",
      [result?.insertId, hashedVerificationCode]
    );
    if (!otpResult?.insertId) {
      throw createError(500, "Failed to store verification code");
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
    if (user.active_status === 0) {
      // Generate 6-digit OTP
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      console.log("Verification Code:", verificationCode);

      // Hash the OTP before storing
      const salt = await bcrypt.genSalt(10);
      const hashedVerificationCode = await bcrypt.hash(verificationCode, salt);

      // Store OTP in the database
      const [otpResult] = await pool.query(
        "INSERT INTO otp (user_id, otp) VALUES (?, ?)",
        [user.id, hashedVerificationCode]
      );

      if (!otpResult.insertId) {
        throw createError(500, "Failed to store verification code");
      }

      // Send response with info (don’t send the real OTP in production)
      return res.status(403).json({
        success: true,
        message:
          "Your account is not active yet. A verification code has been sent.",
      });
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
        avatar_url: user?.avatar_url,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleVerifyOtp = async (req, res, next) => {
  
  try {
    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
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

export const handleEditUser = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { name } = req.body;
  const bufferFile = req.file?.buffer;
  try {
    if (!user) {
      throw createError(401, "Unauthorized");
    }
    // get user info from db
    const [rows] = await pool.query(
      "SELECT name, avatar_id, avatar_url FROM users WHERE id = ?",
      [user?.id]
    );

    const existingUser = rows[0] || null;
    if (!existingUser) {
      throw createError(404, "User not found");
    }

    const updates = [];
    const values = [];

    // ✅ Validate & update name if changed
    if (name !== undefined) {
      const processedName = validateString(name, "Name", 2, 30);
      if (processedName !== existingUser?.name) {
        updates.push("name = ?");
        values.push(processedName);
      }
    }

    // ✅ Handle avatar upload if file provided
    if (bufferFile) {
      // delete old one if exists
      if (existingUser?.avatar_id) {
        await deleteFromCloudinary(existingUser?.avatar_id);
      }

      const avatar = await uploadOnCloudinary(bufferFile);
      if (!avatar?.public_id || !avatar?.secure_url) {
        throw createError(500, "Something went wrong while uploading image");
      }

      // add avatar fields to update
      updates.push("avatar_id = ?", "avatar_url = ?");
      values.push(avatar.public_id, avatar.secure_url);
    }

    // If no changes detected, return early
    if (updates.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes detected. Data is already up to date",
        data: existingUser,
      });
    }

    // ✅ Always update updated_at
    updates.push("updated_at = NOW()");
    values.push(user?.id);

    // Build & execute update query
    const updateQuery = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    const [result] = await pool.query(updateQuery, values);

    if (!result || result?.affectedRows === 0) {
      throw createError(500, "Failed to update user in the database");
    }

    //get updated user info from db
    const [newRows] = await pool.query(
      "SELECT id, email, name, avatar_url, role FROM users WHERE id = ?",
      [user?.id]
    );
    const userInfo = newRows[0] || null;
    if (!userInfo) {
      throw createError(404, "User not found after update");
    }
    res.status(200).json({
      success: true,
      message: "User edit successfully",
      user: {
        id: userInfo?.id,
        email: userInfo?.email,
        name: userInfo?.name,
        role: userInfo?.role,
        avatar_url: userInfo?.avatar_url,
      },
    });
  } catch (error) {
    next(error);
  }
};
