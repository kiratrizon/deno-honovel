import { JWTConfig } from "configs/@types/index.d.ts";
const constant: JWTConfig = {
  /*
    |--------------------------------------------------------------------------
    | JWT Secret
    |--------------------------------------------------------------------------
    |
    | This will be used to sign your tokens.
    | Generate it using `php artisan jwt:secret`
    |
    */
  secret: env("JWT_SECRET_KEY", ""), // Ensure to set JWT_SECRET in your environment variables
  /*
  |--------------------------------------------------------------------------
  | JWT time to live
  |--------------------------------------------------------------------------
  |
  | Specify the length of time (in minutes) that the token will be valid for.
  | Defaults to 60 minutes.
  |
  */

  ttl: env("JWT_TTL", 60), // default 60 minutes

  /*
    |--------------------------------------------------------------------------
    | JWT Refresh Time to Live
    |--------------------------------------------------------------------------
    |
    | Specify the length of time (in minutes) that the refresh token will be valid for.
    | Defaults to 20160 minutes (2 weeks).
    |
    */
  refresh_ttl: env("JWT_REFRESH_TTL", 20160), // default 2 weeks

  /*
    |--------------------------------------------------------------------------
    | JWT Algorithms
    |--------------------------------------------------------------------------
    |
    | Specify the algorithm used to sign the tokens.
    | Defaults to HS256.
    |
    */
  algo: env("JWT_ALGO", "HS256"),

  /*
    |--------------------------------------------------------------------------
    | JWT Required Claims
    |--------------------------------------------------------------------------
    |
    | Specify the claims that must be present in the token.
    | Defaults to ['iss', 'iat', 'exp', 'nbf', 'sub', 'jti'].
    |
    */
  required_claims: ["iss", "iat", "exp", "nbf", "sub", "jti"],

  /*
    |--------------------------------------------------------------------------
    | JWT Blacklist
    |--------------------------------------------------------------------------
    |
    | Enable or disable the JWT blacklist feature.
    | If enabled, tokens can be blacklisted and will not be valid after being blacklisted.
    |
    */
  blacklist_enabled: env("JWT_BLACKLIST_ENABLED", false),

  /*
    |--------------------------------------------------------------------------
    | JWT Blacklist Grace Period
    |--------------------------------------------------------------------------
    |
    | Specify the grace period (in seconds) for blacklisted tokens.
    | Defaults to 60 seconds.
    |
    */
  blacklist_grace_period: env("JWT_BLACKLIST_GRACE_PERIOD", 60), // default 60 seconds

  /*
    |--------------------------------------------------------------------------
    | JWT Issuer and Audience
    |--------------------------------------------------------------------------
    |
    | Specify the issuer and audience for the JWT.
    | These can be used to validate the token's origin and intended audience.
    |
    */
  issuer: env("JWT_ISSUER", ""), // Optional, can be set to your application name or URL
  audience: env("JWT_AUDIENCE", ["*"]), // Optional, can be set to your application's audience most likely from your allowed ORIGINS

  providers: {
    jwt: "Tymon.JWTAuth.Providers.JWT.Namshi", // Replace with your JS equivalents if any
    auth: "Tymon.JWTAuth.Providers.Auth.Illuminate", // or your own provider classes/modules
    storage: "Tymon.JWTAuth.Providers.Storage.Illuminate",
  },
};

export default constant;
