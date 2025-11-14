import { Route } from "Illuminate/Support/Facades/index.ts";
import Content from "App/Models/Content.ts";
import HomeController from "App/Http/Controllers/HomeController.ts";

const myTabs = [
  { name: "Home", href: "/", current: false },
  { name: "Documentation", href: "/docs", current: false },
  { name: "About", href: "/about", current: false },
];

Route.get("/", [HomeController, "index"]);

Route.get("/create-project", async ({ request }) => {
  // for "deno run -A https://honovel.deno.dev/create-project my-app@latest" setup
  return response()
    .file(basePath("vendor/honovel/framework/install.ts"))
    .withHeaders({
      "Content-Type": "application/typescript", // Set the appropriate content type for TypeScript files
    });
});

Route.get("/docs/{content}", async ({ request }, content: Content) => {
  if (!content) {
    return redirect("/");
  }
  const newMyTabs = [...myTabs].map((tab) => {
    if (tab.href === "/docs") {
      return { ...tab, current: true };
    }
    return tab;
  });
  // @ts-ignore //
  return view("contents", { myTabs: newMyTabs, contentId: content.id });
});
