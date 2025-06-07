const constant = {
  timezone: env("TIMEZONE", "Asia/Tokyo"),
  datetime_format: "Y-m-d H:i:s",
  date_format: "Y-m-d",
  time_format: "H:i:s",
  redis: {
    url: env("REDIS_URL", ""),
  },
  env: env("APP_ENV", "production")
};
export default constant;
