import { DatabaseConfig } from "./@types/index.d.ts";

const constant: DatabaseConfig = {
  default: env("DB_CONNECTION", "mysql"),

  connections: {
    mysql: {
      driver: "mysql",
      // host: env("DB_HOST", "127.0.0.1"),
      write: {
        host: env("DB_HOST", "127.0.0.1"),
      },
      read: {
        host: env("DB_HOST", "127.0.0.1"),
      },
      port: env("DB_PORT", 3306),
      user: env("DB_USERNAME", "root"),
      password: env("DB_PASSWORD", ""),
      database: env("DB_DATABASE", "honovel"),
      charset: "utf8mb4",
      options: {
        maxConnection: 4,
      },
    },
    pgsql: {
      driver: "pgsql",
      host: env("DB_HOST", "127.0.0.1"),
      port: Number(env("DB_PORT", 5432)),
      user: env("DB_USERNAME", "postgres"),
      password: env("DB_PASSWORD", ""),
      database: env("DB_DATABASE", "honovel"),
    },
    sqlite: {
      driver: "sqlite",
      database: databasePath("database.sqlite"),
    },
    mongodb: {
      driver: "mongodb",
      uri: env("MONGODB_URI", "mongodb://localhost:27017"),
      database: env("MONGODB_DATABASE", "honovel"),
      options: {
        database: env("DB_AUTH_DATABASE", "admin"),
      },
    },
  },

  redis: {
    client: "upstash",
    default: "cache",
    connections: {
      cache: {
        upstashUrl: env("UPSTASH_REDIS_REST_URL", ""),
        upstashToken: env("UPSTASH_REDIS_REST_TOKEN", ""),
      },
    },
  },
};

export default constant;
