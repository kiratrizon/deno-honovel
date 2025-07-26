import { SupportedDrivers } from "configs/@types/index.d.ts";

type MigratingOptions = "up" | "down";

export abstract class Migration {
  /**
   * Run the migrations.
   */
  public abstract up(): Promise<void>;
  /**
   * Reverse the migrations.
   */
  public abstract down(): Promise<void>;

  public async run(type: MigratingOptions): Promise<void> {
    return await this[type]();
  }

  protected connection: SupportedDrivers = staticConfig("database").default;
  public setConnection(connection: SupportedDrivers) {
    if (!isset(connection)) {
      throw new Error("Database connection must be defined.");
    }
    if (!isset(staticConfig("database").connections[connection])) {
      throw new Error(`Database connection "${connection}" is not defined in config/database.ts.`);
    }
    this.connection = connection;
  }
}
