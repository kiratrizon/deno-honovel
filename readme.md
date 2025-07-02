# Honovel Deno

Welcome to **Honovel Deno** — a Laravel-inspired web framework powered by [Hono](https://hono.dev) and [Deno](https://deno.com).

---

## ✨ Features

- 🏗 Laravel-like project structure and routing  
- ⚡ Powered by the ultra-fast [Hono](https://hono.dev) framework  
- 📦 Native TypeScript runtime via [Deno](https://deno.com)  
- 🧩 Domain-based routing, middleware support, migrations, and more  
- 🔁 Built-in task runner and project scaffolding

---

### 🚀 How to Setup

1. **Installation**

- Install Deno first, refer the installation [here](https://docs.deno.com/runtime/getting_started/installation/). -- skip this if you already have Deno Runtime

```bash
deno -A https://honovel.deno.dev/create-project <project-name>@<version>
```

#### 🛠 VS Code Setup for Deno

To enable proper Deno types and IntelliSense in **VS Code**, create a `.vscode/settings.json` file in your root folder:

```json
{
  "deno.enable": true,
  "deno.importMap": "./deno.json",
  "deno.path": "/opt/homebrew/bin/deno"
}
```

###### 💡 To confirm your Deno path, open command terminal and run:

```bash
# for MacOS / Linux
which deno

# for Windows
where deno
```


📝 **License**

> This project intends to use the **MIT License**, but it has not been formally licensed yet.

