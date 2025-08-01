import { ServiceProvider } from "Illuminate/Support/index.ts";

export default class AppServiceProvider extends ServiceProvider {
  public async register() {
    // Register your application services here
  }

  public async boot() {
    // Boot your application services here
  }
}
