import { Route } from "Illuminate/Support/Facades/index.ts";
import ProjectController from "App/Http/Controllers/ProjectController.ts";
import MailerController from "App/Http/Controllers/MailerController.ts";

Route.prefix("/portfolio").group(() => {
  Route.post("/projects", [ProjectController, "projects"]);
});

Route.post("/mailer/send", [MailerController, "sendMail"]);