import mysql from "mysql2/promise";
import { dbHost, dbName, dbPassword, dbUser } from "../../important.js";

const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
});

export default pool;
