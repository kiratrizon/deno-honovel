/**
 * Events Module
 * Provides event dispatching and listener registration
 */

import EventDispatcher, { getEventDispatcher } from "./EventDispatcher.ts";

/**
 * Event Facade - Simple API for event management
 */
export class Event {
  private static dispatcher: EventDispatcher;

  /**
   * Get the event dispatcher instance
   */
  private static getDispatcher(): EventDispatcher {
    if (!this.dispatcher) {
      this.dispatcher = getEventDispatcher();
    }
    return this.dispatcher;
  }

  /**
   * Register an event listener
   *
   * @example
   * Event.listen('UserRegistered', new SendWelcomeEmail());
   * Event.listen('UserRegistered', async (event) => { ... });
   * Event.listen(['UserRegistered', 'UserUpdated'], listener);
   */
  public static listen(
    event: string | string[],
    listener: any,
    priority: number = 0,
  ): void {
    this.getDispatcher().listen(event, listener, priority);
  }

  /**
   * Dispatch an event
   *
   * @example
   * await Event.dispatch(new UserRegistered(user));
   * await Event.dispatch('user.registered', [user]);
   */
  public static async dispatch(
    event: string | object,
    payload: any[] = [],
  ): Promise<any[]> {
    return await this.getDispatcher().dispatch(event, payload);
  }

  /**
   * Dispatch an event until first non-null response
   *
   * @example
   * const result = await Event.until(new SomeEvent());
   */
  public static async until(
    event: string | object,
    payload: any[] = [],
  ): Promise<any> {
    return await this.getDispatcher().until(event, payload);
  }

  /**
   * Check if event has listeners
   */
  public static hasListeners(event: string): boolean {
    return this.getDispatcher().hasListeners(event);
  }

  /**
   * Remove listeners for an event
   */
  public static forget(event: string): void {
    this.getDispatcher().forget(event);
  }

  /**
   * Remove all event listeners
   */
  public static forgetAll(): void {
    this.getDispatcher().forgetAll();
  }

  /**
   * Get all listeners for an event
   */
  public static getListeners(event: string): any[] {
    return this.getDispatcher().getListeners(event);
  }

  /**
   * Subscribe an event subscriber
   */
  public static subscribe(subscriber: any): void {
    this.getDispatcher().subscribe(subscriber);
  }

  /**
   * Set custom dispatcher (for testing)
   */
  public static setDispatcher(dispatcher: EventDispatcher): void {
    this.dispatcher = dispatcher;
  }
}

export { EventDispatcher, getEventDispatcher };
export default Event;
