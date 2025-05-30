import Controller from "./Controller.ts";
// function guide
// index: HttpDispatch = async ({ request }) => {
//    // your code here
// };

class UserController extends Controller {
  index: HttpDispatch = async ({ request }) => {
    console.log(this.constructor.name);
  };
}

export default UserController;
