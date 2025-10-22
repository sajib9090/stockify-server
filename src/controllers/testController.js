import {
  formatDeviceInfoForStorage,
  getClientDeviceInfo,
  getDeviceInfo,
} from "../utils/deviceInfo.js";

export const test = async (req, res, next) => {
  try {
    const deviceInfo = getDeviceInfo(req);
    console.log(deviceInfo);

    const storageDeviceInfo = formatDeviceInfoForStorage(deviceInfo);
    console.log(storageDeviceInfo);

    const xxx = getClientDeviceInfo(deviceInfo);
    console.log(xxx);

    const password =
      "$2b$10$BjAmefxJ5p0iN0alujOrnOU35y4Rv5/XgK/LLP1IrHJQ0BvyKy.lW";

    const isPasswordValid = await bcrypt.compare(
      trimmedPassword,
      user?.password
    );
    res.status(200).json({
      success: true,
      message: "successfully passed",
    });
  } catch (error) {
    next(error);
  }
};
