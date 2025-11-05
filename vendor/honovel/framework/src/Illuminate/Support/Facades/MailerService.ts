import { Resend } from "resend";

export class MailService {
  private resend;

  constructor() {
    this.resend = new Resend("re_5m3adSDj_LLpdtFMQDTkRh8kvjf5s6pkz");
  }

  async sendMail({
    to,
    subject,
    text,
    html,
    attachments = [],
    fromName = "App Mailer",
    fromEmail = "no-reply@your-domain.com",
  }: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<any>;
    fromName?: string;
    fromEmail?: string;
  }) {
    try {
      const fromHeader = `${fromName} <${fromEmail}>`;

      // Convert PHPMailer-like attachments into Resend format
      const resendAttachments = attachments.map((file) => ({
        filename: file.filename,
        content: file.content, // must be base64
        type: file.mimeType || "application/octet-stream",
      }));

      const result = await this.resend.emails.send({
        from: fromHeader,
        to,
        subject,
        html,
        text,
        attachments: resendAttachments,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Mail error:", error);
      return { success: false, error };
    }
  }
}
