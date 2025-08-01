// config/app.ts

import AppServiceProvider from "App/Providers/AppServiceProvider.ts";
import { AppConfig } from "./@types/index.d.ts";
import CacheProvider from "App/Providers/CacheProvider.ts";

const constant: AppConfig = {
  /*
  |--------------------------------------------------------------------------
  | Application Name
  |--------------------------------------------------------------------------
  */
  name: env("APP_NAME", "Honovel"),

  /*
  |--------------------------------------------------------------------------
  | Application Environment
  |--------------------------------------------------------------------------
  */
  env: env("APP_ENV", "production"),

  /*
  |--------------------------------------------------------------------------
  | Application Debug Mode
  |--------------------------------------------------------------------------
  */
  debug: env("APP_DEBUG", false),

  /*
  |--------------------------------------------------------------------------
  | Application URL
  |--------------------------------------------------------------------------
  */
  url: env("APP_URL", "http://localhost"),

  /*
  |--------------------------------------------------------------------------
  | Application Timezone
  |--------------------------------------------------------------------------
  */
  timezone: "Asia/Tokyo",

  /*
  |--------------------------------------------------------------------------
  | Application Locale Configuration
  |--------------------------------------------------------------------------
  */
  locale: env("APP_LOCALE", "en"),
  fallback_locale: env("APP_FALLBACK_LOCALE", "en"),
  faker_locale: env("APP_FAKER_LOCALE", "en_US"),

  /*
  |--------------------------------------------------------------------------
  | Encryption Key
  |--------------------------------------------------------------------------
  */
  cipher: "AES-256-CBC",
  key: env("APP_KEY"),

  previous_keys: env("APP_PREVIOUS_KEYS", "")
    .split(",")
    .filter((key) => {
      return key.trim() !== "";
    }),

  /*
  |--------------------------------------------------------------------------
  | Maintenance Mode Driver
  |--------------------------------------------------------------------------
  */
  maintenance: {
    driver: env("MAINTENANCE_DRIVER", "database"),
    store: env("MAINTENANCE_STORE", null),
  },
};

export default constant;
