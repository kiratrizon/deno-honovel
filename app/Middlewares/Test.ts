class Test {
  public handle: HttpMiddleware = async (_, next) => {
    if (true) {
      return next();
    }
    return view("welcome");
  };
}

export default Test;
