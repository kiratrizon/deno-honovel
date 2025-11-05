import nodemailer from "nodemailer";

export class MailService {
    private transporter;

    constructor() {
        const port: number = 587;
        this.transporter = nodemailer.createTransport({
            host: config("mailer.host"),
            port,
            secure: port === 465,
            auth: {
                user: config("mailer.user"),
                pass: config("mailer.pass"),
            },
            tls: {
                ciphers: "TLSv1.2",  // ✅ Ensure modern TLS
                rejectUnauthorized: false, // Optional (shared hosting)
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
        
        try {
            const info = await this.transporter.sendMail(params);

            return {
                success: true,
                messageId: info.messageId,
                preview: nodemailer.getTestMessageUrl?.(info) || null, // Ethereal support
            };
        } catch (error) {
            // console.error("Mail error:", error);
            console.log("Mail params:", "\n", jsonEncode(params));
            return { success: false, error };
        }
    }
}
