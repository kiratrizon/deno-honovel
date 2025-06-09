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
    return response().header('test', 'hello');
  };

  public async view(_: HttpHono) {
    return view('hello', {
      'hello': 'world'
    });
  }

  public async test({ request }: HttpHono, id: string) {
    return response().json({
      id
    })
  }
}

export default UserController;
