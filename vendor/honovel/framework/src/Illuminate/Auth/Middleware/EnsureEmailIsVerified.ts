/**
 * Ensure Email Is Verified Middleware.
 *
 * Verifies that the authenticated user has a verified email address.
 * If not verified, redirects to the specified route or aborts with 401.
 */
export default class EnsureEmailIsVerified {
  public handle: HttpMiddleware = async ({ request }, next, redirectRoute) => {
    const user = request.user();
    if (!user || !user.hasVerifiedEmail()) {
      if (redirectRoute) {
        return redirect(redirectRoute);
      }
      abort(401, "Unauthorized");
    }

    return next();
  };
}
