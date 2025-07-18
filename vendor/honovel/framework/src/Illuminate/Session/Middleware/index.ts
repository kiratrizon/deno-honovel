export class SessionStarter {
  public handle: HttpMiddleware = async ({ request }, next) => {
    await request.sessionStart();
    request.session.put("session_started", true);
    return next();
  };
}
