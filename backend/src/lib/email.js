import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Function to get the appropriate frontend URL based on environment
const getFrontendUrl = () => {
    const nodeEnv = process.env.NODE_ENV || 'development';

    if (nodeEnv === 'production') {
        return process.env.PRODUCTION_URL || 'https://lynqit.onrender.com';
    } else {
        return process.env.LOCAL_URL || 'http://localhost:5173';
    }
};

// Get the frontend URL
const FRONTEND_URL = getFrontendUrl();

// Create a Gmail transporter for real email sending
const createTransporter = () => {
    // Check if required environment variables are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('ERROR: EMAIL_USER or EMAIL_PASSWORD not set in .env file');
        console.error('Email functionality will not work correctly');
        // Return null to indicate configuration error
        return null;
    }

    console.log('Creating email transporter with user:', process.env.EMAIL_USER);

    // Create and return the transporter
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        // Additional options for better deliverability
        tls: {
            rejectUnauthorized: false
        },
        debug: true // Enable debug logs
    });
};

// Initialize the transporter
const transporter = createTransporter();

/**
 * Send an OTP verification email
 * @param {string} to - Recipient email
 * @param {string} otp - One-time password
 * @returns {Promise<Object>} Nodemailer send mail response
 */
export const sendOTPEmail = async (to, otp) => {
    try {
        // Check if transporter is properly configured
        if (!transporter) {
            console.error('Email transporter not configured properly');
            throw new Error('Email service configuration error');
        }

        console.log(`Attempting to send OTP email to: ${to}`);

        const mailOptions = {
            from: `"LynqIt" <${process.env.EMAIL_USER}>`,
            to,
            subject: '🔐 Your LynqIt Verification Code',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <!-- Header with gradient background -->
                    <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
                        <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin-top: 10px;">One step away from joining LynqIt!</p>
                    </div>

                    <!-- Main content -->
                    <div style="background-color: white; padding: 30px 25px; text-align: center;">
                        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Thanks for signing up with LynqIt! To complete your registration, please enter the verification code below:
                        </p>

                        <!-- OTP Code Box -->
                        <div style="background: linear-gradient(to right, rgba(79, 70, 229, 0.1), rgba(124, 58, 237, 0.1)); border-radius: 12px; padding: 25px; margin: 20px 0; border: 1px dashed #4F46E5;">
                            <p style="font-size: 16px; color: #4F46E5; margin-bottom: 15px; font-weight: 500;">Your verification code is:</p>
                            <h2 style="font-size: 38px; letter-spacing: 8px; color: #4F46E5; margin: 0; font-weight: 700;">${otp}</h2>
                            <div style="width: 50px; height: 4px; background: linear-gradient(to right, #4F46E5, #7C3AED); margin: 15px auto;"></div>
                            <p style="font-size: 14px; color: #6B7280; margin-top: 15px;">
                                This code will expire in <span style="font-weight: bold; color: #4F46E5;">10 minutes</span>
                            </p>
                        </div>

                        <!-- Security note -->
                        <div style="background-color: #F9FAFB; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: left; border-left: 4px solid #4F46E5;">
                            <p style="color: #4B5563; font-size: 15px; margin: 0;">
                                <strong style="color: #4F46E5;">Security tip:</strong> Never share this code with anyone. LynqIt will never ask for your code via phone or message.
                            </p>
                        </div>

                        <!-- What's next -->
                        <div style="margin: 25px 0; text-align: left;">
                            <h3 style="color: #4F46E5; font-size: 18px; margin-bottom: 15px;">What happens next?</h3>
                            <ol style="color: #4B5563; font-size: 16px; line-height: 1.6; padding-left: 20px; margin-top: 0;">
                                <li>Enter this code on the verification page</li>
                                <li>Complete your profile setup</li>
                                <li>Start connecting with friends!</li>
                            </ol>
                        </div>

                        <!-- Help text -->
                        <p style="color: #6B7280; font-size: 15px; margin-top: 30px;">
                            Having trouble? Try <a href="${FRONTEND_URL}" style="color: #4F46E5; text-decoration: none; font-weight: 500;">refreshing the page</a> or requesting a new code.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #F3F4F6; padding: 20px; text-align: center;">
                        <p style="color: #6B7280; font-size: 14px; margin: 0 0 10px 0;">
                            If you didn't request this code, you can safely ignore this email.
                        </p>
                        <p style="color: #9CA3AF; font-size: 12px; margin: 10px 0 0 0;">
                            © ${new Date().getFullYear()} LynqIt. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', to);
        console.log('Message ID:', info.messageId);

        return info;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        console.error('Error details:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        throw error;
    }
};

/**
 * Send a welcome email after successful verification
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 * @returns {Promise<Object>} Nodemailer send mail response
 */
export const sendWelcomeEmail = async (to, name) => {
    try {
        // Check if transporter is properly configured
        if (!transporter) {
            console.error('Email transporter not configured properly');
            throw new Error('Email service configuration error');
        }

        console.log(`Attempting to send welcome email to: ${to}`);

        const mailOptions = {
            from: `"LynqIt" <${process.env.EMAIL_USER}>`,
            to,
            subject: '🎉 Welcome to LynqIt! Your Journey Begins Now',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <!-- Header with gradient background -->
                    <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to LynqIt!</h1>
                        <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin-top: 10px;">Your new communication hub</p>
                    </div>

                    <!-- Personalized greeting -->
                    <div style="background-color: white; padding: 30px 25px;">
                        <h2 style="color: #4F46E5; font-size: 22px; margin-top: 0;">Hey ${name}! 👋</h2>
                        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            We're thrilled to have you join our community! Your account has been successfully created and verified.
                        </p>

                        <!-- Features section -->
                        <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                            <h3 style="color: #4F46E5; font-size: 18px; margin-top: 0;">Here's what you can do with LynqIt:</h3>

                            <div style="display: block; margin: 15px 0;">
                                <div style="display: inline-block; vertical-align: top; width: 30px;">
                                    <span style="background-color: #4F46E5; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-weight: bold;">✓</span>
                                </div>
                                <div style="display: inline-block; width: calc(100% - 35px);">
                                    <p style="margin: 0; color: #4B5563; font-size: 16px;"><strong>Connect</strong> with friends and colleagues instantly</p>
                                </div>
                            </div>

                            <div style="display: block; margin: 15px 0;">
                                <div style="display: inline-block; vertical-align: top; width: 30px;">
                                    <span style="background-color: #4F46E5; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-weight: bold;">✓</span>
                                </div>
                                <div style="display: inline-block; width: calc(100% - 35px);">
                                    <p style="margin: 0; color: #4B5563; font-size: 16px;"><strong>Share</strong> photos, videos, and documents seamlessly</p>
                                </div>
                            </div>

                            <div style="display: block; margin: 15px 0;">
                                <div style="display: inline-block; vertical-align: top; width: 30px;">
                                    <span style="background-color: #4F46E5; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-weight: bold;">✓</span>
                                </div>
                                <div style="display: inline-block; width: calc(100% - 35px);">
                                    <p style="margin: 0; color: #4B5563; font-size: 16px;"><strong>Enjoy</strong> real-time messaging with read receipts</p>
                                </div>
                            </div>
                        </div>

                        <!-- Getting started tips -->
                        <div style="margin-bottom: 30px;">
                            <h3 style="color: #4F46E5; font-size: 18px;">Quick tips to get started:</h3>
                            <ol style="color: #4B5563; font-size: 16px; line-height: 1.6; padding-left: 20px;">
                                <li>Complete your profile with a photo and bio</li>
                                <li>Find friends using their email or username</li>
                                <li>Start your first conversation today!</li>
                            </ol>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${FRONTEND_URL}" style="display: inline-block; background: linear-gradient(to right, #4F46E5, #7C3AED); color: white; text-decoration: none; padding: 14px 30px; border-radius: 50px; font-weight: bold; font-size: 16px; transition: all 0.3s; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);">Start Chatting Now →</a>
                        </div>

                        <!-- Social proof -->
                        <div style="background-color: #F9FAFB; border-radius: 8px; padding: 15px; margin-top: 20px; text-align: center;">
                            <p style="color: #6B7280; font-size: 15px; font-style: italic; margin: 0;">
                                "LynqIt has transformed how our team communicates. It's simple, fast, and reliable!"
                            </p>
                            <p style="color: #4B5563; font-size: 14px; font-weight: bold; margin-top: 10px; margin-bottom: 0;">
                                - The LynqIt Team
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #F3F4F6; padding: 20px; text-align: center;">
                        <p style="color: #6B7280; font-size: 14px; margin: 0 0 10px 0;">
                            Need help? Reply to this email or contact our support team.
                        </p>
                        <div style="margin-bottom: 15px;">
                            <a href="#" style="display: inline-block; margin: 0 10px; color: #4F46E5; text-decoration: none; font-size: 14px;">Help Center</a>
                            <a href="#" style="display: inline-block; margin: 0 10px; color: #4F46E5; text-decoration: none; font-size: 14px;">Privacy Policy</a>
                            <a href="#" style="display: inline-block; margin: 0 10px; color: #4F46E5; text-decoration: none; font-size: 14px;">Terms of Service</a>
                        </div>
                        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                            © ${new Date().getFullYear()} LynqIt. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully to:', to);
        console.log('Message ID:', info.messageId);

        return info;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        console.error('Error details:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        throw error;
    }
};

/**
 * Send a password reset OTP email
 * @param {string} to - Recipient email
 * @param {string} otp - One-time password for password reset
 * @returns {Promise<Object>} Nodemailer send mail response
 */
export const sendPasswordResetEmail = async (to, otp) => {
    try {
        // Check if transporter is properly configured
        if (!transporter) {
            console.error('Email transporter not configured properly');
            throw new Error('Email service configuration error');
        }

        console.log(`Attempting to send password reset email to: ${to}`);

        const mailOptions = {
            from: `"LynqIt" <${process.env.EMAIL_USER}>`,
            to,
            subject: '🔒 Reset Your LynqIt Password',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <!-- Header with gradient background -->
                    <div style="background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Password Reset Request</h1>
                        <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin-top: 10px;">Secure your account</p>
                    </div>

                    <!-- Main content -->
                    <div style="background-color: white; padding: 30px 25px; text-align: center;">
                        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            We received a request to reset your LynqIt account password. To proceed with the password reset, please use the verification code below:
                        </p>

                        <!-- OTP Code Box -->
                        <div style="background: linear-gradient(to right, rgba(255, 87, 34, 0.1), rgba(255, 152, 0, 0.1)); border-radius: 12px; padding: 25px; margin: 20px 0; border: 1px dashed #FF5722;">
                            <p style="font-size: 16px; color: #FF5722; margin-bottom: 15px; font-weight: 500;">Your password reset code is:</p>
                            <h2 style="font-size: 38px; letter-spacing: 8px; color: #FF5722; margin: 0; font-weight: 700;">${otp}</h2>
                            <div style="width: 50px; height: 4px; background: linear-gradient(to right, #FF5722, #FF9800); margin: 15px auto;"></div>
                            <p style="font-size: 14px; color: #6B7280; margin-top: 15px;">
                                This code will expire in <span style="font-weight: bold; color: #FF5722;">10 minutes</span>
                            </p>
                        </div>

                        <!-- Security note -->
                        <div style="background-color: #F9FAFB; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: left; border-left: 4px solid #FF5722;">
                            <p style="color: #4B5563; font-size: 15px; margin: 0;">
                                <strong style="color: #FF5722;">Security notice:</strong> If you didn't request a password reset, please ignore this email or contact support immediately if you believe your account may be compromised.
                            </p>
                        </div>

                        <!-- What's next -->
                        <div style="margin: 25px 0; text-align: left;">
                            <h3 style="color: #FF5722; font-size: 18px; margin-bottom: 15px;">Next steps:</h3>
                            <ol style="color: #4B5563; font-size: 16px; line-height: 1.6; padding-left: 20px; margin-top: 0;">
                                <li>Enter this code on the password reset page</li>
                                <li>Create a new secure password</li>
                                <li>Log in with your new password</li>
                            </ol>
                        </div>

                        <!-- Help text -->
                        <p style="color: #6B7280; font-size: 15px; margin-top: 30px;">
                            Having trouble? Try <a href="${FRONTEND_URL}" style="color: #FF5722; text-decoration: none; font-weight: 500;">refreshing the page</a> or requesting a new code.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #F3F4F6; padding: 20px; text-align: center;">
                        <p style="color: #6B7280; font-size: 14px; margin: 0 0 10px 0;">
                            If you didn't request this code, you can safely ignore this email.
                        </p>
                        <p style="color: #9CA3AF; font-size: 12px; margin: 10px 0 0 0;">
                            © ${new Date().getFullYear()} LynqIt. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully to:', to);
        console.log('Message ID:', info.messageId);

        return info;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        console.error('Error details:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        throw error;
    }
};
