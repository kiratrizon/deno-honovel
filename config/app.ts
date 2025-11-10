// config/app.ts

import RouteServiceProvider from "App/Providers/RouteServiceProvider.ts";
import { AppConfig } from "configs/@types/index.d.ts";

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
  url: env("APP_URL"),

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

  providers: [RouteServiceProvider],
};

export default constant;
