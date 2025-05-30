import Controller from "./Controller.ts";
// function guide
// index: HttpDispatch = async ({ request }) => {
//    // your code here
// };

class UserController extends Controller {
  index: HttpDispatch = async ({ request }) => {
    return response().download(publicPath("style.css"), 200);
  };
}

export default UserController;
