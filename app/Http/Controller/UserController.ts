class UserController {
  async index({ request }: HttpHono) {
    request.bearerToken();
  }
}

export default UserController;
