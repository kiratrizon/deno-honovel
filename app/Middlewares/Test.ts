class Test {
  public handle: HttpMiddleware = async (_, next) => {
    _.request.session().put("test", "value");
    if (true) {
      return next();
    }
    return view("welcome");
  };
}

export default Test;
