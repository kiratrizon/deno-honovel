// env.d.ts

export interface EnvConfig {
    DENO_REGION?: string;
    DENO_DEPLOYMENT_ID?: string;
    DENO_ENV?: "development" | "production";
    APP_NAME: string;
    APP_ENV: 'local' | 'production' | 'staging' | 'testing';
    APP_KEY: string;
    APP_DEBUG: boolean;
    APP_URL: string;

    LOG_CHANNEL: string;
    LOG_LEVEL: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

    DB_CONNECTION: 'mysql' | 'pgsql' | 'sqlite' | 'sqlsrv';
    DB_HOST: string;
    DB_PORT: number;
    DB_DATABASE: string;
    DB_USERNAME: string;
    DB_PASSWORD: string;

    BROADCAST_DRIVER: string;
    CACHE_DRIVER: string;
    QUEUE_CONNECTION: string;
    SESSION_DRIVER: string;
    SESSION_LIFETIME: number;

    MEMCACHED_HOST: string;

    REDIS_HOST: string;
    REDIS_PASSWORD: string | null;
    REDIS_PORT: number;

    MAIL_MAILER: string;
    MAIL_HOST: string;
    MAIL_PORT: number;
    MAIL_USERNAME: string | null;
    MAIL_PASSWORD: string | null;
    MAIL_ENCRYPTION: 'tls' | 'ssl' | null;
    MAIL_FROM_ADDRESS: string;
    MAIL_FROM_NAME: string;

    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_DEFAULT_REGION: string;
    AWS_BUCKET: string;

    PUSHER_APP_ID: string;
    PUSHER_APP_KEY: string;
    PUSHER_APP_SECRET: string;
    PUSHER_HOST: string;
    PUSHER_PORT: number;
    PUSHER_SCHEME: 'http' | 'https';
    PUSHER_APP_CLUSTER: string;

    VITE_APP_NAME: string;
}
