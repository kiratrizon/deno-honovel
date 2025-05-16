import Server from "./main.ts";

const app = Server.app;

const PORT = Deno.env.get("PORT") || 2000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
