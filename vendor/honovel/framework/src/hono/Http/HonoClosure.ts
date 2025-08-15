import HonoRequest from "HonoHttp/HonoRequest.ts";

class HonoClosure {
  constructor(private readonly c: MyContext) {}

  protected next(_request?: HonoRequest) {
    // to be implemented
    return this;
  }

  get headers() {
    return {
      set: (key: string, value: string): HonoClosure => {
        this.c.res.headers.set(key, value);
        return this;
      },
    };
  }
}

export default HonoClosure;
