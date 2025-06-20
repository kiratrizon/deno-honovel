import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";

Route.resource("users", UserController).whereNumber("user");
Route.get("/", async () => {
    return new Response(
        "Hello World",
        {
            status: 200
        }
    )
})
export default Route;
