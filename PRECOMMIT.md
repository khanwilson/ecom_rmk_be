# Pre-commit Hooks Setup

This project uses **Biome** for linting and formatting, and **TypeScript** for type checking, with **simple-git-hooks** to run checks before commits.

## Setup

The setup is already configured. After cloning the repository, run:

```bash
bun install
```

This will automatically install dependencies and set up git hooks via the `prepare` script.

## What Runs on Pre-commit

Before each commit, the following checks run automatically:

1. **Biome Lint & Format Check** (`bun run lint`)
   - Checks code style and formatting
   - Detects unused variables, imports, and other issues
   - Validates code quality rules

2. **TypeScript Type Checking** (`bun run typecheck`)
   - Checks type errors across all services (libs, identity, product)
   - Detects missing imports, wrong types, and type mismatches
   - Validates TypeScript compilation without emitting files

## Available Scripts

### Linting & Formatting

```bash
# Check for linting and formatting issues
bun run lint

# Auto-fix linting and formatting issues
bun run lint:fix

# Format code only
bun run format
```

### Type Checking

```bash
# Check types for all services
bun run typecheck

# Check types for specific service
bun run typecheck:libs
bun run typecheck:identity
bun run typecheck:product
```

### Manual Pre-commit Check

```bash
# Run the same checks as pre-commit hook
bun run pre-commit
```

## Skipping Hooks

If you need to skip the pre-commit hook (not recommended), you can:

```bash
# Skip hooks for a single commit
SKIP_SIMPLE_GIT_HOOKS=1 git commit -m "your message"

# Or set it in your environment
export SKIP_SIMPLE_GIT_HOOKS=1
```

## Configuration

- **Biome config**: `biome.json` - Contains linting and formatting rules
- **Git hooks config**: `package.json` → `simple-git-hooks` - Defines which hooks to run

## Troubleshooting

### Hook not running?

Make sure `simple-git-hooks` is installed and hooks are set up:

```bash
bun install
# or manually
bunx simple-git-hooks
```

### Too many linting errors?

Run auto-fix to resolve most issues:

```bash
bun run lint:fix
```

### Type errors?

Check which service has the error:

```bash
bun run typecheck:libs
bun run typecheck:identity
bun run typecheck:product
```

## What Gets Checked

### Biome Checks:
- ✅ Unused variables and imports
- ✅ Code style and formatting
- ✅ Suspicious code patterns
- ✅ Performance issues
- ✅ Best practices

### TypeScript Checks:
- ✅ Type errors
- ✅ Missing imports
- ✅ Type mismatches
- ✅ Unused types
- ✅ Compilation errors
