# Honovel

A Laravel-inspired web framework for Deno, powered by [Hono](https://hono.dev).

Honovel brings the developer experience of Laravel — clear project structure, expressive routing, migrations, and scaffolding — to the speed and simplicity of Deno and Hono.

---

## Why Honovel?

Deno and Hono are fast and modern, but building a real application from scratch still means making a lot of structural decisions: how to organize routes, where migrations live, how middleware is wired up, how config and environment variables are loaded. Honovel makes those decisions for you, the way Laravel does for PHP — so you can focus on building your app instead of your app's scaffolding.

## Features

- 🏗 **Laravel-like project structure** — familiar folders for routes, config, database, resources, and more
- ⚡ **Powered by Hono** — one of the fastest web frameworks available, with first-class edge support
- 📦 **Native Deno + TypeScript** — no build step required to run, no Node.js dependency
- 🧩 **Domain-based routing** and middleware support
- 🗄 **Full migration system** — up/down migrations, batches, `fresh`, `refresh`, `rollback`, `reset`, and status reporting across MySQL, PostgreSQL, SQLite, and SQL Server
- 🧬 **Eloquent-style facades and ORM** via an `Illuminate`-style namespace (`DB`, `Schema`, models with fillable fields, relationships, factories, seeders)
- 🛠 **Rich code generators** — controllers, models, middleware, requests, mail, events, listeners, jobs, validation rules, exceptions, providers, and views
- 🖼 **Edge templating** for views
- 🔒 **Built-in SSL support** — generate self-signed certs and serve over HTTPS locally with `make:ssl`
- 🚧 **Maintenance mode** — `down`/`up` commands with custom messages, allowlisted IPs, and secret bypass keys
- 🧵 **Pluggable drivers** — install Redis, cache, or database drivers (Ioredis, Upstash, Memcached, DynamoDB, MongoDB, and more) on demand
- 🔁 **Built-in task runner and project scaffolding** for generating boilerplate quickly
- ⚙️ Environment-based configuration (`.env` support out of the box)

## Requirements

- [Deno](https://docs.deno.com/runtime/getting_started/installation/) installed on your machine

## Installation

```bash
# scaffold a new Honovel project
deno run -A https://honovel.kiratrizon.deno.net/create-project my-app@latest

cd my-app

# copy the example environment file
cp .env.example .env

# run the dev server
deno task smelt serve
```

Your app should now be running at `http://localhost:<PORT>` (check your `.env` for the configured port).

## CLI (Smelt)

Honovel ships with **Smelt**, a full-featured CLI for running and managing your app — Laravel's `artisan`, reimagined for Deno.

### Server & App Lifecycle

```bash
deno task smelt serve              # start the dev server
deno task smelt serve --port 3000  # custom port
deno task smelt serve --tunnel     # expose your app publicly

deno task smelt down               # put the app into maintenance mode
deno task smelt up                 # bring the app back online

deno task smelt key:generate       # generate a new application key
deno task smelt make:ssl           # generate self-signed SSL certificates
```

### Code Generation

```bash
deno task smelt make:controller PostController
deno task smelt make:model Post --migration --factory --controller
deno task smelt make:middleware EnsureIsAdmin
deno task smelt make:request StorePostRequest
deno task smelt make:mail WelcomeMail
deno task smelt make:event UserRegistered
deno task smelt make:listener SendWelcomeEmail --event=UserRegistered
deno task smelt make:job ProcessPodcast
deno task smelt make:rule StrongPassword
deno task smelt make:exception PaymentFailedException
deno task smelt make:view posts/index
deno task smelt make:seeder PostSeeder
deno task smelt make:factory PostFactory --model=Post
deno task smelt make:config app
```

### Database & Migrations

```bash
deno task smelt migrate                # run pending migrations
deno task smelt migrate:fresh          # drop all tables and re-run everything
deno task smelt migrate:refresh        # rollback then re-run migrations
deno task smelt migrate:rollback       # rollback the last batch
deno task smelt migrate:reset          # rollback everything
deno task smelt migrate:status         # show which migrations have run
deno task smelt db:seed                # run database seeders
```

Migrations support **MySQL, PostgreSQL, SQLite, and SQL Server** out of the box.

### Maintenance & Optimization

```bash
deno task smelt cache:clear         # clear the application cache
deno task smelt config:clear        # remove the cached config
deno task smelt optimize            # cache framework bootstrap files
deno task smelt optimize:clear      # remove cached bootstrap files
deno task smelt publish:config      # build config/build/myConfig.ts
deno task smelt route:list          # list all named routes
```

### Optional Drivers

```bash
deno task smelt install:driver --redis ioredis
deno task smelt install:driver --cache memcached
deno task smelt install:driver --database mongodb
```

### Frontend Assets (Vite)

```bash
deno task vite:check    # check vite file configuration
deno task vite:dev      # run Vite in dev mode
deno task vite:build    # build assets for production
```

## Project Structure

```
honovel/
├── app/            # Your application code (controllers, models, etc.)
├── bootstrap/       # Framework bootstrapping logic
├── config/          # Configuration files
├── database/        # Migrations and seeders
├── public/          # Publicly accessible assets
├── resources/        # Views, frontend assets
├── routes/           # Route definitions
├── storage/           # Logs, cache, uploaded files
├── vendor/            # Third-party dependencies
├── .env.example       # Example environment config
├── deno.json          # Deno configuration
├── index.ts           # Application entry point
└── vite.config.ts      # Vite configuration for asset bundling
```

## Basic Usage

### Defining Routes

```ts
// routes/web.ts
// TODO: add a real example showing how routes are defined in Honovel
```

### Middleware

```ts
// TODO: add a short example showing how to register/use middleware
```

## Documentation

Full documentation is available at [honovel.kiratrizon.deno.net/docs](https://honovel.kiratrizon.deno.net/docs/1).

## Roadmap

- [x] Finalize license
- [ ] Expand documentation and examples
- [ ] Add more projects

## Contributing

Honovel is under active development. Issues, feedback, and pull requests are welcome — this project is early-stage, so feel free to open a discussion if you're interested in contributing.

## License

This project is licensed under the [MIT License](LICENSE).

## Author

Built by [@kiratrizon](https://github.com/kiratrizon).