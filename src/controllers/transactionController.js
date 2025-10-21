import pool from "../config/db.js";
import createError from "http-errors";

export const handleAddTransaction = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { id } = req.params;
  const { amount, type, description, created_date } = req.body;
  try {
    if (!user) throw createError(401, "Unauthorized");

    if (!amount) throw createError(400, "Amount is required");

    if (!type) throw createError(400, "Type is required");

    if (!created_date) throw createError(400, "Created date is required");

    // 🔹 Validate numeric amount
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0)
      throw createError(400, "Invalid amount");

    // 🔹 Check valid transaction type
    if (!["credit", "debit"].includes(type))
      throw createError(400, "Type must be 'credit' or 'debit'");

    // 🔹 Keep description as is, just handle null/undefined
    const finalDescription = description || null;

    // find client by id
    const [clientRows] = await pool.query(
      `SELECT * FROM clients WHERE id = ?`,
      [id]
    );

    if (!clientRows || clientRows?.length === 0) {
      throw createError(404, "Client not found");
    }
    const client = clientRows[0];

    // 🔹 Insert transaction
    const now = new Date();
    const timeOnly = now.toTimeString().split(" ")[0]; // "HH:MM:SS"
    const result = await pool.query(
      `
      INSERT INTO transactions 
      (client_id, amount, type, description, created_date, created_time)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        client?.id,
        numericAmount,
        type,
        finalDescription,
        created_date,
        timeOnly,
      ]
    );

    if (!result || result?.affectedRows === 0) {
      throw createError(500, "Failed to add transaction");
    }

    // update client's updated_at field

    await pool.query(`UPDATE clients SET updated_at = ? WHERE id = ?`, [
      now,
      client?.id,
    ]);

    res.status(200).json({
      success: true,
      message: "Add transaction successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetTransactions = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { id } = req.params;

  // 🔹 Get pagination parameters from query string
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  try {
    if (!user) throw createError(401, "Unauthorized");

    // 🔹 Find client by id
    const [clientRows] = await pool.query(
      `SELECT * FROM clients WHERE id = ?`,
      [id]
    );
    if (!clientRows || clientRows?.length === 0) {
      throw createError(404, "Client not found");
    }
    const client = clientRows[0];

    // 🔹 Get total count of transactions
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM transactions WHERE client_id = ?`,
      [client.id]
    );
    const totalTransactions = countResult[0].total;

    // 🔹 Fetch paginated transactions for the client
    const [transactions] = await pool.query(
      `SELECT * FROM transactions 
       WHERE client_id = ? 
       ORDER BY created_date DESC, id DESC
       LIMIT ? OFFSET ?`,
      [client.id, limit, offset]
    );

    if (!transactions || transactions?.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No transactions found for this client",
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalTransactions: 0,
          limit,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    // 🔹 Calculate pagination info
    const totalPages = Math.ceil(totalTransactions / limit);

    res.status(200).json({
      success: true,
      message: "Get transactions successfully",
      data: transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalTransactions,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetTransactionById = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { transactionId } = req.params;

  try {
    if (!user) throw createError(401, "Unauthorized");

    // 🔹 Fetch transaction by id
    const [transactions] = await pool.query(
      `SELECT * FROM transactions WHERE id = ?`,
      [transactionId]
    );

    if (!transactions || transactions?.length === 0) {
      throw createError(404, "Transaction not found");
    }

    const transaction = transactions[0];

    res.status(200).json({
      success: true,
      message: "Get transaction successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const handleDeleteTransaction = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { id } = req.params;
  try {
    if (!user) throw createError(401, "Unauthorized");

    //check transaction exist or not and then remove it from db
    const [rows] = await pool.query(
      "SELECT id FROM transactions WHERE id = ?",
      [id]
    );

    if (rows?.length === 0) {
      throw createError(404, "Transaction not found");
    }

    // Remove from db
    const [result] = await pool.query("DELETE FROM transactions WHERE id = ?", [
      id,
    ]);

    if (!result || result?.affectedRows === 0) {
      throw createError(500, "Failed to delete transaction");
    }

    res.status(200).json({
      success: true,
      message: "Transaction remove successfully",
    });
  } catch (error) {
    next(error);
  }
};
