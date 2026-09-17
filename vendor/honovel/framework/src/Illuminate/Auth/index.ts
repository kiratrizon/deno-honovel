import jwt from "jsonwebtoken";
import { JWTSubject } from "../Contracts/Auth/index.ts";
import { Carbon } from "helpers";
import { v4 as uuidv4 } from "uuid";
import Blacklist from "./Blacklist.ts";

export abstract class BaseJWT {
  abstract fromUser(user: JWTSubject, remember?: boolean): string;
  abstract verify(token: string): Promise<Record<string, unknown> | null>;
}

/**
 * Claims that are regenerated on every mint and must therefore not be carried
 * over from a previous token when refreshing.
 */
const REGENERATED_CLAIMS = new Set([
  "iat",
  "nbf",
  "exp",
  "jti",
  "iss",
  "aud",
  "sub",
  "remember",
  "prv_iat",
]);

export class JWTAuth {
  // Static method to generate token from user
  static fromUser(user: JWTSubject, remember?: boolean): string {
    return this.mint({
      subject: user.getJWTIdentifier(),
      claims: user.getJWTCustomClaims(),
      remember: remember || false,
    });
  }

  /**
   * Verify a token and make sure it has not been blacklisted.
   * Returns the payload, or null if the token is invalid, expired or revoked.
   */
  static async verify(token: string): Promise<Record<string, unknown> | null> {
    const payload = this.payload(token);
    if (!payload) return null;

    if (await Blacklist.has(payload)) return null;

    return payload;
  }

  /**
   * Verify a token's signature and return its payload without consulting the
   * blacklist. `ignoreExpiration` lets an expired-but-genuine token be read,
   * which refresh and invalidate both need.
   */
  static payload(
    token: string,
    { ignoreExpiration = false }: { ignoreExpiration?: boolean } = {},
  ): Record<string, unknown> | null {
    const { jwtConfig, secret } = this.conf("verify");
    if (!token) {
      throw new Error("Token is required for verification.");
    }

    try {
      return jwt.verify(token, secret, {
        algorithms: [jwtConfig.algo || "HS256"],
        ignoreExpiration,
      }) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Revoke a token immediately. Once invalidated it will no longer pass
   * `verify()`, even though it has not expired.
   */
  static async invalidate(token: string): Promise<void> {
    if (!Blacklist.enabled()) {
      console.warn(
        "JWTAuth.invalidate() was called but config('jwt').blacklist_enabled is false. " +
          "The token stays valid until it expires on its own.",
      );
      return;
    }

    const payload = this.payload(token, { ignoreExpiration: true });
    if (!payload) {
      throw new Error("Cannot invalidate a token that fails verification.");
    }

    await Blacklist.add(payload);
  }

  // referesh tokens
  static async refresh(token: string): Promise<string> {
    const { jwtConfig } = this.conf("refresh");

    const payload = this.payload(token, { ignoreExpiration: true });
    if (!payload) {
      throw new Error("Cannot refresh a token that fails verification.");
    }

    if (await Blacklist.has(payload)) {
      throw new Error("Cannot refresh a token that has been revoked.");
    }

    const originalIat = isNumeric(payload.prv_iat)
      ? Number(payload.prv_iat)
      : isNumeric(payload.iat)
        ? Number(payload.iat)
        : null;

    const refreshWindow = Number(jwtConfig.refresh_ttl || 0) * 60;

    if (originalIat !== null && refreshWindow > 0) {
      if (Carbon.now().to("seconds") > originalIat + refreshWindow) {
        throw new Error(
          "Token is past the refresh window set by config('jwt').refresh_ttl and cannot be refreshed.",
        );
      }
    }

    await Blacklist.addToGracePeriod(payload);

    const claims: Record<string, unknown> = {};
    for (const [claim, value] of Object.entries(payload)) {
      if (!REGENERATED_CLAIMS.has(claim)) {
        claims[claim] = value;
      }
    }

    return this.mint({
      subject: payload.sub,
      claims,
      remember: !!payload.remember,
      prvIat: originalIat,
    });
  }

  static decode(token: string): Record<string, unknown> | null {
    this.conf("decode");
    if (!token) {
      throw new Error("Token is required for decoding.");
    }

    try {
      return jwt.decode(token, { complete: true }) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private static mint({
    subject,
    claims,
    remember,
    prvIat = null,
  }: {
    subject: unknown;
    claims: Record<string, unknown>;
    remember: boolean;
    prvIat?: number | null;
  }): string {
    const { jwtConfig, secret } = this.conf("generate");

    const payload: Record<string, unknown> = {};
    const required_claims = jwtConfig.required_claims;
    const expires = (remember ? 30 * 24 * 60 : jwtConfig.ttl) * 60; // Convert minutes to seconds
    if (!expires) {
      throw new Error(
        "config('jwt.ttl') is required to generate JWT tokens. Check JWT_TTL environment variable.",
      );
    }
    const carbonNow = Carbon.now();
    for (const claim of required_claims) {
      switch (claim) {
        case "iss": {
          payload.iss = jwtConfig.issuer;
          break;
        }
        case "iat": {
          payload.iat = carbonNow.to("seconds");
          break;
        }
        case "nbf": {
          payload.nbf = carbonNow.to("seconds");
          break;
        }
        case "sub": {
          payload.sub = subject;
          break;
        }
        case "jti": {
          payload.jti = uuidv4();
          break;
        }
      }
    }
    payload.aud = jwtConfig.audience;
    Object.assign(payload, claims);
    payload.remember = remember;
    if (isset(prvIat)) {
      payload.prv_iat = prvIat;
    }

    if (Blacklist.enabled() && !isset(payload.jti)) {
      throw new Error(
        "config('jwt').blacklist_enabled is true but \"jti\" is missing from config('jwt').required_claims. " +
          "The blacklist needs a `jti` claim to identify tokens.",
      );
    }

    return jwt.sign(payload, secret, {
      algorithm: jwtConfig.algo || "HS256",
      expiresIn: expires,
    });
  }

  private static conf(action: string) {
    const jwtConfig = config("jwt");
    const secret = jwtConfig.secret;
    if (!secret) {
      throw new Error(
        `config('jwt.secret') is required to ${action} JWT tokens. Check JWT_SECRET environment variable.`,
      );
    }
    return { jwtConfig, secret };
  }
}

export { Blacklist };
