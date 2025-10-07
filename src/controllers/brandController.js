import pool from "../config/db.js";
import createError from "http-errors";

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
