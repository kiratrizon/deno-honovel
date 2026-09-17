/**
 * The persistence contract behind a session Store, modelled on PHP's
 * SessionHandlerInterface.
 *
 * Handlers deal in **strings**, not objects: serialization (and any
 * encryption) belongs to the Store, so a handler only has to know how to move
 * an opaque blob in and out of its backing medium.
 */
export abstract class SessionHandler {
  /**
   * Prepare the handler for use. Storage-backed handlers that need no setup
   * should simply return true.
   */
  public abstract open(savePath: string, sessionName: string): Promise<boolean>;

  public abstract close(): Promise<boolean>;

  /**
   * Read the raw payload for a session id, or an empty string when there is
   * nothing stored (or it has expired).
   */
  public abstract read(sessionId: string): Promise<string>;

  public abstract write(sessionId: string, data: string): Promise<boolean>;

  public abstract destroy(sessionId: string): Promise<boolean>;

  /**
   * Sweep expired sessions. `maxLifetime` is in seconds.
   */
  public abstract gc(maxLifetime: number): Promise<boolean>;
}

export default SessionHandler;
