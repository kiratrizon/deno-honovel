import Controller from "App/Http/Controllers/Controller.ts";
import Content from "../../Models/Content.ts";
const myTabs = [
  { name: "Home", href: "/", current: false },
  { name: "Documentation", href: "/docs", current: false },
  { name: "About", href: "/about", current: false },
];
class ContentController extends Controller {
  // GET /resource
  public index: HttpDispatch = async ({ request }) => {
    // List all resources
    return response().json({
      message: "index",
    });
  };

  // GET /resource/{id}
  public show: HttpDispatch = async ({ request }, content: Content) => {
    if (!content) {
      return redirect("/");
    }
    const newMyTabs = [...myTabs].map((tab) => {
      if (tab.href === "/docs") {
        return { ...tab, current: true };
      }
      return tab;
    });
    const contents = await Content.orderBy("sort").orderBy("category").get();
    // @ts-ignore //
    return view(content.view, {
      myTabs: newMyTabs,
      // @ts-ignore //
      contentId: content.id,
      contents,
    });
  };

  // GET /resource/create
  public create: HttpDispatch = async ({ request }) => {
    // Return form or data for creating resource
    return response().json({
      message: `create`,
    });
  };

  // POST /resource
  public store: HttpDispatch = async ({ request }) => {
    // Create a new resource
    return response().json({
      message: `store`,
    });
  };

  // GET /resource/{id}/edit
  public edit: HttpDispatch = async ({ request }, id) => {
    // Return form or data for editing resource
    return response().json({
      message: `edit ${id}`,
    });
  };

  // PUT or PATCH /resource/{id}
  public update: HttpDispatch = async ({ request }, id) => {
    // Update a resource by ID
    return response().json({
      message: `update ${id}`,
    });
  };

  // DELETE /resource/{id}
  public destroy: HttpDispatch = async ({ request }, id) => {
    // Delete a resource by ID
    return response().json({
      message: `delete ${id}`,
    });
  };
}

export default ContentController;
