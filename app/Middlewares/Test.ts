class Test {
  public handle: HttpMiddleware = async (_, next) => {
    if (false) {
      await next();
    }
    return view("welcome");
  };
}

export default Test;
