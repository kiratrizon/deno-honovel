import Controller from "App/Http/Controllers/Controller.ts";
import Content from "../../Models/Content.ts";
import { Cache } from "Illuminate/Support/Facades/index.ts";

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
    let content = (await Cache.get("home_content")) as Record<
      string,
      unknown
    > | null;
    if (!content) {
      content = (await Content.orderBy("sort").first())?.toObject() as Record<
        string,
        unknown
      >;
    }

    let id = 1;
    if (content) {
      // @ts-ignore //
      id = content.id!;
      // save in cache
      await Cache.put("home_content", content, 3600 * 24); // 1 day
    }
    return view("welcome", { myTabs: newMyTabs, contentId: id, title: "Home" });
  };

  public about: HttpDispatch = async ({ request }) => {
    const newMyTabs = [...myTabs].map((tab) => {
      if (tab.href === "/about") {
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
    return view("about", { myTabs: newMyTabs, contentId: id, title: "About" });
  };
}

export default HomeController;
