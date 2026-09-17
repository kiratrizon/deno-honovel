import { Hash } from "../../Support/Facades/index.ts";
import { JWTAuth, Blacklist } from "../../Auth/index.ts";
import BaseGuard, { AuthUser } from "./BaseGuard.ts";
import { JWTSubject } from "./JWTSubject.ts";

export default class JwtGuard extends BaseGuard {
  #token: string | null = null;

  async check(): Promise<boolean> {
    // Implement JWT check logic
    if (this.defaultChecker()) return true;

    // Check if JWT token exists in headers
    const token = this.request.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return false; // No token provided
    }
    // Verify the JWT token, rejecting anything that has been blacklisted
    const user = (await JWTAuth.verify(token)) as Record<
      string,
      unknown
    > | null;
    if (!user) {
      return false; // Invalid, expired or revoked token
    }
    // Check if the user exists in the database
    const id = user.sub as string | number;
    const instanceUser = (await this.model.find(id)) as AuthUser | null;
    if (!instanceUser) {
      return false; // User not found
    }
    if (user.remember) {
      // If the user has a "remember me" token, set it
      this.rememberUser = user.remember as boolean;
    }
    this.#token = token;
    this.setAuth(instanceUser);

    return true;
  }

  async attempt(
    credentials: Record<string, any>,
    remember: boolean = false,
  ): Promise<string | false> {
    const provider = JwtGuard.authConf?.guards?.[this.guardName]?.provider;
    const selectedProvider = JwtGuard.authConf?.providers?.[provider];
    if (!selectedProvider) {
      throw new Error(
        `Provider ${provider} not found for guard ${this.guardName}`,
      );
    }
    const credentialKey = selectedProvider.credentialKey || "email";
    const passwordKey = selectedProvider.passwordKey || "password";
    if (
      !keyExist(credentials, credentialKey) ||
      !keyExist(credentials, passwordKey)
    ) {
      return false;
    }
    const user = (await this.model
      .where(credentialKey, credentials[credentialKey])
      .first()) as AuthUser | null;
    if (!user) {
      return false;
    }
    if (!user.getAuthPassword()) {
      return false;
    }
    if (!Hash.check(credentials[passwordKey], user.getAuthPassword())) {
      return false;
    }

    return await this.login(user, remember);
  }

  async login(
    user: AuthUser,
    remember: boolean = false,
  ): Promise<string | false> {
    // check if it has a method of JWTSubject
    if (
      !methodExist(user, "getJWTIdentifier") ||
      !methodExist(user, "getJWTCustomClaims")
    ) {
      abort(400, "User model is not JWTSubject");
    }

    this.beforeLogin(user);

    const token = JWTAuth.fromUser(user as unknown as JWTSubject, remember);

    this.rememberUser = remember;
    this.#token = token;
    this.setAuth(user);
    return token; // Return the generated JWT token
  }

  user(): AuthUser | null {
    return this.authUser;
  }

  get token(): string | null {
    return this.#token;
  }

  // make logout async to implement blacklisting
  async logout(): Promise<void> {
    // trap first
    if (this.#token && Blacklist.enabled()) {
      await JWTAuth.invalidate(this.#token);
    }
    this.#token = null;
    this.reset();
  }

  // refresh token
  async refresh(): Promise<string> {
    if (!this.#token) {
      throw new Error(
        "There is no token to refresh. Call check() or login() first.",
      );
    }

    const token = await JWTAuth.refresh(this.#token);
    this.#token = token;
    return token;
  }

  viaRemember(): boolean {
    // JWT does not have a "remember me" concept, but you can implement custom logic if needed
    return this.rememberUser;
  }
}
