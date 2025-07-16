import nodemailer from 'nodemailer';

// Email service for sending password reset emails
class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure nodemailer transporter
    // For development, we'll use a simple console logger
    // In production, you would configure with actual SMTP settings
    this.transporter = nodemailer.createTransport({
      // Use ethereal email for testing or configure with real SMTP
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
        pass: process.env.SMTP_PASS || 'ethereal.pass'
      }
    });
  }

  async sendPasswordResetEmail(to: string, newPassword: string, organizationName: string) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@thriviohr.com',
        to: to,
        subject: `ThrivioHR - Admin Password Reset for ${organizationName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset - ThrivioHR</h2>
            <p>Hello,</p>
            <p>Your admin password for <strong>${organizationName}</strong> has been reset by the corporate administrator.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Your New Temporary Password:</h3>
              <p style="font-size: 18px; font-family: monospace; background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 3px;">
                <strong>${newPassword}</strong>
              </p>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">⚠️ Important Security Notice</h4>
              <ul style="color: #856404; margin: 0;">
                <li>You will be prompted to change this password on your next login</li>
                <li>This temporary password expires in 24 hours</li>
                <li>Please keep this password secure and change it immediately upon login</li>
              </ul>
            </div>
            
            <p>To log in:</p>
            <ol>
              <li>Go to your ThrivioHR login page</li>
              <li>Use your existing username/email with the new password above</li>
              <li>You'll be prompted to set a new password immediately</li>
            </ol>
            
            <p>If you have any questions or concerns, please contact your corporate administrator.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This is an automated message from ThrivioHR. Please do not reply to this email.
            </p>
          </div>
        `
      };

      // For development, log the email instead of sending
      if (process.env.NODE_ENV === 'development') {
        console.log('=== PASSWORD RESET EMAIL (DEV MODE) ===');
        console.log(`To: ${to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`New Password: ${newPassword}`);
        console.log(`Organization: ${organizationName}`);
        console.log('======================================');
        return { success: true, messageId: 'dev-mode' };
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }
}

export const emailService = new EmailService();