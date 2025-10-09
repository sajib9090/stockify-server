import pool from "../config/db.js";
import createError from "http-errors";
import { validateString } from "../utils/validateString.js";
import validator from "validator";

export const handleAddBrand = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { name, mobile_1 } = req.body;
  try {
    if (!user) {
      throw createError(401, "Unauthorized");
    }
    if (!name) {
      throw createError(400, "Brand name is required");
    }
    if (!mobile_1) {
      throw createError(400, "One mobile number is required");
    }

    const processedBrandName = validateString(name, "Name", 2, 30);

    if (mobile_1?.length !== 11) {
      throw createError(400, "Mobile number must be 11 characters");
    }

    if (!validator.isMobilePhone(mobile_1, "any")) {
      throw createError(400, "Invalid mobile number");
    }
    // Check if user already has a brand
    const [userRows] = await pool.query(
      "SELECT brand_id FROM users WHERE id = ?",
      [user?.id]
    );
    if (userRows?.length === 0) {
      throw createError(404, "User not found");
    }
    const userData = userRows[0];
    if (userData?.brand_id) {
      throw createError(400, "User already has a brand");
    }

    // Insert user into database
    const [result] = await pool.query(
      "INSERT INTO brands (name, mobile_1) VALUES (?, ?)",
      [processedBrandName, mobile_1]
    );

    if (!result?.insertId) {
      throw createError(500, "Failed to create brand");
    }
    // Update user's brand_id
    const [updateResult] = await pool.query(
      "UPDATE users SET brand_id = ? WHERE id = ?",
      [result?.insertId, user?.id]
    );
    if (updateResult?.affectedRows === 0) {
      throw createError(500, "Failed to associate brand with user");
    }
    res.status(200).send({
      success: true,
      message: "Brand created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetBrand = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  try {
    if (!user) {
      throw createError(401, "Unauthorized");
    }
    // Only fetch brand_id from users table
    const [userRows] = await pool.query(
      "SELECT brand_id FROM users WHERE id = ?",
      [user?.id]
    );

    if (userRows?.length === 0) {
      throw createError(404, "User not found");
    }

    const userData = userRows[0];

    // Check if user has a brand_id
    if (!userData?.brand_id) {
      throw createError(400, "User is not associated with any brand");
    }

    // Query the brands table using user's brand_id
    const [brands] = await pool.query("SELECT * FROM brands WHERE id = ?", [
      userData?.brand_id,
    ]);

    if (brands?.length === 0) {
      throw createError(404, "Brand not found");
    }

    const brandData = brands[0];
    res.status(200).send({
      success: true,
      message: "Data fetched successfully",
      data: brandData,
    });
  } catch (error) {
    next(error);
  }
};
