import pool from "../config/db.js";
import createError from "http-errors";
import { validateString } from "../utils/validateString.js";
import validator from "validator";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

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
    // console.log(userData);
    // Insert user into database
    const now = new Date();
    const [result] = await pool.query(
      "INSERT INTO brands (name, mobile_1, created_at) VALUES (?, ?, ?)",
      [processedBrandName, mobile_1, now]
    );

    if (!result?.affectedRows) {
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
      data: {
        brand_id: result?.insertId,
        name: processedBrandName,
        mobile_1: mobile_1,
      },
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

export const handleEditBrand = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { name, mobile_1, mobile_2, district, sub_district, address } =
    req.body;
  const bufferFile = req.file?.buffer;
  try {
    if (!user) {
      throw createError(401, "Unauthorized");
    }

    //find user in db
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

    //find brand in db
    const [brandRows] = await pool.query("SELECT * FROM brands WHERE id = ?", [
      userData?.brand_id,
    ]);
    if (brandRows?.length === 0) {
      throw createError(404, "Brand not found");
    }
    const currentBrand = brandRows[0];
    const updates = [];
    const values = [];

    // ✅ Validate & update name if changed
    if (name !== undefined) {
      const processedName = validateString(name, "Name", 2, 30);
      if (processedName !== currentBrand?.name) {
        updates.push("name = ?");
        values.push(processedName);
      }
    }
    // ✅ Validate & update mobile if changed
    if (mobile_1 !== undefined) {
      if (mobile_1?.length !== 11) {
        throw createError(400, "Mobile number must be 11 characters");
      }

      if (!validator.isMobilePhone(mobile_1, "any")) {
        throw createError(400, "Invalid mobile number");
      }

      if (mobile_1 !== currentBrand?.mobile_1) {
        updates.push("mobile_1 = ?");
        values.push(mobile_1);
      }
    }
    if (mobile_2 !== undefined) {
      if (mobile_2?.length !== 11) {
        throw createError(400, "Mobile number must be 11 characters");
      }

      if (!validator.isMobilePhone(mobile_2, "any")) {
        throw createError(400, "Invalid mobile number");
      }

      if (mobile_2 !== currentBrand?.mobile_2) {
        updates.push("mobile_2 = ?");
        values.push(mobile_2);
      }
    }
    // ✅ Validate & update district if changed
    if (district !== undefined) {
      const processedDistrict = validateString(district, "District", 2, 50);
      if (processedDistrict !== currentBrand?.district) {
        updates.push("district = ?");
        values.push(processedDistrict);
      }
    }
    // ✅ Validate & update sub_district if changed
    if (sub_district !== undefined) {
      const processedSubDistrict = validateString(
        sub_district,
        "Sub District",
        2,
        100
      );
      if (processedSubDistrict !== currentBrand?.sub_district) {
        updates.push("sub_district = ?");
        values.push(processedSubDistrict);
      }
    }
    // ✅ Validate & update address if changed
    if (address !== undefined) {
      const processedAddress = validateString(address, "Address", 5, 255);
      if (processedAddress !== currentBrand?.address) {
        updates.push("address = ?");
        values.push(processedAddress);
      }
    }

    if (bufferFile) {
      // delete old one if exists
      if (currentBrand?.logo_id) {
        await deleteFromCloudinary(currentBrand?.logo_id);
      }

      const avatar = await uploadOnCloudinary(bufferFile);
      if (!avatar?.public_id || !avatar?.secure_url) {
        throw createError(500, "Something went wrong while uploading image");
      }

      // add avatar fields to update
      updates.push("logo_id = ?", "logo_url = ?");
      values.push(avatar.public_id, avatar.secure_url);
    }

    if (updates?.length === 0) {
      throw createError(400, "No changes detected");
    }

    const updatedAt = new Date();
    updates.push("updated_at = ?");
    values.push(updatedAt);
    values.push(userData?.brand_id);

    const sql = `UPDATE brands SET ${updates.join(", ")} WHERE id = ?`;
    const [result] = await pool.query(sql, values);
    if (result?.affectedRows === 0) {
      throw createError(500, "Failed to update brand");
    }
    res.status(200).json({
      success: true,
      message: "Edit brand - to be implemented",
    });
  } catch (error) {
    next(error);
  }
};
