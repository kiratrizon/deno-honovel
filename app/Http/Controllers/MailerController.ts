import Controller from "App/Http/Controllers/Controller.ts";
import { MailService } from "Illuminate/Support/Facades/MailerService.ts";
import transporter from "../../../test.ts";

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

    public testMail: HttpDispatch = async ({request}) => {
        const param = request.input();

        await transporter.sendMail(
            param
        );

        return response().json({ success: true });
    }
}

export default MailerController;
