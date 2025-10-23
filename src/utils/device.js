import { UAParser } from "ua-parser-js";
import pool from "../config/db.js";
import crypto from "crypto";

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

// Parse device information with enhanced mobile detection
export function parseDeviceInfo(req) {
  const parser = new UAParser(req.headers["user-agent"]);
  const ua = parser.getResult();

  const isMobile = ua.device.type === "mobile" || ua.device.type === "tablet";

  // Get device brand and model
  const deviceVendor = ua.device.vendor || null;
  const deviceModel = ua.device.model || null;

  // Create a more descriptive device name
  let deviceName;
  if (isMobile && deviceVendor && deviceModel) {
    // For mobile: "Samsung Galaxy S21 (Chrome on Android)"
    deviceName = `${deviceVendor} ${deviceModel} (${ua.browser.name} on ${ua.os.name})`;
  } else if (isMobile && (deviceVendor || deviceModel)) {
    // Partial mobile info
    deviceName = `${deviceVendor || deviceModel} (${ua.browser.name} on ${
      ua.os.name
    })`;
  } else {
    // Desktop or unknown mobile
    deviceName = `${ua.browser.name} on ${ua.os.name}`;
  }

  return {
    deviceName,
    deviceType: ua.device.type || "desktop",
    browser: ua.browser.name || "Unknown",
    browserVersion: ua.browser.version || null,
    os: ua.os.name || "Unknown",
    osVersion: ua.os.version || null,
    deviceVendor: deviceVendor,
    deviceModel: deviceModel,
  };
}
