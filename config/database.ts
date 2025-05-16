const constant = {
  database: env("DATABASE", "sqlite"),
  mysql: {
    host: env("MYSQL_HOST", "localhost"),
    port: env("MYSQL_PORT", 3306),
    user: env("MYSQL_USER", "root"),
    password: env("MYSQL_PASSWORD", ""),
    database: env("MYSQL_DB", "express"),
    charset: "utf8mb4",
    connectionLimit: env("USING_FREE_TIER", "true") === "true" ? 4 : null,
    waitForConnections: true,
    dateStrings: true,
  },
  postgresql: {
    host: env("POSTGRES_HOST", "localhost"),
    port: env("POSTGRES_PORT", 5432),
    user: env("POSTGRES_USER", "postgres"),
    password: env("POSTGRES_PASSWORD", ""),
    database: env("POSTGRES_DB", "express"),
    charset: "utf8mb4",
  },
  timezone: env("DATABASE_TIMEZONE", "+08:00"),
};

export default constant;
