import { sendEmail } from '../lib/email.js';

/**
 * Send support/grievance email
 * @route POST /api/support/submit
 * @access Private
 */
export const submitSupportRequest = async (req, res) => {
    try {
        const { subject, message, category } = req.body;
        const user = req.user; // From auth middleware

        if (!subject || !message || !category) {
            return res.status(400).json({ message: "Subject, message, and category are required" });
        }

        // Generate HTML content for the email
        const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Support Request / Grievance</h1>
                    <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin-top: 10px;">Category: ${category}</p>
                </div>

                <!-- Main content -->
                <div style="background-color: white; padding: 30px 25px;">
                    <h2 style="color: #4F46E5; font-size: 22px; margin-top: 0;">User Information</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; width: 150px;"><strong>User ID:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${user._id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${user.fullName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${user.email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Username:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${user.username}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Date Submitted:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>

                    <h2 style="color: #4F46E5; font-size: 22px; margin-top: 25px;">Support Request Details</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; width: 150px;"><strong>Subject:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${subject}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Category:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${category}</td>
                        </tr>
                    </table>

                    <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin-top: 20px; border-left: 4px solid #4F46E5;">
                        <h3 style="color: #4F46E5; font-size: 18px; margin-top: 0; margin-bottom: 10px;">Message:</h3>
                        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap; margin: 0;">${message}</p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #F3F4F6; padding: 20px; text-align: center;">
                    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} LynqIt. All rights reserved.
                    </p>
                </div>
            </div>
        `;

        // Send email from lynqit.official@gmail.com to slynqit@gmail.com
        await sendEmail(
            'slynqit@gmail.com', 
            `[Support Request] ${subject}`, 
            htmlContent
        );

        res.status(200).json({ success: true, message: "Your support request has been submitted successfully" });
    } catch (error) {
        console.error("Error submitting support request:", error);
        res.status(500).json({ message: "Failed to submit support request. Please try again later." });
    }
}; 