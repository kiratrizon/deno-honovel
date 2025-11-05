import nodemailer from "nodemailer";

export class MailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config("mailer.host"),
            port: Number(config("mailer.port") ?? 587),
            secure: config("mailer.secure") || false, // true = 465
            auth: {
                user: config("mailer.user"),
                pass: config("mailer.pass"),
            },
        });
    }

    async sendMail({
        to,
        subject,
        text,
        html,
        attachments = [],
        fromName,
        fromEmail,
    }: {
        to: string;
        subject: string;
        text?: string;
        html?: string;
        attachments?: Array<any>;
        fromName?: string;
        fromEmail?: string;
    }) {
        // ✅ dynamic from like PHP
        const fromHeader =
            fromName && fromEmail
                ? `"${fromName}" <${fromEmail}>`
                : `"No Reply" <${config("mailer.from")}>`;

        const params = {
            from: fromHeader,
            to,
            subject,
            text,
            html,
            attachments,
            replyTo: fromEmail ?? undefined, // reply-to if provided
        };
        console.log("Mail params:", "\n", params);
        try {
            const info = await this.transporter.sendMail(params);

            return {
                success: true,
                messageId: info.messageId,
                preview: nodemailer.getTestMessageUrl?.(info) || null, // Ethereal support
            };
        } catch (error) {
            // console.error("Mail error:", error);
            return { success: false, error };
        }
    }
}
