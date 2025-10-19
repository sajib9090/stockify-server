export const emailTemplate = (otp) => {
  return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
        <tr>
            <td style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px; text-align: center; background-color: #4F46E5; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Verification Code</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 24px;">
                                Hello,
                            </p>
                            <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                                We received a request to verify your account. Please use the following One-Time Password (OTP) to complete your verification:
                            </p>
                            
                            <!-- OTP Box -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="text-align: center; padding: 30px 0;">
                                        <div style="display: inline-block; background-color: #F3F4F6; border: 2px dashed #4F46E5; border-radius: 8px; padding: 20px 40px;">
                                            <span style="font-size: 36px; font-weight: bold; color: #4F46E5; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 20px 0; color: #333333; font-size: 16px; line-height: 24px;">
                                This code will expire in <strong style="color: #4F46E5;">10 minutes</strong>.
                            </p>
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 22px;">
                                If you didn't request this code, please ignore this email or contact our support team if you have concerns.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 15px 20px;">
                                        <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 20px;">
                                            <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your OTP.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #F9FAFB; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 20px;">
                                Best regards,<br>
                                <strong>Stockify</strong>
                            </p>
                            <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 18px;">
                                This is an automated message, please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Footer Text -->
                <table role="presentation" style="width: 600px; margin: 20px auto 0 auto;">
                    <tr>
                        <td style="text-align: center; padding: 0 40px;">
                            <p style="margin: 0; color: #999999; font-size: 12px; line-height: 18px;">
                                © 2025 Stockify. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};
