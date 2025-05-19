import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

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
            subject: 'Email Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #4a5568; margin-bottom: 10px;">Verify Your Email</h1>
                        <p style="color: #718096; font-size: 16px;">Thanks for signing up with LynqIt!</p>
                    </div>

                    <div style="background-color: #f7fafc; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 20px;">
                        <p style="font-size: 16px; color: #4a5568; margin-bottom: 10px;">Your verification code is:</p>
                        <h2 style="font-size: 32px; letter-spacing: 5px; color: #3182ce; margin: 0;">${otp}</h2>
                        <p style="font-size: 14px; color: #718096; margin-top: 10px;">This code will expire in 10 minutes.</p>
                    </div>

                    <div style="color: #718096; font-size: 14px; text-align: center;">
                        <p>If you didn't request this code, you can safely ignore this email.</p>
                        <p>© ${new Date().getFullYear()} LynqIt. All rights reserved.</p>
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
            subject: 'Welcome to LynqIt!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #4a5568; margin-bottom: 10px;">Welcome to LynqIt!</h1>
                        <p style="color: #718096; font-size: 16px;">Hi ${name}, we're excited to have you on board!</p>
                    </div>

                    <div style="background-color: #f7fafc; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <p style="font-size: 16px; color: #4a5568;">Your account has been successfully created and verified.</p>
                        <p style="font-size: 16px; color: #4a5568;">You can now start connecting with friends, sending messages, and enjoying all the features LynqIt has to offer.</p>
                    </div>

                    <div style="text-align: center; margin-bottom: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display: inline-block; background-color: #3182ce; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold;">Start Chatting Now</a>
                    </div>

                    <div style="color: #718096; font-size: 14px; text-align: center;">
                        <p>If you have any questions, feel free to reply to this email.</p>
                        <p>© ${new Date().getFullYear()} LynqIt. All rights reserved.</p>
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
