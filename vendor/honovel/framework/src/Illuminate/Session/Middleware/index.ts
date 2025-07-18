export class SessionStarter {
  public handle: HttpMiddleware = async ({ request }, next) => {
    await request.sessionStart();
    request.session.put("session_started", true);

    const res = next(request).headers.set("X-Session-Started", "true");
    return res;
  };
}
