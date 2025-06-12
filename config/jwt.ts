const constant = {
  secret_key: env("JWT_SECRET_KEY"),
  oauth_db: "oauth_access_token",
  expiration: {
    default: 60 * 24 * 365, // minutes = 1 year
    refresh: 60, // minutes = 1 hour
  },
  algorithm: "HS256",
};

export default constant;
