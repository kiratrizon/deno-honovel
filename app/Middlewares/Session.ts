class Session {
  public handle: HttpMiddleware = async ({ request }, next) => {
    await request.sessionStart();
    return next();
  };
}

export default Session;
