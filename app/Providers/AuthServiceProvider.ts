import { ServiceProvider } from "Illuminate/Support/index.ts";
import { Gate } from "Illuminate/Support/Facades/index.ts";

export default class AuthServiceProvider extends ServiceProvider {
  public async register() {
    // Register your application services here
  }

  public async boot() {
    // Boot your application services here
  }
}
