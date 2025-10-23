import { generateDeviceId, parseDeviceInfo } from "../utils/device.js";
import {
  formatDeviceInfoForStorage,
  getClientDeviceInfo,
  getDeviceInfo,
} from "../utils/deviceInfo.js";

export const test = async (req, res, next) => {
  try {
    // const deviceInfo = getDeviceInfo(req);
    // console.log(deviceInfo);

    // const storageDeviceInfo = formatDeviceInfoForStorage(deviceInfo);
    // console.log(storageDeviceInfo);

    // const xxx = getClientDeviceInfo(deviceInfo);
    // console.log(xxx);

    const deviceInfo2 = generateDeviceId(req);
    console.log(deviceInfo2);

    const deviceInfoParse = parseDeviceInfo(req);
    console.log(deviceInfoParse);

    res.status(200).json({
      success: true,
      message: "successfully passed",
      data: {
        deviceInfo2,
        deviceInfoParse,
      },
    });
  } catch (error) {
    next(error);
  }
};
