import RouteServiceProvider from "App/Providers/RouteServiceProvider.ts";

export default class RedirectIfAuthenticated {
  public handle: HttpMiddleware = async ({ Auth }, next, guard) => {
    if (await Auth.guard(guard).check()) {
      return redirect(RouteServiceProvider.home);
    }
    // Implement logic here
    return next();
  };
}
