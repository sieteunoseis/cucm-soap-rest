# API Examples System

The CUCM SOAP to REST API provides a flexible, file-based examples system for API documentation. This allows for easy customization and addition of new examples without modifying code.

## Refreshing Examples in Swagger UI

When you add or modify example files, you have a few options to see them in the UI:

1. **Automatic Refresh**: If `AUTO_SAVE_EXAMPLES` or `AUTO_SAVE_EXPLORER` is enabled, the Swagger documentation will be regenerated whenever the application starts.

2. **Manual Refresh**: You can manually refresh the examples by calling either:
   ```
   GET /api/debug/refresh-examples
   ```
   This will regenerate the Swagger documentation with all current examples from the filesystem.

3. **Complete UI Reload**: For the most reliable refresh, visit:
   ```
   GET /api/debug/reload-ui
   ```
   This provides a page that will automatically reload the Swagger UI after a brief delay, ensuring all examples are freshly loaded.

### Refresh Workflow

For the most reliable experience, follow this workflow when saving new examples:

1. Save your example files to the filesystem
2. Call `/api/debug/refresh-examples` to regenerate the Swagger documentation
3. Visit `/api/debug/reload-ui` to reload the Swagger UI
4. Your new examples will now be visible

## Example Structure

Examples are stored in JSON files under the `src/examples` directory, organized by resource type and HTTP method:

```
src/examples/
├── generic/           # Generic examples for any resource
│   ├── put/
│   │   └── default.json
│   ├── patch/
│   │   └── default.json
│   └── ...
└── resources/         # Resource-specific examples
    ├── line/          # Line resource examples
    │   ├── put/       # Examples for PUT (add) operations
    │   │   ├── basic.json
    │   │   └── with-template.json
    │   ├── patch/     # Examples for PATCH (update) operations
    │   │   ├── basic.json
    │   │   └── with-template.json
    │   └── ...
    ├── phone/         # Phone resource examples
    │   ├── put/
    │   ├── patch/
    │   └── ...
    └── ...
```

## Adding New Examples

To add a new example:

1. Create a JSON file in the appropriate directory (based on resource and HTTP method)
2. Follow the example format:

```json
{
  "summary": "Short description of the example",
  "description": "Longer description explaining usage details",
  "value": {
    "resource": {
      "field1": "value1",
      "field2": "value2"
    }
  }
}
```

For PUT operations, remember to include the resource wrapper (e.g., `"line": {...}`).

## Example Discovery Process

When generating API documentation, the system looks for examples in this order:

1. Resource-specific examples (e.g., `/resources/line/put/*.json`)
2. Generic examples (e.g., `/generic/put/*.json`)
3. Hardcoded fallback examples

This allows you to override the default examples with your own custom ones.

## Template Variables

Examples can include template variables for dynamic content:

```json
{
  "line": {
    "pattern": "%%_number_%%",
    "description": "Line for %%_username_%%",
    "_data": {
      "number": "1001",
      "username": "Example User"
    }
  }
}
```

These templates demonstrate how to use the substitution system in the API.

## Generic Examples

For new resource types without specific examples, the system provides generic examples that demonstrate the proper format for common operations.