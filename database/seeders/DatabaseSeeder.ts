import Seeder from "Illuminate/Database/Seeder.ts";
import User from "App/Models/User.ts";

export default class DatabaseSeeder extends Seeder {
  public async run() {
    // Call your factories here
    const UserFactory = await User.factory(this.connection);
    const createUsers = await UserFactory.createMany(10);
    // createUsers.forEach((user) => {
    //   console.log(user.toObject());
    // });
  }
}
