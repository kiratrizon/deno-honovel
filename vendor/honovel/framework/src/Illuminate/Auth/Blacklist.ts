import { Carbon } from "helpers";
import { Cache } from "../Support/Facades/index.ts";
import AbstractStore from "../Cache/Stores/AbstractStore.ts";

// add validation life
interface BlacklistEntry {
  valid_until: number;
}

export type JWTPayload = Record<string, unknown>;

export class Blacklist {
  // for trapping
  static enabled(): boolean {
    return !!config("jwt").blacklist_enabled;
  }

  // grace period
  static gracePeriod(): number {
    const grace = config("jwt").blacklist_grace_period;
    return isNumeric(grace) ? Number(grace) : 0;
  }

  // for logout
  static async add(payload: JWTPayload): Promise<void> {
    if (!this.enabled()) return;
    await this.write(payload, this.now());
  }

  // record the payload in cache
  static async addToGracePeriod(payload: JWTPayload): Promise<void> {
    if (!this.enabled()) return;
    await this.write(payload, this.now() + this.gracePeriod());
  }

  // token checker in cache
  static async has(payload: JWTPayload): Promise<boolean> {
    if (!this.enabled()) return false;

    const jti = this.identifier(payload);
    if (!jti) return false;

    const entry = (await this.store().get(
      this.key(jti),
    )) as BlacklistEntry | null;

    if (!isset(entry) || !isNumeric(entry?.valid_until)) return false;

    return this.now() >= Number(entry.valid_until);
  }

  // revoker of token
  static async remove(payload: JWTPayload): Promise<void> {
    const jti = this.identifier(payload);
    if (!jti) return;
    await this.store().forget(this.key(jti));
  }

  // write in cache.. payload + seconds
  private static async write(
    payload: JWTPayload,
    validUntil: number,
  ): Promise<void> {
    // trap the jti if don't exist
    const jti = this.identifier(payload);
    if (!jti) {
      throw new Error(
        "Cannot blacklist a token without a `jti` claim. Add \"jti\" to config('jwt').required_claims, or disable the blacklist.",
      );
    }

    await this.store().put(
      this.key(jti),
      { valid_until: validUntil } as BlacklistEntry,
      this.ttl(payload),
    );
  }

  // time to live
  private static ttl(payload: JWTPayload): number {
    const exp = isNumeric(payload.exp) ? Number(payload.exp) : null;

    const remaining =
      exp !== null
        ? exp - this.now()
        : Number(config("jwt").refresh_ttl || 0) * 60;

    return Math.max(Math.floor(remaining) + this.gracePeriod(), 1);
  }

  private static key(jti: string): string {
    return `jwt:blacklist:${jti}`;
  }

  private static identifier(payload: JWTPayload): string | null {
    const jti = payload?.jti;
    return isString(jti) && !empty(jti) ? (jti as string) : null;
  }

  private static now(): number {
    return Carbon.now().to("seconds");
  }

  private static warned = false;

  // cache store
  private static store(): AbstractStore {
    const configured = config("jwt").blacklist_store;
    const name =
      isString(configured) && !empty(configured)
        ? configured
        : config("cache")?.default;

    if (!isString(name) || empty(name)) {
      throw new Error(
        "The JWT blacklist needs a cache store. Set config('jwt').blacklist_store, or a default in config('cache').default.",
      );
    }

    this.warnIfVolatile(name);

    return Cache.store(name);
  }

  // local development
  private static warnIfVolatile(name: string): void {
    if (this.warned) return;
    this.warned = true;

    const driver = config("cache")?.stores?.[name]?.driver;

    if (driver === "memory" || driver === "object") {
      console.warn(
        `The JWT blacklist is using the "${name}" cache store ("${driver}" driver), which is per-process and lost on restart. ` +
          `Blacklisted tokens will become valid again after a redeploy and are not shared between workers. ` +
          `Set JWT_BLACKLIST_STORE to a persistent store (redis, database, file) in production.`,
      );
    }
  }
}

export default Blacklist;
