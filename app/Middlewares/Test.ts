class Test {
  public handle: HttpMiddleware = async (_, next) => {
    _.request.session().put("test", "value");
    if (true) {
      console.log("Middleware executed");
      return next();
    }
    return view("welcome");
  };
}

export default Test;
