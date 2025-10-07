import app from "./src/app.js";
import { dbPort } from "./important.js";
import pool from "./src/config/db.js";

(async () => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    console.log("✅ DB connected:", rows[0].result); // should print 2
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1); // stop server if DB is not reachable
  }
})();

const PORT = dbPort || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
