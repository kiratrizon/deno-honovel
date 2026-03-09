import { Hash } from "../../Support/Facades/index.ts";
import { JWTAuth } from "../../Auth/index.ts";
import BaseGuard from "./BaseGuard.ts";
import Authenticatable from "./Authenticatable.ts";
import { JWTSubject } from "./JWTSubject.ts";

export default class JwtGuard extends BaseGuard {
  async check(): Promise<boolean> {
    // Implement JWT check logic
    if (this.authUser) {
      // If user is already set in context, return true
      return true;
    }
    const { request } = this.c.get("myHono");
    if (request.user()) {
      this.authUser = request.user();
      return true;
    }
    const key = `auth_user`;

    // Check if JWT token exists in headers
    const token = request.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return false; // No token provided
    }
    // Verify the JWT token
    const user = JWTAuth.verify(token) as Record<string, unknown> | null;
    if (!user) {
      return false; // Invalid token
    }
    // Check if the user exists in the database
    const id = user.sub as string | number;
    const instanceUser = (await this.model.find(id)) as Authenticatable | null;
    if (!instanceUser) {
      return false; // User not found
    }
    if (user.remember) {
      // If the user has a "remember me" token, set it
      this.rememberUser = user.remember as boolean;
    }
    // Set the authenticated user
    this.authUser = instanceUser;

    // Store the user in the context for later use
    this.c.set(key, instanceUser);

    return true; // Placeholder
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
      .first()) as Authenticatable | null;
    if (!user) {
      return false;
    }
    if (!Hash.check(credentials[passwordKey], user.getAuthPassword())) {
      return false;
    }

    return await this.login(user, remember);
  }

  async login(
    user: Authenticatable | JWTSubject,
    remember: boolean = false,
  ): Promise<string | false> {
    // check if it has a method of JWTSubject
    if (
      !methodExist(user, "getJWTIdentifier") ||
      !methodExist(user, "getJWTCustomClaims")
    ) {
      abort(400, "User model is not JWTSubject");
    }

    const token = JWTAuth.fromUser(user as unknown as JWTSubject, remember);

    this.rememberUser = remember;
    this.authUser = user as Authenticatable;
    const key = `auth_user`;
    this.c.set(key, this.authUser);
    return token; // Return the generated JWT token
  }

  user(): Authenticatable | null {
    // Implement JWT user retrieval logic
    return this.authUser;
  }

  logout(): void {
    // No logout logic for JWT, but you can clear the user from context
    const key = `auth_${this.guardName}_user`;
    // @ts-ignore //
    this.c.set(key, null);
    this.authUser = null;
  }

  viaRemember(): boolean {
    // JWT does not have a "remember me" concept, but you can implement custom logic if needed
    return this.rememberUser;
  }
}
