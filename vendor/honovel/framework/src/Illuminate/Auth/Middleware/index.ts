import { Hash } from "../../Support/Facades/index.ts";

/**
 * A middleware to authenticate users using Basic Auth.
 * It checks the Authorization header for Basic credentials,
 * decodes them, and verifies the username and password.
 * If the credentials are valid, it allows the request to proceed.
 *
 * It needs model registered in your config/auth.ts default guard.
 */
export class AuthenticateWithBasicAuth {
  public handle: HttpMiddleware = async (
    { request, Configure },
    next,
    credentialKey = "email"
  ) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      abort(401, "Unauthorized");
    }

    const base64Credentials = authHeader.split(" ")[1];
    const credentials = base64decode(base64Credentials).split(":");
    if (credentials.length !== 2) {
      abort(401, "Unauthorized");
    }

    const defaultGuard = Configure.read("auth")?.default?.guard;
    if (!defaultGuard) {
      console.error("Default guard not configured in auth settings.");
      abort(500, "Internal Server Error");
    }
    const provider = Configure.read("auth")?.guards?.[defaultGuard]?.provider;
    if (!provider) {
      console.error(`Provider not configured for guard: ${defaultGuard}`);
      abort(500, "Internal Server Error");
    }
    const userModel = Configure.read("auth")?.providers?.[provider]?.model;
    if (!userModel) {
      console.error(`Model not configured for provider: ${provider}`);
      abort(500, "Internal Server Error");
    }

    const [cred, pass] = credentials;
    const user = await userModel.where(credentialKey, cred).first();
    const passwordKey =
      Configure.read("auth")?.providers?.[provider]?.passwordKey || "password";
    if (!user || !Hash.check(pass, (user as any)[passwordKey])) {
      abort(401, "Unauthorized");
    }

    return next();
  };
}
