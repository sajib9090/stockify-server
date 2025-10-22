import UAParser from "ua-parser-js";
import pool from "../config/db.js";

// Generate unique device ID
export function generateDeviceId(req) {
  const parser = new UAParser(req.headers["user-agent"]);
  const ua = parser.getResult();

  const fingerprint = {
    browser: ua.browser.name,
    os: ua.os.name,
    device: ua.device.type || "desktop",
    ip: req.ip,
  };

  return crypto
    .createHash("md5")
    .update(JSON.stringify(fingerprint))
    .digest("hex");
}

// Parse device information
export function parseDeviceInfo(req) {
  const parser = new UAParser(req.headers["user-agent"]);
  const ua = parser.getResult();

  return {
    deviceName: `${ua.browser.name} on ${ua.os.name}`,
    deviceType: ua.device.type || "desktop",
    browser: ua.browser.name,
    browserVersion: ua.browser.version,
    os: ua.os.name,
    osVersion: ua.os.version,
    deviceVendor: ua.device.vendor,
    deviceModel: ua.device.model,
  };
}

// Check and enforce device limit
export async function checkAndEnforceDeviceLimit(
  userId,
  currentDeviceId,
  maxDevices
) {
  const [activeDevices] = await pool.query(
    `SELECT * FROM user_devices 
     WHERE user_id = ? AND is_active = TRUE 
     ORDER BY last_active DESC`,
    [userId]
  );

  // If current device is already in active devices, no need to check limit
  const currentDevice = activeDevices.find(
    (device) => device.device_id === currentDeviceId
  );
  if (currentDevice) {
    return; // Device already exists, no limit issue
  }

  // If at or over limit, remove oldest device
  if (activeDevices.length >= maxDevices) {
    const oldestDevice = activeDevices[activeDevices.length - 1];

    await pool.query("UPDATE user_devices SET is_active = FALSE WHERE id = ?", [
      oldestDevice.id,
    ]);

    // Also remove the refresh token for that device
    await pool.query("DELETE FROM user_tokens WHERE token_hash = ?", [
      crypto
        .createHash("sha256")
        .update(oldestDevice.refresh_token_hash)
        .digest("hex"),
    ]);
  }
}

// Store device session
export async function storeDeviceSession(
  userId,
  deviceId,
  refreshToken,
  deviceInfo,
  ipAddress
) {
  const hashedToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await pool.query(
    `INSERT INTO user_devices 
     (user_id, device_id, device_name, device_type, browser, os, ip_address, refresh_token_hash) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
     refresh_token_hash = VALUES(refresh_token_hash),
     last_active = CURRENT_TIMESTAMP,
     is_active = TRUE,
     ip_address = VALUES(ip_address)`,
    [
      userId,
      deviceId,
      deviceInfo.deviceName,
      deviceInfo.deviceType,
      deviceInfo.browser,
      deviceInfo.os,
      ipAddress,
      hashedToken,
    ]
  );
}

// Update device count
export async function updateDeviceCount(userId) {
  const [countResult] = await pool.query(
    "SELECT COUNT(*) as device_count FROM user_devices WHERE user_id = ? AND is_active = TRUE",
    [userId]
  );

  await pool.query("UPDATE users SET device_count = ? WHERE id = ?", [
    countResult[0].device_count,
    userId,
  ]);
}

// Get active devices
export async function getActiveDevices(userId) {
  const [devices] = await pool.query(
    `SELECT id, device_name, device_type, browser, os, ip_address, last_active, created_at 
     FROM user_devices 
     WHERE user_id = ? AND is_active = TRUE 
     ORDER BY last_active DESC`,
    [userId]
  );

  return devices;
}
