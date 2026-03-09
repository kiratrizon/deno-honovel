export interface JWTSubject {
  /**
   * Returns the unique identifier for the JWT subject.
   */
  getJWTIdentifier(): string | number;

  /**
   * Returns a key-value pair of custom claims to be added to the JWT.
   */
  getJWTCustomClaims(): Record<string, unknown>;
}
