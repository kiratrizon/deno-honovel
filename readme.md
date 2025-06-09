# Honovel Deno

Welcome to **Honovel Deno** — a Laravel-inspired web framework powered by [Hono](https://hono.dev) and [Deno](https://deno.com).

---

## ✨ Features

- Laravel-like project structure and routing
- Built on top of the fast and minimal [Hono](https://hono.dev) framework
- Uses Deno for native TypeScript support and modern development experience
- Support for domain-based routing, middleware, and more

---

## 🚀 How to Setup

1. **Download or clone the repository**

```bash
git clone https://github.com/kiratrizon/deno-honovel.git
```

2. **Navigate to the root folder**

```bash
cd deno-honovel
```

3. **Install dependencies**

```bash
deno install
```

4. **Start the development server**

```bash
deno task dev
```


## 🛠 VS Code Setup for Deno

To enable proper Deno types and IntelliSense in **VS Code**, create a `.vscode/settings.json` file in your root folder:

### ✅ For **Windows**:

```json
{
  "deno.enable": true
}
```

### ✅ For macOS (installed via Homebrew):

```json
{
  "deno.enable": true,
  "deno.importMap": "./deno.json",
  "deno.path": "/opt/homebrew/bin/deno"
}
```

#### 💡 To confirm your Deno path on macOS, run:

```bash
which deno
```

📝 **License**

> This project intends to use the **MIT License**, but it has not been formally licensed yet.

