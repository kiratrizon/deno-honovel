export default class RedirectIfAuthenticated {
  public handle: HttpMiddleware = async ({ Auth }, next, guard) => {
    if (await Auth.guard(guard).check()) {
      return redirect("/home");
    }
    // Implement logic here
    return next();
  };
}
