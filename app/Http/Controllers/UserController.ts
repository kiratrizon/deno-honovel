import Controller from "./Controller.ts";

class UserController extends Controller {
  // function guide
  // index: HttpDispatch = async ({ request }) => {
  //    // your code here
  // };
  // or

  // public async view({request}:HttpHono){
  //    // your code here
  // }

  index: HttpDispatch = async (_) => {
    return view('welcome', {
      "hello": "world"
    })
  };

  public async view(_: HttpHono) {
    return view('welcome', {
      'hello': 'world'
    });
  }

  public async test({ request }: HttpHono, id: string) {
    console.log('hello')
    return response().json({
      id
    })
  }

  public async show(_: HttpHono, user: string) {
    return response().json({ user })
  }
}

export default UserController;
