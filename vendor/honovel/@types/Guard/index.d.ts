import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";

export interface BaseGuard {
  check(): Promise<boolean>;
  guest(): Promise<boolean>;
  id(): Promise<number | string | null>;
  user<T extends Authenticatable = Authenticatable>(): Promise<T | null>;
}

export interface SessionGuard extends BaseGuard {
  login<T extends Authenticatable = Authenticatable>(
    user: T,
    remember?: boolean
  ): Promise<void>;

  attempt(
    credentials: Record<string, any>,
    remember?: boolean
  ): Promise<boolean>;

  logout(): Promise<void>;

  validate(credentials: Record<string, any>): Promise<boolean>;

  setUser<T extends Authenticatable = Authenticatable>(user: T): void;
}

export interface TokenGuard extends BaseGuard {
  // TokenGuard has no login/logout; it just authenticates via token
}
