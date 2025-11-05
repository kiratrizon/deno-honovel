import Controller from "App/Http/Controllers/Controller.ts";
import { MailService } from "Illuminate/Support/Facades/MailerService.ts";

class MailerController extends Controller {
    public sendMail: HttpDispatch = async ({ request }) => {
        const {
            to = "",
            subject = "",
            text = "",
            html = "",
            attachments = [],
            fromName = "No Reply",
            fromEmail = "noreply@example.com",
        } = request.input();

        console.log({ to, subject, text, html, attachments, fromName, fromEmail });
        // force TypeScript to treat attachments as an array
        const attachmentsArray: any[] = Array.isArray(attachments) ? attachments : [];


        const mailerService = new MailService();
        const result = await mailerService.sendMail({
            to,
            subject,
            text,
            html,
            attachments: attachmentsArray, // ✅ now always an array
            fromName,
            fromEmail,
        });

        return response().json(result);
    };
}

export default MailerController;
