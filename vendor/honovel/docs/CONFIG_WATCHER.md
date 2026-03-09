# Config File Watcher

Automatically rebuilds `config/build/myConfig.ts` when any config file changes during development.

## Why?

Deno Deploy requires **static imports** and cannot use dynamic imports with variable strings. The `publish:config` command bundles all config files into a single file with static imports, making it compatible with Deno Deploy.

## Usage

### Start the Watcher

```bash
deno task watch:config
```

This will:
1. Run an initial build of `config/build/myConfig.ts`
2. Watch for changes in the `config/` directory
3. Automatically rebuild when you modify any `.ts` file in `config/`
4. Ignore changes in `config/build/` and `config/@types/`

### Development Workflow

**Option 1: Run alongside your dev server**
```bash
# Terminal 1
deno task watch:config

# Terminal 2
deno task dev
```

**Option 2: Use a process manager (recommended)**
```bash
# Install a process manager like `concurrently` or use `tmux`
npx concurrently "deno task watch:config" "deno task dev"
```

## What It Watches

✅ **Watched:**
- `config/app.ts`
- `config/database.ts`
- `config/auth.ts`
- ... any `.ts` file in `config/`

❌ **Ignored:**
- `config/build/*` (output directory)
- `config/@types/*` (type definitions)

## Output

When a file changes, you'll see:
```
📝 Detected changes in: database.ts
🔄 Config files changed, rebuilding...
✅ Config rebuilt successfully!
```

## Deployment

Before deploying to Deno Deploy, ensure `config/build/myConfig.ts` is up-to-date:

```bash
# Manual build
deno task smelt publish:config

# Or it's automatically built by the watcher!
```

## How It Works

1. Uses Deno's `Deno.watchFs()` to monitor the `config/` directory
2. Filters changes to only `.ts` files (excluding `build/` and `@types/`)
3. Runs `deno task smelt publish:config` on detected changes
4. Prevents concurrent rebuilds with a simple lock

## Troubleshooting

**Watcher not detecting changes?**
- Ensure you're editing files in the `config/` directory
- Check that files end with `.ts`
- Try restarting the watcher

**Build failing?**
- Check console output for errors
- Ensure all config files export a default value
- Manually run: `deno task smelt publish:config`

**Deploy still failing?**
- Verify `config/build/myConfig.ts` exists and is committed
- Check that your code imports from `configs/build/myConfig.ts` when `DENO_DEPLOYMENT_ID` is set
