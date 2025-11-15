import Controller from "App/Http/Controllers/Controller.ts";
import Content from "../../Models/Content.ts";

const myTabs = [
  { name: "Home", href: "/", current: false },
  { name: "Documentation", href: "/docs", current: false },
  { name: "About", href: "/about", current: false },
];

class HomeController extends Controller {
  // create function like this
  public index: HttpDispatch = async ({ request }) => {
    const newMyTabs = [...myTabs].map((tab) => {
      if (tab.href === "/") {
        return { ...tab, current: true };
      }
      return tab;
    });

    const content = await Content.orderBy("sort").first();
    let id = 1;
    if (content) {
      // @ts-ignore //
      id = content.id!;
    }
    return view("welcome", { myTabs: newMyTabs, contentId: id, title: "Home" });
  };
}

export default HomeController;
