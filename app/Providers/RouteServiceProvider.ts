import { ServiceProvider } from "Illuminate/Support/index.ts";
import { Route } from "Illuminate/Support/Facades/index.ts";

export default class RouteServiceProvider extends ServiceProvider {
  /**
   * Register the service provider.
   */
  public async register(): Promise<void> {
    // Register any bindings or services here
  }

  /**
   * Bootstrap any application services.
   */
  public async boot(): Promise<void> {
    Route.middleware("web").group(basePath("routes/web.ts"));

    Route.prefix("/api").middleware("api").group(basePath("routes/api.ts"));

    // Route domain is not supported in boot, so we will not register domain routes here.
  }

  public static home = "/home";
}
