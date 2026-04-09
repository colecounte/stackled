# stackled

A CLI tool that monitors your web app's dependency health and surfaces breaking changes before they hit production.

## Installation

```bash
npm install -g stackled
```

Or use with npx:

```bash
npx stackled
```

## Usage

Initialize stackled in your project:

```bash
stackled init
```

Run a dependency health check:

```bash
stackled check
```

Monitor for breaking changes:

```bash
stackled watch --notify
```

### Example Output

```
✓ Checking 47 dependencies...
⚠ 3 packages have available updates with breaking changes:
  
  • react: 17.0.2 → 18.2.0 (major)
    Breaking: New root API, automatic batching changes
  
  • webpack: 4.46.0 → 5.75.0 (major)
    Breaking: Module federation, persistent caching changes
  
  • eslint: 7.32.0 → 8.36.0 (major)
    Breaking: New config system, removed formatters

✓ 12 packages have safe updates available
```

## Configuration

Create a `.stackledrc.json` file in your project root:

```json
{
  "ignore": ["package-name"],
  "notify": {
    "slack": "webhook-url",
    "email": "team@example.com"
  }
}
```

## License

MIT