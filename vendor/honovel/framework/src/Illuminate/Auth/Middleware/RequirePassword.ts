/**
 * Require password confirmation middleware.
 *
 * Ensures that the user has confirmed their password within
 * a specified timeout period (default: 3 hours).
 */
export default class RequirePassword {
  public handle: HttpMiddleware = async ({ request }, next, redirectRoute) => {
    const confirmedAt = request.session.get("auth.password_confirmed_at") as
      | number
      | null; // in milliseconds

    // default: 3 hours
    const timeout = 3 * 60 * 60 * 1000;

    if (!confirmedAt || Date.now() - confirmedAt > timeout) {
      return request.expectsJson()
        ? abort(403, "Password confirmation required")
        : redirect(redirectRoute ?? "/confirm-password");
    }

    return next();
  };
}
