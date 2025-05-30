import Controller from "./Controller.ts";
// function guide
// index: HttpDispatch = async ({ request }) => {
//    // your code here
// };

class UserController extends Controller {
  index: HttpDispatch = async ({ request }) => {
    return response().json(
      {
        message: "Hello, User!",
      },
      404
    );
  };
}

export default UserController;
