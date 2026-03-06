/**
 * Event Dispatcher for Honovel Framework
 * Manages event registration and dispatching
 */

type EventListener = {
  listener: any;
  priority: number;
};

export class EventDispatcher {
  private listeners: Map<string, EventListener[]> = new Map();
  private wildcardListeners: EventListener[] = [];

  /**
   * Register an event listener
   */
  public listen(
    event: string | string[],
    listener: any,
    priority: number = 0,
  ): void {
    const events = Array.isArray(event) ? event : [event];
    for (const eventName of events) {
      if (eventName === "*") {
        this.wildcardListeners.push({ listener, priority });
        this.wildcardListeners.sort((a, b) => b.priority - a.priority);
      } else {
        if (!this.listeners.has(eventName)) {
          this.listeners.set(eventName, []);
        }

        const eventListeners = this.listeners.get(eventName)!;
        eventListeners.push({ listener, priority });
        eventListeners.sort((a, b) => b.priority - a.priority);
      }
    }
  }

  /**
   * Check if an event has listeners
   */
  public hasListeners(event: string): boolean {
    return this.listeners.has(event) || this.wildcardListeners.length > 0;
  }

  /**
   * Dispatch an event
   */
  public async dispatch(
    event: string | object,
    payload: any[] = [],
  ): Promise<any[]> {
    let eventName: string;
    let eventObject: any;

    if (typeof event === "string") {
      eventName = event;
      eventObject = null;
    } else {
      eventName = event.constructor.name;
      eventObject = event;
    }

    const results: any[] = [];

    // Get specific listeners for this event
    const eventListeners = this.listeners.get(eventName) || [];

    // Combine with wildcard listeners
    const allListeners = [...eventListeners, ...this.wildcardListeners];

    for (const { listener } of allListeners) {
      try {
        let result;

        if (typeof listener === "function") {
          // Function listener
          result = await listener(eventObject || payload[0], ...payload);
        } else if (typeof listener === "object" && listener.handle) {
          // Class-based listener with handle method
          result = await listener.handle(eventObject || payload[0], ...payload);
        } else if (typeof listener === "string") {
          // String reference to listener class (lazy loading)
          // This would require a container implementation
          throw new Error("String-based listeners not yet implemented");
        }

        if (result === false) {
          // Stop propagation if listener returns false
          break;
        }

        results.push(result);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Dispatch an event until the first non-null response
   */
  public async until(
    event: string | object,
    payload: any[] = [],
  ): Promise<any> {
    let eventName: string;
    let eventObject: any;

    if (typeof event === "string") {
      eventName = event;
      eventObject = null;
    } else {
      eventName = event.constructor.name;
      eventObject = event;
    }

    const eventListeners = this.listeners.get(eventName) || [];
    const allListeners = [...eventListeners, ...this.wildcardListeners];

    for (const { listener } of allListeners) {
      const result =
        typeof listener === "function"
          ? await listener(eventObject || payload[0], ...payload)
          : await listener.handle(eventObject || payload[0], ...payload);

      if (result !== null && result !== undefined) {
        return result;
      }
    }

    return null;
  }

  /**
   * Remove event listeners
   */
  public forget(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners
   */
  public forgetAll(): void {
    this.listeners.clear();
    this.wildcardListeners = [];
  }

  /**
   * Get all listeners for an event
   */
  public getListeners(event: string): any[] {
    return (this.listeners.get(event) || []).map((l) => l.listener);
  }

  /**
   * Subscribe multiple listeners at once
   */
  public subscribe(subscriber: any): void {
    if (typeof subscriber.subscribe === "function") {
      const events = subscriber.subscribe();

      for (const [event, listeners] of Object.entries(events)) {
        const listenerArray = Array.isArray(listeners)
          ? listeners
          : [listeners];
        for (const listener of listenerArray) {
          this.listen(event, listener);
        }
      }
    }
  }
}

// Singleton instance
let instance: EventDispatcher | null = null;

export function getEventDispatcher(): EventDispatcher {
  if (!instance) {
    instance = new EventDispatcher();
  }
  return instance;
}

export default EventDispatcher;
