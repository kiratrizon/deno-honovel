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
}
