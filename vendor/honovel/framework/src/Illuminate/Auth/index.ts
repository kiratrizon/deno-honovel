import jwt from "npm:jsonwebtoken";
import { JWTSubject } from "../Contracts/Auth/index.ts";
import { Carbon } from "helpers";
import { v4 as uuidv4 } from "uuid";

export abstract class BaseJWT {
  abstract fromUser(user: JWTSubject, remember?: boolean): string;
  abstract verify(token: string): Record<string, unknown> | null;
}

export class JWTAuth {
  // Static method to generate token from user
  static fromUser(user: JWTSubject, remember?: boolean): string {
    const jwtConfig = config("jwt");
    const secret = jwtConfig.secret;
    if (!secret) {
      throw new Error(
        "config('jwt.secret') is required to generate JWT tokens. Check JWT_SECRET environment variable."
      );
    }
    const payload: Record<string, unknown> = {};
    const required_claims = jwtConfig.required_claims;
    const expires = (remember ? 30 * 24 * 60 : jwtConfig.ttl) * 60; // Convert minutes to seconds
    if (!expires) {
      throw new Error(
        "config('jwt.ttl') is required to generate JWT tokens. Check JWT_TTL environment variable."
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
          payload.sub = user.getJWTIdentifier();
          break;
        }
        case "jti": {
          payload.jti = uuidv4();
          break;
        }
      }
    }
    payload.aud = jwtConfig.audience;
    Object.assign(payload, user.getJWTCustomClaims());
    payload.remember = remember || false;

    return jwt.sign(payload, secret, {
      algorithm: jwtConfig.algo || "HS256",
      expiresIn: expires,
    });
  }

  // Optionally add verify, refresh, invalidate methods here
  static verify(token: string): Record<string, unknown> | null {
    const jwtConfig = config("jwt");
    const secret = jwtConfig.secret;
    if (!secret) {
      throw new Error(
        "config('jwt.secret') is required to verify JWT tokens. Check JWT_SECRET environment variable."
      );
    }
    if (!token) {
      throw new Error("Token is required for verification.");
    }

    try {
      return jwt.verify(token, secret, {
        algorithm: jwtConfig.algo || "HS256",
      });
    } catch {
      return null;
    }
  }

  static decode(token: string): Record<string, unknown> | null {
    const jwtConfig = config("jwt");
    const secret = jwtConfig.secret;
    if (!secret) {
      throw new Error(
        "config('jwt.secret') is required to decode JWT tokens. Check JWT_SECRET environment variable."
      );
    }
    if (!token) {
      throw new Error("Token is required for decoding.");
    }

    try {
      return jwt.decode(token, secret, { complete: true }) as Record<
        string,
        unknown
      >;
    } catch {
      return null;
    }
  }
}

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIiLCJpYXQiOjE3NTQ2NDIwNjUzNzcsImV4cCI6MTc1NDY0NTY2NTAwMCwic3ViIjoxLCJqdGkiOiIzMjRkZTAzMy1hOGFiLTQ5MjUtOTlmYi02ZDE1ZTdiNzFkNzEiLCJhdWQiOlsiKiJdLCJlbWFpbCI6InRnZW5lc2lzdHJveUBnbWFpbC5jb20iLCJuYW1lIjoiRWlyYXplbiIsInJlbWVtYmVyIjpmYWxzZX0.2OPXRqtsEYvFL78CX92BSSthHhx3TJu2J9npQJPo1BI
