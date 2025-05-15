# CUCM SOAP to REST API - Using the File-Based Examples System

## Overview

The API now uses a file-based examples system that makes it easy to add, modify, and manage examples for different resources and methods. This document explains how to use this system.

## Directory Structure

Examples are stored in a hierarchical structure under `src/examples/`:

```
src/examples/
├── generic/           # Generic fallback examples for any resource
│   ├── put/           # PUT method generic examples
│   │   └── default.json
│   ├── patch/         # PATCH method generic examples
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

To add an example for a specific resource and method:

1. Create a JSON file in the appropriate directory, e.g., `src/examples/resources/phone/put/my-example.json`
2. Use the following format:

```json
{
  "summary": "Short title for the example",
  "description": "Longer description explaining the example's purpose",
  "value": {
    "phone": {
      "name": "SEP001122334455",
      "description": "Example phone configuration",
      "product": "Cisco 8845",
      "class": "Phone",
      "protocol": "SIP"
    }
  }
}
```

## Example Discovery Process

When the API needs to display examples for a resource, it looks in this order:

1. Resource-specific examples (`resources/line/put/*.json`)
2. Generic examples (`generic/put/*.json`)
3. Hardcoded default examples

This allows for flexibility and customization without modifying code.

## Working with Template Variables

Examples can include template variables for dynamic content substitution:

```json
{
  "summary": "Add Line - With template variables",
  "description": "Shows how to use template variables for dynamic values",
  "value": {
    "line": {
      "pattern": "%%_number_%%",
      "description": "Line for %%_username_%%",
      "alertingName": "%%_username_%%",
      "_data": {
        "number": "1001",
        "username": "Example User"
      }
    }
  }
}
```

## Benefits of File-Based Examples

- No code changes needed to add or modify examples
- Clear separation between code and documentation
- Easy to maintain and update
- Multiple examples can be added for each resource/method
- Examples can be customized for specific deployment needs