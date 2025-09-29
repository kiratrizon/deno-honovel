import Controller from "App/Http/Controllers/Controller.ts";
import Project from "../../Models/Project.ts";

class ProjectController extends Controller {
  // create function like this
  public projects: HttpDispatch = async ({ request }) => {
    // your logic here
    const projects = (await Project.all()).map((project) => {
      const obj = project.toObject();
      return obj;
    });
    // toObject()
    return response().json(projects);
  };
}

export default ProjectController;
