// Server.d.ts

import { HonoType } from "../@types/declaration/imain.d.ts";
import MyServer from "./src/hono/main.ts";

class Server {
  /**
   * The main Hono app instance.
   */
  static app: HonoType;
}

const Honovel = MyServer as typeof Server;

export default Honovel;
