import pool from "../config/db.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { validateString } from "../utils/validateString.js";
import createError from "http-errors";
import validator from "validator";

export const handleCreateClient = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { name, mobile, type } = req.body;

  try {
    if (!user) {
      throw createError(401, "Unauthorized");
    }

    if (!name) {
      throw createError(400, "Client name is required");
    }
    if (!type) {
      throw createError(400, "Type is required");
    }

    // Validate the name
    const processedName = validateString(name, "Name", 2, 30);

    // Only validate mobile if it exists
    if (mobile) {
      if (mobile?.length !== 11) {
        throw createError(400, "Mobile number must be 11 characters");
      }

      if (!validator.isMobilePhone(mobile, "any")) {
        throw createError(400, "Invalid mobile number");
      }
    }

    // check user exists in db
    const [userRows] = await pool.query(
      "SELECT id, brand_id FROM users WHERE id = ?",
      [user?.id]
    );

    if (!userRows || userRows?.length === 0) {
      throw createError(404, "User not found or invalid user ID");
    }

    const { id: created_by, brand_id } = userRows[0];

    // Insert client into DB
    const [result] = await pool.query(
      `INSERT INTO clients (name, type, mobile, created_at, updated_at, brand_id, created_by)
       VALUES (?, ?, ?, NOW(), NULL, ?, ?)`,
      [processedName, type, mobile || null, brand_id, created_by]
    );
    // Check if data was inserted
    if (!result || result?.affectedRows === 0) {
      throw createError(500, "Failed to add client to the database");
    }
    res.status(200).send({
      success: true,
      message: "Client added successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetClients = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;

  try {
    // 🔹 Check authorization
    if (!user) throw createError(401, "Unauthorized");

    // 🔹 Get and sanitize search query
    let searchQuery = req.query.search || "";
    searchQuery = searchQuery
      .toString()
      .trim()
      .replace(/[^\w\s+-.@]/g, "");

    // 🔹 Get brand_id from users table
    const [userRows] = await pool.query(
      "SELECT id, brand_id FROM users WHERE id = ?",
      [user.id]
    );

    if (!userRows || userRows.length === 0)
      throw createError(404, "User not found or invalid user ID");

    const { brand_id } = userRows[0];

    // 🔹 Build WHERE clause dynamically
    let whereClause = "WHERE c.brand_id = ?";
    const queryParams = [brand_id];

    if (searchQuery !== "") {
      whereClause += " AND (c.name LIKE ? OR c.mobile LIKE ?)";
      const searchPattern = `%${searchQuery}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    // 🔹 Fetch clients with transaction summary
    const [clients] = await pool.query(
      `SELECT 
        c.*,
        COALESCE(SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END), 0) AS debitSum,
        COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END), 0) AS creditSum
      FROM clients c
      LEFT JOIN transactions t ON c.id = t.client_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.id DESC`,
      queryParams
    );

    if (!clients || clients.length === 0) {
      return res.status(200).json({
        success: true,
        message: searchQuery
          ? "No clients found matching your search"
          : "No clients found",
        data: [],
        customerCount: 0,
        supplierCount: 0,
        total: 0,
      });
    }

    // 🔹 Count customers and suppliers (with same filter)
    let countWhereClause = "WHERE brand_id = ?";
    const countParams = [brand_id];

    if (searchQuery !== "") {
      countWhereClause += " AND (name LIKE ? OR mobile LIKE ?)";
      const searchPattern = `%${searchQuery}%`;
      countParams.push(searchPattern, searchPattern);
    }

    const [typeCount] = await pool.query(
      `SELECT 
        SUM(CASE WHEN type = 'customer' THEN 1 ELSE 0 END) AS total_customers,
        SUM(CASE WHEN type = 'supplier' THEN 1 ELSE 0 END) AS total_suppliers
       FROM clients 
       ${countWhereClause}`,
      countParams
    );

    const customerCount = typeCount[0]?.total_customers || 0;
    const supplierCount = typeCount[0]?.total_suppliers || 0;

    // 🔹 Add balance field
    const clientsWithBalance = clients.map((client) => ({
      ...client,
      balance: client.creditSum - client.debitSum,
    }));

    // ✅ Final response
    res.status(200).json({
      success: true,
      total: clients.length,
      customerCount,
      supplierCount,
      data: clientsWithBalance,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetClientById = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { id } = req.params;

  try {
    if (!user) {
      throw createError(401, "Unauthorized");
    }

    if (!id) {
      throw createError(401, "Client ID is required");
    }

    // 🔹 Validate and sanitize clientId
    const sanitizedId = Number(id);

    if (!sanitizedId || isNaN(sanitizedId) || sanitizedId <= 0) {
      throw createError(400, "Invalid client ID");
    }

    // 🔹 Find the client by ID
    const [clientRows] = await pool.query(
      `SELECT * FROM clients WHERE id = ?`,
      [sanitizedId]
    );

    // 🔹 Check if client exists
    if (!clientRows || clientRows.length === 0) {
      throw createError(404, "Client not found");
    }

    // 🔹 Get debit and credit sums from transactions
    const [transactionSums] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) AS debitSum,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS creditSum
      FROM transactions 
      WHERE client_id = ?`,
      [sanitizedId]
    );

    const client = clientRows[0];
    const { debitSum, creditSum } = transactionSums[0];

    res.status(200).json({
      success: true,
      data: {
        ...client,
        debitSum,
        creditSum,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleRemoveClientById = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { id } = req.params;
  try {
    if (!user) throw createError(401, "Unauthorized");

    if (!id) {
      throw createError(400, "Client ID is required");
    }

    // Validate and sanitize clientId
    const sanitizedId = Number(id);

    if (!sanitizedId || isNaN(sanitizedId) || sanitizedId <= 0) {
      throw createError(400, "Invalid client ID");
    }

    // Check if client exists and belongs to the user's brand
    const [clientRows] = await pool.query(
      "SELECT id, brand_id FROM clients WHERE id = ?",
      [sanitizedId]
    );

    if (!clientRows || clientRows?.length === 0) {
      throw createError(404, "Client not found");
    }

    // Delete all transactions for the client
    await pool.query("DELETE FROM transactions WHERE client_id = ?", [
      sanitizedId,
    ]);

    // Delete the client
    const [deleteResult] = await pool.query(
      "DELETE FROM clients WHERE id = ?",
      [sanitizedId]
    );

    if (!deleteResult || deleteResult?.affectedRows === 0) {
      throw createError(500, "Failed to remove client");
    }

    res.status(200).json({
      success: true,
      message: "Client removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleEditClientById = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { id } = req.params;
  const { name, mobile } = req.body;
  const bufferFile = req.file?.buffer;

  try {
    // Authorization check
    if (!user) throw createError(401, "Unauthorized");

    // Validate and sanitize client ID
    const sanitizedId = Number(id);
    if (!sanitizedId || isNaN(sanitizedId) || sanitizedId <= 0) {
      throw createError(400, "Invalid client ID");
    }

    // Validate at least one field is provided
    if (!name && !mobile && !bufferFile) {
      throw createError(
        400,
        "At least one field (name, mobile, or avatar) must be provided"
      );
    }

    // Fetch current client data
    const [currentClientRows] = await pool.query(
      `SELECT * FROM clients WHERE id = ?`,
      [sanitizedId]
    );

    if (!currentClientRows || currentClientRows?.length === 0) {
      throw createError(404, "Client not found");
    }

    const currentClient = currentClientRows[0];
    const updates = [];
    const values = [];

    // ✅ Validate & update name if changed
    if (name !== undefined) {
      const processedName = validateString(name, "Name", 2, 30);
      if (processedName !== currentClient?.name) {
        updates.push("name = ?");
        values.push(processedName);
      }
    }

    // ✅ Validate & update mobile if changed
    if (mobile !== undefined) {
      if (mobile?.length !== 11) {
        throw createError(400, "Mobile number must be 11 characters");
      }

      if (!validator.isMobilePhone(mobile, "any")) {
        throw createError(400, "Invalid mobile number");
      }

      if (mobile !== currentClient?.mobile) {
        updates.push("mobile = ?");
        values.push(mobile);
      }
    }

    // ✅ Handle avatar upload if file provided
    if (bufferFile) {
      // delete old one if exists
      if (currentClient?.avatar_id) {
        await deleteFromCloudinary(currentClient?.avatar_id);
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
        message: "No changes detected. Client data is already up to date",
        data: currentClient,
      });
    }

    // ✅ Always update updated_at
    updates.push("updated_at = NOW()");
    values.push(sanitizedId);

    // Build & execute update query
    const updateQuery = `UPDATE clients SET ${updates.join(", ")} WHERE id = ?`;
    const [result] = await pool.query(updateQuery, values);

    if (!result || result.affectedRows === 0) {
      throw createError(500, "Failed to update client in the database");
    }

    // Fetch updated client data
    const [updatedClientRows] = await pool.query(
      `SELECT * FROM clients WHERE id = ?`,
      [sanitizedId]
    );

    res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: updatedClientRows[0],
    });
  } catch (error) {
    next(error);
  }
};
