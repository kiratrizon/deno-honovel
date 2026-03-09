import { Hash } from "../../Support/Facades/index.ts";
import BaseGuard from "./BaseGuard.ts";
import Authenticatable from "./Authenticatable.ts";

export default class TokenGuard extends BaseGuard {
  async check(): Promise<boolean> {
    const key = `auth_user`;
    if (this.authUser) {
      this.c.set(key, this.authUser);
      return true;
    }
    const checkUser = this.c.get(key);
    if (checkUser) {
      this.c.set(key, checkUser);
      return true;
    }
    // Implement token check logic
    const { request } = this.c.get("myHono");

    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!isset(token) || empty(token)) {
      return false;
    }

    const user = (await this.model
      .where("api_token", token)
      .first()) as Authenticatable;
    if (!user) {
      return false;
    }
    this.c.set(key, user);
    return true; // Placeholder
  }

  async attempt(credentials: Record<string, any>): Promise<string | false> {
    const provider = TokenGuard.authConf?.guards?.[this.guardName]?.provider;
    const selectedProvider = TokenGuard.authConf?.providers?.[provider];
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
    return await this.login(user);
  }

  async login(user: Authenticatable): Promise<string | false> {
    this.authUser = user;
    const rawAttributes = user.getRawAttributes();

    const key = `auth_user`;
    if (!keyExist(rawAttributes, "api_token")) {
      throw new Error(
        // @ts-ignore //
        `Table ${new this.model().getTableName()} have no api_token column.`,
      );
    }
    this.c.set(key, user);
    // @ts-ignore //
    return rawAttributes.api_token as string;
  }

  user() {
    const key = `auth_${this.guardName}_user`;
    // @ts-ignore //
    return this.c.get(key) as Authenticatable | null;
  }

  logout() {
    const key = "auth_user";
    this.c.set(key, null);
    // Optionally, you can also delete the token from the database
  }

  viaRemember(): boolean {
    return this.rememberUser;
  }
}
