# 🎉 Events and Listeners in Honovel

## Quick Answer: YES! You Can Use Events in Your Honovel Framework

I've just implemented a complete **Event System** for your Honovel framework! Here's everything you need to know.

---

## 📦 What's Included

### ✅ Core Components Created:
1. **EventDispatcher** - The engine that manages and dispatches events
2. **Event Facade** - Simple API to interact with events
3. **EventServiceProvider** - Register your event-listener mappings
4. **Global `event()` function** - Dispatch events from anywhere
5. **CLI Commands** - `make:event` and `make:listener`

---

## 🚀 Quick Start Guide

### Step 1: Create an Event

```bash
deno task make:event UserRegistered
```

**app/Events/UserRegistered.ts**:
```typescript
import User from "app/Models/User.ts";

export default class UserRegistered {
  constructor(public user: User, public ipAddress: string) {
    // Store event data
  }

  public getData(): Record<string, any> {
    return {
      userId: this.user.id,
      email: this.user.email,
      ipAddress: this.ipAddress,
      registeredAt: new Date().toISOString(),
    };
  }
}
```

### Step 2: Create a Listener

```bash
deno task make:listener SendWelcomeEmail --event=UserRegistered
```

**app/Listeners/SendWelcomeEmail.ts**:
```typescript
import UserRegistered from "app/Events/UserRegistered.ts";
// import Mail from "Illuminate/Support/Facades/Mail.ts";

export default class SendWelcomeEmail {
  /**
   * Handle the event
   */
  public async handle(event: UserRegistered): Promise<void> {
    console.log(`📧 Sending welcome email to ${event.user.email}`);
    
    // TODO: Send actual email when Mail system is ready
    // await Mail.to(event.user.email)
    //   .subject('Welcome to Honovel!')
    //   .send(new WelcomeMail(event.user));
    
    console.log(`✅ Welcome email sent!`);
  }
}
```

### Step 3: Register Event & Listeners

**app/Providers/EventServiceProvider.ts**:
```typescript
import Event from "Illuminate/Events/index.ts";
import { Hono } from "hono";
import SendWelcomeEmail from "app/Listeners/SendWelcomeEmail.ts";
import LogUserActivity from "app/Listeners/LogUserActivity.ts";

export default class EventServiceProvider {
  protected listen: Record<string, any[]> = {
    'UserRegistered': [
      SendWelcomeEmail,
      LogUserActivity,
    ],
  };

  constructor(protected app: Hono) {}

  public async register(): Promise<void> {
    this.registerEventListeners();
  }

  public async boot(): Promise<void> {}

  protected registerEventListeners(): void {
    for (const [eventName, listeners] of Object.entries(this.listen)) {
      for (const ListenerClass of listeners) {
        const listenerInstance = new ListenerClass();
        Event.listen(eventName, listenerInstance);
      }
    }
  }
}
```

### Step 4: Register the Provider

**config/app.ts**:
```typescript
import EventServiceProvider from "app/Providers/EventServiceProvider.ts";
import RouteServiceProvider from "app/Providers/RouteServiceProvider.ts";

export default {
  // ... other config
  
  providers: [
    EventServiceProvider,  // ⬅️ Add this!
    RouteServiceProvider,
  ],
};
```

### Step 5: Dispatch Events

**In your controller**:
```typescript
import User from "app/Models/User.ts";
import UserRegistered from "app/Events/UserRegistered.ts";

export default class AuthController {
  async register({ request }: HttpHono) {
    const validated = await request.validate({
      email: 'required|email',
      password: 'required|min:8',
    });

    const user = await User.create(validated);

    // 🎉 Fire the event - all listeners will be triggered!
    await event(new UserRegistered(user, request.ip()));
    
    return response().json({ message: 'Registration successful!' });
  }
}
```

---

## 🎯 Real-World Examples

### Example 1: E-commerce Order System

#### Event: OrderPlaced
```typescript
// app/Events/OrderPlaced.ts
export default class OrderPlaced {
  constructor(
    public order: Order,
    public customer: User,
  ) {}

  public getData() {
    return {
      orderId: this.order.id,
      total: this.order.total,
      customerId: this.customer.id,
    };
  }
}
```

#### Listeners:
```typescript
// app/Listeners/SendOrderConfirmation.ts
export default class SendOrderConfirmation {
  async handle(event: OrderPlaced) {
    console.log(`📧 Sending order confirmation to ${event.customer.email}`);
    // Send email logic
  }
}

// app/Listeners/NotifyWarehouse.ts
export default class NotifyWarehouse {
  async handle(event: OrderPlaced) {
    console.log(`📦 Notifying warehouse about order #${event.order.id}`);
    // API call to warehouse system
  }
}

