/**
 * continue to the next middleware.
 *
 * await it for the response,
 * or use `.headers` to modify the response headers.
 */
class HonoClosure {
  #continued = false;
  #pending?: Promise<Response>;

  constructor(
    private readonly c: MyContext,
    // get hono's next to run inside HonoClosure
    private readonly honoNext: () => Promise<void>,
  ) {}

  public get continued(): boolean {
    return this.#continued;
  }

  #run(): Promise<Response> {
    if (!isset(this.#pending)) {
      this.#continued = true;
      // wrap it in async so honoNext magic will run...
      this.#pending = (async () => {
        await this.honoNext();
        // return the res after next is executed
        return this.c.res;
      })();
    }
    return this.#pending as Promise<Response>;
  }

  // auto execute when next() is awaited
  public then(
    resolve?: (value: Response) => unknown,
    reject?: (reason: unknown) => unknown,
  ) {
    return this.#run().then(resolve, reject);
  }

  public next(): HonoClosure {
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
