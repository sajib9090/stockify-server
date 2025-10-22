import useragent from "useragent";

export const getDeviceInfo = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  const agent = useragent.parse(userAgent);
  return {
    browser: agent.family,
    browserVersion: agent.toVersion(),
    os: agent.os.family,
    osVersion: agent.os.toVersion(),
    device: agent.device.family,
    userAgent: userAgent,
    ip: req.ip || req.connection.remoteAddress,
    realIp: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    isMobile:
      agent.device.family === "iPhone" ||
      agent.device.family === "Android" ||
      false,
    isTablet: agent.device.family === "iPad" || false,
    isDesktop:
      !agent.device.family.includes("Phone") &&
      !agent.device.family.includes("Tablet"),
  };
};

export const formatDeviceInfoForStorage = (deviceInfo) => {
  const { userAgent, realIp, ...storageInfo } = deviceInfo;
  return storageInfo;
};

export const getClientDeviceInfo = (deviceInfo) => {
  return {
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    device: deviceInfo.device,
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
  };
};