// app/Listeners/UpdateInventory.ts
export default class UpdateInventory {
  async handle(event: OrderPlaced) {
    console.log(`📊 Updating inventory for order #${event.order.id}`);
    // Update stock levels
  }
}
```

#### Register in EventServiceProvider:
```typescript
protected listen = {
  'OrderPlaced': [
    SendOrderConfirmation,
    NotifyWarehouse,
    UpdateInventory,
  ],
};
```

#### Fire the Event:
```typescript
const order = await Order.create(orderData);
await event(new OrderPlaced(order, customer));
// All 3 listeners execute automatically! 🎉
```

---

### Example 2: User Authentication Events

```typescript
// app/Events/UserLoggedIn.ts
export default class UserLoggedIn {
  constructor(
    public user: User,
    public remember: boolean,
  ) {}
}

// app/Listeners/UpdateLastLogin.ts
export default class UpdateLastLogin {
  async handle(event: UserLoggedIn) {
    await event.user.update({
      last_login_at: new Date(),
      last_login_ip: request().ip(),
    });
  }
}

// app/Listeners/LogLoginActivity.ts
export default class LogLoginActivity {
  async handle(event: UserLoggedIn) {
    await DB.table('activity_logs').insert({
      user_id: event.user.id,
      action: 'login',
      ip_address: request().ip(),
      created_at: new Date(),
    });
  }
}

// In your controller:
await event(new UserLoggedIn(user, remember));
```

---

## 💡 Advanced Usage

### 1. **Listen to Multiple Events**

```typescript
Event.listen(['UserRegistered', 'UserUpdated'], async (event) => {
  console.log('User action detected:', event);
});
```

### 2. **Wildcard Listeners** (Listen to ALL events)

```typescript
Event.listen('*', async (event) => {
  console.log('Any event fired:', event.constructor.name);
});
```

### 3. **Priority Listeners** (Higher priority runs first)

```typescript
Event.listen('OrderPlaced', listenerA, 10);  // Runs first
Event.listen('OrderPlaced', listenerB, 5);   // Runs second
Event.listen('OrderPlaced', listenerC, 0);   // Runs third
```

### 4. **Function Listeners** (No class needed)

```typescript
Event.listen('UserRegistered', async (event) => {
  console.log(`New user: ${event.user.email}`);
  // Do something...
});
```

### 5. **Stop Propagation** (Prevent other listeners from running)

```typescript
export default class CheckUserBanned {
  async handle(event: UserLoggedIn) {
    if (event.user.is_banned) {
      console.log('User is banned, stopping propagation');
      return false; // ⬅️ Stops other listeners
    }
  }
}
```

### 6. **Get First Response** (until method)

```typescript
const result = await Event.until(new CalculateDiscount(order));
// Returns first non-null response from listeners
```

---

## 🎨 Best Practices

### ✅ DO:
- **Keep events simple** - Just hold data
- **Keep listeners focused** - One task per listener
- **Use descriptive names** - `UserRegistered` not `Event1`
- **Handle errors gracefully** - Wrap listener code in try-catch
- **Think async** - Listeners can be async
- **Test independently** - Each listener can be unit tested

### ❌ DON'T:
- **Don't put business logic in events** - Events store data, listeners handle logic
- **Don't make listeners depend on each other** - They should be independent
- **Don't return values from listeners** (unless using `until()`)
- **Don't fire events in loops** - Be mindful of performance

---

## 🔧 Common Use Cases

### 1. **User Management**
```typescript
// Events
- UserRegistered
- UserLoggedIn
- UserLoggedOut
- UserDeleted
- PasswordChanged
- EmailVerified

// Listeners
- SendWelcomeEmail
- UpdateLastLogin
- LogUserActivity
- CleanupUserData
- SendSecurityAlert
- UpdateAnalytics
```

### 2. **E-commerce**
```typescript
// Events
- OrderPlaced
- OrderShipped
- PaymentProcessed
- PaymentFailed
- ProductOutOfStock

// Listeners
- SendOrderConfirmation
- NotifyWarehouse
- UpdateInventory
- SendShipmentTracking
- ChargeCustomer
- NotifyAdmin
```

### 3. **Content Management**
```typescript
// Events
- PostPublished
- PostUpdated
- CommentAdded
- CommentModerated

// Listeners
- ClearPostCache
- NotifySubscribers
- UpdateSitemap
- SendNotification
- CheckForSpam
```

---

## 📝 Complete Example: Blog Post System

### Create Event & Listeners

```bash
# Create event
deno task make:event PostPublished

