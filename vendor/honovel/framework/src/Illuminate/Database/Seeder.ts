import { DB } from "../Support/Facades/index.ts";

export default abstract class Seeder {
  // Run the database seeds.
  public abstract run(): Promise<void>;

  protected connection: string = DB.getDefaultConnection();

  public setConnection(connection: string) {
    this.connection = connection;
  }
}
