import { AuthConfig } from "configs/@types/index.d.ts";
import Authenticatable from "./Authenticatable.ts";
import { JWTSubject } from "./JWTSubject.ts";

export default abstract class BaseGuard {
  protected model: typeof Authenticatable;
  constructor(
    protected c: MyContext,
    protected guardName: string,
  ) {
    BaseGuard.init();
    this.model = BaseGuard.getModelFromGuard(guardName);
  }
  protected authUser: Authenticatable | null = null;

  protected rememberUser: boolean = false; // if "remember me" is checked

  protected static authConf: AuthConfig;
  public static init(): void {
    if (this.authConf) return; // Already initialized
    this.authConf = config("auth");
  }

  abstract attempt(
    credentials: Record<string, any>,
    remember?: boolean,
  ): Promise<boolean | string>;

  private static getModelFromGuard(guardName: string): typeof Authenticatable {
    const providerName = this.authConf?.guards?.[guardName]?.provider;
    if (!providerName) {
      throw new Error(`Guard ${guardName} does not have a provider defined`);
    }
    const provider = this.authConf?.providers?.[providerName];
    if (!provider) {
      throw new Error(
        `Provider ${providerName} not found for guard ${guardName}`,
      );
    }
    const model = provider.model;
    if (!model) {
      throw new Error(`Model not defined for provider ${providerName}`);
    }
    if (!(model.prototype instanceof Authenticatable)) {
      throw new Error(`Model ${model.name} does not extend Authenticatable`);
    }
    // @ts-ignore - We assume the model is compatible with the Authenticatable //
    return model as typeof Authenticatable;
  }

  abstract login(
    user: Authenticatable | JWTSubject,
    remember?: boolean,
  ): Promise<unknown>;

  /**
   * Retrieves the currently authenticated user.
   * If no user is authenticated, returns null.
   */
  abstract user(): Authenticatable | null;

  /**
   * Checks if the user is authenticated.
   * Returns true if the user is authenticated, otherwise false.
   */
  abstract check(): Promise<boolean>;

  /**
   * Logs out the currently authenticated user.
   */
  abstract logout(): void;

  /**
   * Returns the authenticated user's primary key.
   */
  public id(): string | number | null {
    const user = this.user();
    return user ? user.getAuthIdentifier() : null;
  }

  /**
   * Indicates if the user was authenticated via "remember me".
   */
  abstract viaRemember(): boolean;

  /**
   * Returns the name of the guard.
   * For debugging purposes.
   */
  getGuardName(): string {
    return this.guardName;
  }
}