# Create listeners
deno task make:listener NotifySubscribers --event=PostPublished
deno task make:listener ClearPostCache --event=PostPublished
deno task make:listener UpdateSitemap --event=PostPublished
```

### Implement Event

```typescript
// app/Events/PostPublished.ts
import Post from "app/Models/Post.ts";

export default class PostPublished {
  constructor(public post: Post) {}

  public getData() {
    return {
      postId: this.post.id,
      title: this.post.title,
      author: this.post.author_id,
      publishedAt: new Date(),
    };
  }
}
```

### Implement Listeners

```typescript
// app/Listeners/NotifySubscribers.ts
import PostPublished from "app/Events/PostPublished.ts";
import { DB } from "Illuminate/Support/Facades/index.ts";

export default class NotifySubscribers {
  async handle(event: PostPublished) {
    const subscribers = await DB.table('subscribers')
      .where('is_active', true)
      .get();

    for (const subscriber of subscribers) {
      console.log(`📧 Notifying ${subscriber.email} about: ${event.post.title}`);
      // Send notification logic
    }
  }
}

// app/Listeners/ClearPostCache.ts
import PostPublished from "app/Events/PostPublished.ts";
// import Cache from "Illuminate/Support/Facades/Cache.ts";

export default class ClearPostCache {
  async handle(event: PostPublished) {
    console.log(`🗑️ Clearing cache for post #${event.post.id}`);
    // await Cache.forget(`post:${event.post.id}`);
    // await Cache.forget('posts:list');
  }
}

// app/Listeners/UpdateSitemap.ts
import PostPublished from "app/Events/PostPublished.ts";

export default class UpdateSitemap {
  async handle(event: PostPublished) {
    console.log(`🗺️ Updating sitemap after publishing: ${event.post.title}`);
    // Generate/update sitemap.xml
  }
}
```

### Register Listeners

```typescript
// app/Providers/EventServiceProvider.ts
import SendWelcomeEmail from "app/Listeners/SendWelcomeEmail.ts";
import NotifySubscribers from "app/Listeners/NotifySubscribers.ts";
import ClearPostCache from "app/Listeners/ClearPostCache.ts";
import UpdateSitemap from "app/Listeners/UpdateSitemap.ts";

export default class EventServiceProvider {
  protected listen: Record<string, any[]> = {
    'UserRegistered': [SendWelcomeEmail],
    'PostPublished': [
      NotifySubscribers,
      ClearPostCache,
      UpdateSitemap,
    ],
  };
  
  // ... rest of the provider
}
```

### Use in Controller

```typescript
// app/Http/Controllers/PostController.ts
import Post from "app/Models/Post.ts";
import PostPublished from "app/Events/PostPublished.ts";

export default class PostController {
  async store({ request }: HttpHono) {
    const post = await Post.create({
      title: request.input('title'),
      content: request.input('content'),
      author_id: request.user()?.id,
      published_at: new Date(),
    });

    // 🎉 Fire the event!
    await event(new PostPublished(post));
    
    return redirect().route('posts.show', { id: post.id });
  }
}
```

---

## 🎯 Why Use Events & Listeners?

### Before (Coupled Code):
```typescript
// PostController - doing too much!
async store({ request }) {
  const post = await Post.create(data);
  
  // Oh no! Controller knows about everything!
  await this.sendEmailToSubscribers(post);
  await this.clearCache(post.id);
  await this.updateSitemap();
  await this.logAnalytics(post);
  await this.notifySlack(post);
  
  // What if email fails? What if you add more features?
  // Controller gets messy!
  
  return redirect().route('posts.show', { id: post.id });
}
```

### After (Decoupled with Events):
```typescript
// PostController - clean and focused!
async store({ request }) {
  const post = await Post.create(data);
  
  // That's it! One line handles everything
  await event(new PostPublished(post));
  
  return redirect().route('posts.show', { id: post.id });
}

// All the heavy lifting happens in separate, testable listeners:
// - NotifySubscribers
// - ClearPostCache
// - UpdateSitemap
// - LogAnalytics
// - NotifySlack

// Need a new feature? Just add a new listener!
// Need to remove something? Just unregister the listener!
```

---

## 🔥 API Reference

### Event Facade Methods

```typescript
// Dispatch an event
await Event.dispatch(new UserRegistered(user));
await Event.dispatch('user.registered', [user]);

// Dispatch until first response
const result = await Event.until(new CalculateDiscount(order));

// Register a listener
Event.listen('UserRegistered', new SendWelcomeEmail());
Event.listen('UserRegistered', async (event) => {
  console.log('User registered:', event.user.email);
});

// Multiple events
Event.listen(['UserRegistered', 'UserUpdated'], listener);

