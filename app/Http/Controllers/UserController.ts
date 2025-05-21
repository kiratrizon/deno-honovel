import Controller from "../../../main/Base/BaseController.ts";

class UserController extends Controller {
  async index({ request }: HttpHono) {
    await request.whenHas("email", async (email) => {
      console.log(email);
    });
  }
}

export default UserController;
