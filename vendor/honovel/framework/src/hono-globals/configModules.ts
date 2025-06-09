
    const myModules:Record<string, unknown> = {};
  


    try {
      const jwt = (await import("../../../../../config/jwt.ts")).default;
      myModules["jwt"] = jwt;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/jwt
Export it with default`);
    }

    try {
      const app = (await import("../../../../../config/app.ts")).default;
      myModules["app"] = app;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/app
Export it with default`);
    }

    try {
      const debug = (await import("../../../../../config/debug.ts")).default;
      myModules["debug"] = debug;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/debug
Export it with default`);
    }

    try {
      const redis = (await import("../../../../../config/redis.ts")).default;
      myModules["redis"] = redis;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/redis
Export it with default`);
    }

    try {
      const view = (await import("../../../../../config/view.ts")).default;
      myModules["view"] = view;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/view
Export it with default`);
    }

    try {
      const factory = (await import("../../../../../config/factory.ts")).default;
      myModules["factory"] = factory;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/factory
Export it with default`);
    }

    try {
      const test = (await import("../../../../../config/test.ts")).default;
      myModules["test"] = test;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/test
Export it with default`);
    }

    try {
      const query_trace = (await import("../../../../../config/query_trace.ts")).default;
      myModules["query_trace"] = query_trace;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/query_trace
Export it with default`);
    }

    try {
      const session = (await import("../../../../../config/session.ts")).default;
      myModules["session"] = session;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/session
Export it with default`);
    }

    try {
      const database = (await import("../../../../../config/database.ts")).default;
      myModules["database"] = database;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/database
Export it with default`);
    }

    try {
      const cors = (await import("../../../../../config/cors.ts")).default;
      myModules["cors"] = cors;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/cors
Export it with default`);
    }

    try {
      const irregular_words = (await import("../../../../../config/irregular_words.ts")).default;
      myModules["irregular_words"] = irregular_words;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/irregular_words
Export it with default`);
    }

    try {
      const auth = (await import("../../../../../config/auth.ts")).default;
      myModules["auth"] = auth;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/auth
Export it with default`);
    }

    try {
      const logging = (await import("../../../../../config/logging.ts")).default;
      myModules["logging"] = logging;
    } catch (_e) {
      console.error(`Failed to import config module: conifg/logging
Export it with default`);
    }

export default myModules;