import SessionManager from "../SessionManager.ts";
import { SessionStore } from "../Store.ts";
import HRequest from "HonoHttp/HonoRequest.d.ts";
import { Cookie } from "HonoHttp/HonoCookie.ts";
import HonoClosure from "HonoHttp/HonoClosure.ts";

export default class StartSession {
  #manager: SessionManager;

  constructor(manager?: SessionManager) {
    this.#manager = manager ?? new SessionManager();
  }

  public handle: HttpMiddleware = async ({ request, Cookie }, next) => {
    if (!this.sessionConfigured()) {
      return await next();
    }

    return await this.handleStatefulRequest(
      request,
      Cookie,
      this.getSession(Cookie),
      next,
    );
  };

  /**
   * Build the session for this request and seed it with the incoming cookie.
   * A missing or malformed cookie leaves the Store on the id it minted itself.
   */
  public getSession(cookie: Cookie): SessionStore {
    const session = this.#manager.driver();
    session.setId(cookie.get(session.getName()));
    return session;
  }

  /**
   * Run the request with a live session bound to it.
   */
  protected async handleStatefulRequest(
    request: HRequest,
    cookie: Cookie,
    session: SessionStore,
    next: HonoClosure["next"],
  ): Promise<unknown> {
    request.setSession(await this.startSession(session));

    await this.collectGarbage(session);

    const response = await next();

    this.storeCurrentUrl(request, session);
    this.addCookieToResponse(cookie, session);

    // Saved last: ageFlashData runs inside save(), so it must see everything
    // the request flashed.
    await this.saveSession(session);

    return response;
  }

  /**
   * Load the session from its handler.
   */
  protected async startSession(session: SessionStore): Promise<SessionStore> {
    await session.start();
    return session;
  }

  /**
   * Sweep expired sessions on the configured lottery odds.
   */
  protected async collectGarbage(session: SessionStore): Promise<void> {
    const sesConfig = config("session");
    const [chance, outOf] = sesConfig.lottery;

    if (!isNumeric(chance) || !isNumeric(outOf) || outOf <= 0) return;

    if (Math.floor(Math.random() * outOf) + 1 <= chance) {
      await session.getHandler().gc(sesConfig.lifetime * 60);
    }
  }

  /**
   * Remember where the user is, so redirect().back() has somewhere to go.
   * Only plain GETs count - an ajax call is not a page you can go "back" to.
   */
  protected storeCurrentUrl(request: HRequest, session: SessionStore): void {
    if (request.method === "GET" && !request.ajax()) {
      session.setPreviousUrl(request.url);
    }
  }

  /**
   * Issue the session cookie.
   *
   * Written after the response so it carries the final id - regenerate() or
   * invalidate() during the request would otherwise leave the client pointing
   * at a session that no longer exists.
   */
  protected addCookieToResponse(cookie: Cookie, session: SessionStore): void {
    const sesConfig = config("session");

    cookie.queue(session.getName(), session.getId(), {
      // Omitting maxAge makes it a session cookie, dying with the browser.
      maxAge: sesConfig.expireOnClose ? undefined : sesConfig.lifetime * 60,
      sameSite: sesConfig.sameSite || "lax",
      secure: sesConfig.secure || false,
      // `??` rather than `||`, so an explicit false is honoured.
      httpOnly: sesConfig.httpOnly ?? true,
      partitioned: sesConfig.partitioned || false,
      path: sesConfig.path || "/",
    });
  }

  protected async saveSession(session: SessionStore): Promise<void> {
    await session.save();
  }

  /**
   * Whether a session driver is configured at all.
   */
  protected sessionConfigured(): boolean {
    const driver = config("session")?.driver;
    return isString(driver) && !empty(driver);
  }
}
