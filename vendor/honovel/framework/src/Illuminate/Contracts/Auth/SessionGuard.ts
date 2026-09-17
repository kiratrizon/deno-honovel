import { Hash } from "../../Support/Facades/index.ts";
import BaseGuard, { AuthUser } from "./BaseGuard.ts";
import { Str } from "../../Support/index.ts";

type AuthenticatableAttrSession = {
  password: string;
  remember_token?: string | null;
};

export default class SessionGuard extends BaseGuard {
  #cookie;
  constructor(c: MyContext, guardName: string) {
    super(c, guardName);
    this.#cookie = this.c.get("myHono").Cookie;
  }
  async check(): Promise<boolean> {
    // Implement session check logic

    if (this.defaultChecker()) return true;
    const sessguardKey = `auth_${this.guardName}_user`;

    const checkUser = this.request.session.get(sessguardKey) as Record<
      string,
      any
    > | null;
    if (checkUser) {
      // If user is already set in context, return true
      this.setAuth(
        // @ts-ignore //
        new this.model(checkUser as AuthenticatableAttrSession) as AuthUser,
      );
      return true;
    }

    // Check if remember token exists in cookies
    const rememberToken = this.request.cookie(sessguardKey);
    // @ts-ignore //
    const instanceModel = new this.model() as AuthUser;
    if (rememberToken) {
      const user = (await this.model
        .where(instanceModel.getRememberTokenName(), rememberToken)
        .first()) as AuthUser | null;
      if (user) {
        this.rememberUser = true;
        this.setAuth(user);
        return true;
      }
    }
    return false;
  }

  async attempt(
    credentials: Record<string, any>,
    remember: boolean = false,
  ): Promise<boolean> {
    const provider = SessionGuard.authConf?.guards?.[this.guardName]?.provider;
    const selectedProvider = SessionGuard.authConf?.providers?.[provider];
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

  user(): AuthUser | null {
    const sessguardKey = `auth_${this.guardName}_user`;
    return this.request.session.get(sessguardKey) as AuthUser | null;
  }

  async login(user: AuthUser, remember: boolean = false): Promise<boolean> {
    this.beforeLogin(user); // trapper
    const rawAttributes = user.getRawAttributes();
    const sessguardKey = `auth_${this.guardName}_user`;
    this.request.session.put(
      // @ts-ignore //
      sessguardKey,
      rawAttributes as AuthenticatableAttrSession,
    );
    this.setAuth(user);
    if (remember) {
      // If "remember me" is checked, set the remember token
      const rememberToken = Str.random(60);
      await user.setRememberToken(rememberToken);

      this.#cookie.queue(sessguardKey, rememberToken, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });
      this.rememberUser = true;
    }
    return true; // Login successful
  }

  async logout(): Promise<void> {
    const sessguardKey = `auth_${this.guardName}_user`;
    this.request.session.forget(sessguardKey);
    this.#cookie.queue(sessguardKey, "", {
      maxAge: -1, // Delete the cookie
      path: "/",
    });
    this.reset();
  }

  viaRemember(): boolean {
    return this.rememberUser;
  }
}
