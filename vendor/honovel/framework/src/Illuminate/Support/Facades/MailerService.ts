// MailService.ts
import nodemailer from "nodemailer";

export class MailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config("mailer.host"),
            port: Number(config("mailer.port") ?? 587),
            secure: config("mailer.secure") === "true", // true = 465
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
    }: {
        to: string;
        subject: string;
        text?: string;
        html?: string;
        attachments?: Array<any>;
    }) {
        try {
            const info = await this.transporter.sendMail({
                from: `"No Reply" <${config("mailer.from")}>`,
                to,
                subject,
                text,
                html,
                attachments,
            });

            return {
                success: true,
                messageId: info.messageId,
                preview:
                    nodemailer.getTestMessageUrl?.(info) || null, // Ethereal support
            };
        } catch (error) {
            console.error("Mail error:", error);
            return { success: false, error };
        }
    }
}