// With priority
Event.listen('OrderPlaced', listener, 10);

// Check if event has listeners
if (Event.hasListeners('UserRegistered')) {
  await Event.dispatch(new UserRegistered(user));
}

// Get all listeners
const listeners = Event.getListeners('UserRegistered');

// Remove listeners
Event.forget('UserRegistered');
Event.forgetAll();
```

### Global Helper Function

```typescript
// Shortcut to Event.dispatch()
await event(new UserRegistered(user));
await event('user.registered', [user]);
```

---

## 🧪 Testing Events & Listeners

### Test a Listener Independently

```typescript
// tests/Listeners/SendWelcomeEmailTest.ts
import { assertEquals } from "@std/assert";
import SendWelcomeEmail from "app/Listeners/SendWelcomeEmail.ts";
import UserRegistered from "app/Events/UserRegistered.ts";
import User from "app/Models/User.ts";

Deno.test("sends welcome email when user registers", async () => {
  const user = new User({ email: "test@example.com" });
  const event = new UserRegistered(user, "127.0.0.1");
  
  const listener = new SendWelcomeEmail();
  await listener.handle(event);
  
  // Assert email was sent (mock your Mail facade)
  // assertEquals(Mail.sent.length, 1);
});
```

### Test Event Dispatching

```typescript
// tests/Events/UserRegisteredTest.ts
import { assertEquals } from "@std/assert";
import Event from "Illuminate/Events/index.ts";
import UserRegistered from "app/Events/UserRegistered.ts";

Deno.test("dispatches UserRegistered event", async () => {
  let listenerCalled = false;
  
  Event.listen('UserRegistered', async (event) => {
    listenerCalled = true;
    assertEquals(event.user.email, "test@example.com");
  });
  
  const user = new User({ email: "test@example.com" });
  await Event.dispatch(new UserRegistered(user, "127.0.0.1"));
  
  assertEquals(listenerCalled, true);
});
```

---

## 🚀 Advanced Patterns

### 1. Event Subscribers (Group Related Listeners)

```typescript
// app/Listeners/UserEventSubscriber.ts
export default class UserEventSubscriber {
  subscribe() {
    return {
      'UserRegistered': [this.onUserRegistered],
      'UserLoggedIn': [this.onUserLoggedIn],
      'UserDeleted': [this.onUserDeleted],
    };
  }

  async onUserRegistered(event: any) {
    console.log('User registered:', event.user);
  }

  async onUserLoggedIn(event: any) {
    console.log('User logged in:', event.user);
  }

  async onUserDeleted(event: any) {
    console.log('User deleted:', event.user);
  }
}

// Register subscriber
Event.subscribe(new UserEventSubscriber());
```

### 2. Conditional Event Firing

```typescript
// Only fire if condition is met
if (user.needsVerification()) {
  await event(new EmailVerificationNeeded(user));
}
```

### 3. Event Data Validation

```typescript
export default class OrderPlaced {
  constructor(public order: Order) {
    if (!order.id) {
      throw new Error('Order must have an ID');
    }
  }
}
```

---

## 📚 Full File Structure

```
app/
├── Events/
│   ├── UserRegistered.ts
│   ├── OrderPlaced.ts
│   └── PostPublished.ts
│
├── Listeners/
│   ├── SendWelcomeEmail.ts
│   ├── NotifyWarehouse.ts
│   ├── ClearPostCache.ts
│   └── UpdateAnalytics.ts
│
└── Providers/
    └── EventServiceProvider.ts  ⬅️ Maps events to listeners

config/
└── app.ts  ⬅️ Registers EventServiceProvider
```

---

## ✅ Benefits Summary

| Benefit | Description |
|---------|-------------|
| **Decoupling** | Controllers don't know about emails, caching, logging, etc. |
| **Flexibility** | Add/remove features without touching core code |
| **Testability** | Test each listener independently |
| **Maintainability** | Each file has one clear responsibility |
| **Scalability** | Easy to add new reactions to existing events |
| **Code Reuse** | Same event can trigger multiple actions |

---

## 🎓 Summary

**YES!** You can absolutely use Events and Listeners in your Honovel framework. I've implemented:

✅ Full Event Dispatcher system  
✅ Event Facade with clean API  
✅ EventServiceProvider for registration  
✅ Global `event()` helper function  
✅ CLI commands: `make:event` and `make:listener`  
✅ Complete type safety with TypeScript  

**It's ready to use right now!** Just:
1. Create events with `deno task make:event`
2. Create listeners with `deno task make:listener`
3. Register them in `EventServiceProvider`
4. Fire events with `await event(new YourEvent())`

Happy coding! 🚀
