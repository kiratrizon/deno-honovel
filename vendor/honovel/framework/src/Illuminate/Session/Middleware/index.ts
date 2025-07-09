export class SessionStarter {
  public handle: HttpMiddleware = async ({ request }, next) => {
    await request.sessionStart();
    return next();
  };
}
