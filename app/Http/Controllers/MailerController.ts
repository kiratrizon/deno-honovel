import Controller from "App/Http/Controllers/Controller.ts";
import { MailService } from "Illuminate/Support/Facades/MailerService.ts";

class MailerController extends Controller {
    // create function like this
    public sendMail: HttpDispatch = async ({ request }) => {

        const { to, subject, text, html } = await request.validate({
            to: "required|email",
            subject: "required",
            text: "required",
            html: "required",
        })

        const mailerService = new MailService();
        const result = await mailerService.sendMail({
            to,
            subject,
            text,
            html,
        });
        return response().json(result);
    }
}

export default MailerController;