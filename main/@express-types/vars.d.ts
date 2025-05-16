/// <reference path="./index.d.ts" />

export {};

declare global {
  /**
   * This is a global variable that indicates whether the application is in production mode or not.
   * @type {boolean}
   * @default false
   */
  var IS_PRODUCTION: boolean;
  /**
   * This is a global variable that holds the version of the framework being used.
   */
  var FRAMEWORK_VERSION: string;
}
