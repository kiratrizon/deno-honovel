import { Hash } from "../../Support/Facades/index.ts";
import { Carbon } from "helpers";
import BaseGuard from "./BaseGuard.ts";
import Authenticatable from "./Authenticatable.ts";

type AuthenticatableAttrSession = {
  password: string;
  remember_token?: string | null;
};

export default class SessionGuard extends BaseGuard {
  async check(): Promise<boolean> {
    // Implement session check logic

    const key = "auth_user";
    if (this.authUser) {
      // If user is already set in context, return true
      this.c.set(key, this.authUser);
      return true;
    }
    const { request } = this.c.get("myHono");
    if (request.user()) {
      this.authUser = request.user() as Authenticatable;
      this.c.set(key, this.authUser);
    }
    const sessguardKey = `auth_${this.guardName}_user`;

    // @ts-ignore //
    const checkUser = request.session.get(sessguardKey) as Record<
      string,
      any
    > | null;
    if (checkUser) {
      // If user is already set in context, return true
      // @ts-ignore //
      this.authUser = new this.model(
        checkUser as AuthenticatableAttrSession,
      ) as Authenticatable;
      this.c.set(key, this.authUser);
      return true;
    }

    // Check if remember token exists in cookies
    const rememberToken = request.cookie(sessguardKey);
    if (rememberToken) {
      const user = (await this.model
        .where("remember_token", rememberToken)
        .first()) as Authenticatable | null;
      if (user) {
        this.rememberUser = true;
        this.authUser = user;
        this.c.set(key, this.authUser);
        return true;
      }
    }
    return false; // Placeholder
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
      .first()) as Authenticatable | null;
    if (!user) {
      return false;
    }
    if (!Hash.check(credentials[passwordKey], user.getAuthPassword())) {
      return false;
    }
    return await this.login(user, remember);
  }

  user(): Authenticatable | null {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    // @ts-ignore //
    return request.session.get(sessguardKey) as Authenticatable | null;
  }

  async login(
    user: Authenticatable,
    remember: boolean = false,
  ): Promise<boolean> {
    this.authUser = user;
    const rawAttributes = user.getRawAttributes();
    const { request } = this.c.get("myHono");
    const key = "auth_user";
    const sessguardKey = `auth_${this.guardName}_user`;
    request.session.put(
      // @ts-ignore //
      sessguardKey,
      rawAttributes as AuthenticatableAttrSession,
    );
    this.c.set(key, user);
    const Cookie = this.c.get("myHono").Cookie;
    if (remember) {
      // If "remember me" is checked, set the remember token
      const generatedToken = `${
        this.guardName
      }_${user.getAuthIdentifier()}_${strToTime(Carbon.now().addDays(30))}`;
      const rememberToken = Hash.make(generatedToken);
      await user.setRememberToken(rememberToken);
      await user.save();

      Cookie.queue(sessguardKey, rememberToken, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      this.rememberUser = true;
    }
    return true; // Login successful
  }

  logout(): void {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    const Cookie = this.c.get("myHono").Cookie;
    // @ts-ignore //
    request.session.forget(sessguardKey);
    Cookie.queue(sessguardKey, "", {
      maxAge: -1, // Delete the cookie
    });
    // @ts-ignore //
    this.c.set("auth_user", null);
  }

  viaRemember(): boolean {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    // @ts-ignore //
    const user = request.session.get(sessguardKey) as Authenticatable | null;
    return user ? !!user.remember_token : false;
  }
}
