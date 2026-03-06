# 🎯 Events & Listeners - Complete Working Example

## YES! Events & Listeners Are Ready in Your Honovel Framework

Here's a complete, ready-to-use example you can implement right now.

---

## 📋 Step-by-Step Implementation

### 1️⃣ Create Directories (if needed)

```bash
mkdir -p app/Events
mkdir -p app/Listeners
```

### 2️⃣ Create Event: UserRegistered

```bash
deno task smelt make:event UserRegistered
```

Then update **App/Events/UserRegistered.ts**:
```typescript
import User from "App/Models/User.ts";

export default class UserRegistered {
  constructor(
    public user: User,
    public ipAddress: string,
    public userAgent: string,
  ) {}

  public getData(): Record<string, any> {
    return {
      userId: this.user.id,
      email: this.user.email,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      registeredAt: new Date().toISOString(),
    };
  }
}
```

### 3️⃣ Create Listener: SendWelcomeEmail

```bash
deno task smelt make:listener SendWelcomeEmail --event=UserRegistered
```

Then update **App/Listeners/SendWelcomeEmail.ts**:
```typescript
import UserRegistered from "App/Events/UserRegistered.ts";

export default class SendWelcomeEmail {
  public async handle(event: UserRegistered): Promise<void> {
    console.log("\n🎉 ===== EVENT FIRED: UserRegistered =====");
    console.log(`📧 Sending welcome email to: ${event.user.email}`);
    console.log(`👤 User ID: ${event.user.id}`);
    console.log(`🌍 IP Address: ${event.ipAddress}`);
    console.log(`🖥️  User Agent: ${event.userAgent}`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`✅ Welcome email sent successfully!`);
    console.log("==========================================\n");
  }
}
```

### 4️⃣ Create Listener: LogUserRegistration

```bash
deno task smelt make:listener LogUserRegistration --event=UserRegistered
```

Then update **App/Listeners/LogUserRegistration.ts**:
```typescript
import UserRegistered from "App/Events/UserRegistered.ts";
import { DB } from "Illuminate/Support/Facades/index.ts";

export default class LogUserRegistration {
  public async handle(event: UserRegistered): Promise<void> {
    console.log("\n📝 ===== LOGGING USER REGISTRATION =====");
    
    await DB.table('user_registrations').insert({
      user_id: event.user.id,
      email: event.user.email,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      registered_at: new Date(),
    });
    
    console.log(`✅ Registration logged to database`);
    console.log("======================================\n");
  }
}
```

### 5️⃣ Register in EventServiceProvider

Update **App/Providers/EventServiceProvider.ts**:
```typescript
import Event from "Illuminate/Events/index.ts";
import { Hono } from "hono";

// Import your listeners
import SendWelcomeEmail from "App/Listeners/SendWelcomeEmail.ts";
import LogUserRegistration from "App/Listeners/LogUserRegistration.ts";

export default class EventServiceProvider {
  protected listen: Record<string, any[]> = {
    'UserRegistered': [
      SendWelcomeEmail,      // ⬅️ Runs first
      LogUserRegistration,   // ⬅️ Runs second
    ],
  };

  constructor(protected app: Hono) {}

  public async register(): Promise<void> {
    this.registerEventListeners();
  }

  public async boot(): Promise<void> {
    // Bootstrap logic (if needed)
  }

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

### 6️⃣ Register Provider in config/app.ts

Ensure **EventServiceProvider** is in your providers array:

```typescript
import EventServiceProvider from "App/Providers/EventServiceProvider.ts";
import RouteServiceProvider from "App/Providers/RouteServiceProvider.ts";

export default {
  // ... other config
  
  providers: [
    EventServiceProvider,   // ⬅️ Make sure this is here!
    RouteServiceProvider,
  ],
};
```

### 7️⃣ Use in Your Controller

Create or update a controller:

```typescript
// app/Http/Controllers/AuthController.ts (example)
import User from "App/Models/User.ts";
import UserRegistered from "App/Events/UserRegistered.ts";

export default class AuthController {
  /**
   * Handle user registration
   */
  async register({ request }: HttpHono) {
    // Validate input
    const validated = await request.validate({
      name: 'required|string',
      email: 'required|email',
      password: 'required|min:8',
    });

    // Create user
    const user = await User.create({
      name: validated.name,
      email: validated.email,
      password: await Hash.make(validated.password),
    });

    // 🎉 FIRE THE EVENT!
    await event(new UserRegistered(
      user,
      request.ip(),
      request.userAgent(),
    ));

    return response().json({
      message: 'Registration successful!',
      user: user,
    });
  }
}
```

---

## 🧪 Test It Right Now!

### Option 1: Test via Route

1. Add a test route in **routes/web.ts**:
```typescript
import Route from "Illuminate/Support/Facades/Route.ts";
import User from "App/Models/User.ts";
import UserRegistered from "App/Events/UserRegistered.ts";

