import { Hash } from "../../Support/Facades/index.ts";
import BaseGuard, { AuthUser } from "./BaseGuard.ts";

export default class TokenGuard extends BaseGuard {
  async check(): Promise<boolean> {
    if (this.defaultChecker()) return true;

    // token logic here Bearer
    const token = this.request.headers
      .get("Authorization")
      ?.replace("Bearer ", "");
    if (!isset(token) || empty(token)) {
      return false;
    }

    const user = (await this.model
      .where("api_token", token)
      .first()) as AuthUser;
    if (user) {
      this.setAuth(user);
      return true;
    }
    return false;
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
    return await this.login(user);
  }

  async login(user: AuthUser): Promise<string | false> {
    this.beforeLogin(user);
    const rawAttributes = user.getRawAttributes();

    if (!keyExist(rawAttributes, "api_token")) {
      throw new Error(
        // @ts-ignore //
        `Table ${new this.model().getTableName()} have no api_token column.`,
      );
    }
    this.setAuth(user);
    // @ts-ignore //
    return rawAttributes.api_token as string;
  }

  user() {
    return this.authUser;
  }

  async logout(): Promise<void> {
    this.reset();
    // Optionally, you can also delete the token from the database
  }

  viaRemember(): boolean {
    return this.rememberUser;
  }
}
