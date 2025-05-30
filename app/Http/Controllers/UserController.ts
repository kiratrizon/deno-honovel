import Controller from "../../../main/Base/BaseController.ts";

class UserController extends Controller {
  index: HttpDispatch = async (_, lang, myid) => {
    console.log(myid);
  };
}

export default UserController;
