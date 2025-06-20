class Test {
  public handle: HttpMiddleware = async (_, next) => {
    return next();
  };
}

export default Test;
