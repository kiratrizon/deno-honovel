import { DatabaseConfig } from "./@types/database.d.ts";

const constant: DatabaseConfig = {
  default: env("DB_CONNECTION", "mysql"),

  connections: {
    mysql: {
      host: env("DB_HOST", "127.0.0.1"),
      port: Number(env("DB_PORT", 3306)),
      user: env("DB_USERNAME", "root"),
      password: env("DB_PASSWORD", ""),
      database: env("DB_DATABASE", "honovel"),
      charset: "utf8mb4",
      options: {
        maxConnection: 4
      }
    },
    pgsql: {
      host: env("DB_HOST", "127.0.0.1"),
      port: Number(env("DB_PORT", 5432)),
      user: env("DB_USERNAME", "postgres"),
      password: env("DB_PASSWORD", ""),
      database: env("DB_DATABASE", "honovel"),
    },
    sqlite: {
      database: databasePath("database.sqlite"),
    },
  },
};

export default constant;