Route.get('/test-event', async ({ request }: HttpHono) => {
  // Create a test user
  const user = await User.create({
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'password123',
  });

  console.log('\n🔥 FIRING EVENT: UserRegistered\n');

  // Fire the event
  await event(new UserRegistered(
    user,
    request.ip(),
    request.userAgent(),
  ));

  return response().json({
    message: 'Event fired! Check console for logs.',
    user: user,
  });
});
```

2. Start your server:
```bash
deno task serve
```

3. Visit: `http://localhost/test-event`

4. Check your console - you should see:
```
🔥 FIRING EVENT: UserRegistered

🎉 ===== EVENT FIRED: UserRegistered =====
📧 Sending welcome email to: test123@example.com
👤 User ID: 1
🌍 IP Address: 127.0.0.1
🖥️  User Agent: Mozilla/5.0...
✅ Welcome email sent successfully!
==========================================

📝 ===== LOGGING USER REGISTRATION =====
✅ Registration logged to database
======================================
```

### Option 2: Test via CLI Script

Create **test-events.ts**:
```typescript
import "./index.ts";
import User from "App/Models/User.ts";
import UserRegistered from "App/Events/UserRegistered.ts";
import Event from "Illuminate/Events/index.ts";
import SendWelcomeEmail from "App/Listeners/SendWelcomeEmail.ts";

// Register listener
Event.listen('UserRegistered', new SendWelcomeEmail());

// Create test user
const user = new User();
user.id = 1;
user.email = "test@example.com";
user.name = "Test User";

// Fire event
console.log("🔥 Dispatching UserRegistered event...\n");
await Event.dispatch(new UserRegistered(user, "127.0.0.1", "Test Browser"));

console.log("✅ Event dispatched successfully!");
```

Run it:
```bash
deno run -A test-events.ts
```

---

## 🎨 More Examples

### Example: Blog Comment System

```typescript
// app/Events/CommentAdded.ts
export default class CommentAdded {
  constructor(
    public comment: Comment,
    public post: Post,
    public author: User,
  ) {}
}

// app/Listeners/NotifyPostAuthor.ts
export default class NotifyPostAuthor {
  async handle(event: CommentAdded) {
    if (event.post.author_id !== event.author.id) {
      console.log(`📬 Notifying post author about new comment`);
      // Send notification
    }
  }
}

// app/Listeners/CheckCommentForSpam.ts
export default class CheckCommentForSpam {
  async handle(event: CommentAdded) {
    console.log(`🔍 Checking comment for spam`);
    
    // If spam detected
    if (await this.isSpam(event.comment.content)) {
      await event.comment.update({ is_spam: true });
      return false; // Stop propagation
    }
  }
  
  private async isSpam(content: string): Promise<boolean> {
    // Spam detection logic
    return content.includes('viagra'); // Simple example
  }
}

// Register
protected listen = {
  'CommentAdded': [
    CheckCommentForSpam,    // Runs first (check spam)
    NotifyPostAuthor,       // Only runs if not spam
  ],
};

// Fire in controller
await event(new CommentAdded(comment, post, author));
```

---

## 📖 Quick Reference Card

```typescript
// ========== CREATE ==========
deno task make:event EventName
deno task make:listener ListenerName --event=EventName

// ========== REGISTER ==========
// In app/Providers/EventServiceProvider.ts
protected listen = {
  'EventName': [ListenerClass],
};

// ========== DISPATCH ==========
await event(new EventName(data));

// ========== ADVANCED ==========
Event.listen('EventName', listener);          // Register
Event.listen(['Event1', 'Event2'], listener); // Multiple
Event.listen('*', listener);                  // Wildcard
Event.listen('EventName', listener, 10);      // Priority
await Event.until(new EventName());           // First response
Event.hasListeners('EventName');              // Check
Event.forget('EventName');                    // Remove
```

---

## 🎉 You're All Set!

Your Honovel framework now has a **fully functional Event system** just like Laravel!

**Files Created:**
- ✅ `vendor/honovel/framework/src/Illuminate/Events/EventDispatcher.ts`
- ✅ `vendor/honovel/framework/src/Illuminate/Events/index.ts`
- ✅ `app/Providers/EventServiceProvider.ts`
- ✅ Global `event()` function added
- ✅ CLI commands ready to use

**Start using it:**
```bash
deno task make:event YourEvent
deno task make:listener YourListener --event=YourEvent
```

Happy eventing! 🚀
