export class StartSession {
  public handle: HttpMiddleware = async ({ request }, next) => {
    await request.sessionStart();
    if (!request.session.has("_token")) {
      // Regenerate CSRF token if it exists in the session
      request.session.regenerateToken();
    }
    return next();
  };
}
