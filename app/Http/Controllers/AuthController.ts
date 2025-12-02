import Controller from "App/Http/Controllers/Controller.ts";
import GoogleOAuthClient from "../../../vendor/Google/GoogleOAuthClient.ts";

class AuthController extends Controller {
  // create function like this
  public google: HttpDispatch = async ({ request }, code) => {
    const appUrl = config("app").url;
    const googleAuth = new GoogleOAuthClient({
      clientId: env("GOOGLE_CLIENT_ID") || "",
      clientSecret: env("GOOGLE_CLIENT_SECRET") || "",
    });
    if (!code) {
      switch (request.query("scope") || null) {
        case "calendar":
          googleAuth.setScopes(GoogleOAuthClient.SCOPES.CALENDAR);
          break;
      }
      const authUrl = googleAuth.getAuthUrl({
        redirectUri: `${appUrl}/auth/google/callback`,
      });
      return redirect(authUrl);
    } else if (code === "callback") {
      const token = await googleAuth.getToken({
        code: request.input("code") as string,
        redirectUri: `${appUrl}/auth/google/callback`,
      });
      if (token.access_token) {
        const userInfo = await googleAuth.getUserInfo(token.access_token);
        return response().json({ user: userInfo });
      } else {
        return response()
          .status(400)
          .json({ error: "Failed to get access token" });
      }
    }
    return response().status(400).json({ error: "Invalid request" });
  };
}

export default AuthController;
