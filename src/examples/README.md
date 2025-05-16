# API Examples System

This directory contains JSON examples for the Swagger API documentation. Examples are organized by resource type and HTTP method.

## Directory Structure

```
src/examples/
├── generic/           # Generic fallback examples for any resource
│   ├── post/          # POST (add) operations
│   ├── patch/         # PATCH (update) operations
│   └── ...
└── resources/         # Resource-specific examples
    ├── line/          # Line resource examples
    │   ├── post/      # POST (add) operations
    │   ├── patch/     # PATCH (update) operations
    │   └── ...
    ├── phone/         # Phone resource examples
    └── ...
```

## How to Add Examples

### Adding a New Resource Example

1. Create the appropriate folders if they don't exist:
   ```
   mkdir -p src/examples/resources/my-resource/post
   mkdir -p src/examples/resources/my-resource/patch
   ```

2. Create JSON files in these directories with this format:
   ```json
   {
     "summary": "Short descriptive title",
     "description": "Longer explanation of what this example shows",
     "value": {
       "resourceName": {
         "property1": "value1",
         "property2": "value2"
       }
     }
   }
   ```

3. Important notes:
   - For POST operations (adding resources), include the resource wrapper
   - For PATCH operations (updating resources), omit the resource wrapper
   - File names can be anything with a `.json` extension (e.g., `basic.json`, `with-template.json`, etc.)
   - Multiple examples for the same resource/method are displayed in alphabetical order by filename

### Example: Adding a Phone Example for POST

Create a file at `src/examples/resources/phone/post/special-config.json`:

```json
{
  "summary": "Add Phone with Special Configuration",
  "description": "Example showing how to add a phone with special settings",
  "value": {
    "phone": {
      "name": "SEP001122334455",
      "description": "Special configuration phone",
      "product": "Cisco 8845",
      "class": "Phone",
      "protocol": "SIP",
      "protocolSide": "User",
      "devicePoolName": "Default",
      "locationName": "Hub_None",
      "sipProfileName": "Standard SIP Profile",
      "commonPhoneConfigName": "Standard Common Phone Profile",
      "useTrustedRelayPoint": "Default"
    }
  }
}
```

### Using Template Variables

Examples can include template variables with an `_data` object:

```json
{
  "summary": "Add Line with Variables",
  "description": "Example using template variables for dynamic content",
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

Variables are formatted as `%%_variable_%%` and replaced with values from the `_data` object.

## Adding Generic Examples

Generic examples are used when resource-specific examples aren't available:

1. Create a file in the appropriate generic folder:
   ```
   src/examples/generic/post/my-example.json
   ```

2. Use this format:
   ```json
   {
     "summary": "Generic Example Title",
     "description": "Description of this generic example",
     "value": {
       "resourceTag": {
         "property1": "value1",
         "property2": "value2"
       }
     }
   }
   ```

3. The special key `resourceTag` will be replaced with the appropriate resource name.

## Example Discovery

The system looks for examples in this order:
1. Resource-specific examples (`resources/line/post/*.json`)
2. Generic examples (`generic/post/*.json`)
3. Hardcoded default examples

This means you can override the default examples by adding your own in the appropriate directory.

## Using with Docker

When running the API in Docker, the examples directory is mounted as a volume, allowing you to add or modify examples without rebuilding the container.

1. Create the examples directory structure in your Docker directory:
   ```
   mkdir -p docker/examples/resources/line/post
   ```

2. Add your custom example files in these directories:
   ```
   vim docker/examples/resources/line/post/my-custom-example.json
   ```

3. The Docker Compose files automatically mount the `examples` directory to the container, making your custom examples available immediately.

4. **Note on reloading:** The examples are read from disk each time they're requested, so new examples are picked up immediately without requiring a container restart.

## Auto-Saving Examples

The API can automatically save both API requests and Method Explorer parameters as examples:

### API Request Auto-Saving

1. Enable the feature by setting the environment variable:
   ```
   # In your .env file or directly in docker-compose.yml
   AUTO_SAVE_EXAMPLES=true
   ```

2. When enabled, every successful API request will be saved as an example file:
   - Method name becomes the filename (e.g., `addline.json`)
   - Examples are automatically placed in the correct folder based on resource and HTTP method
   - The API response includes metadata indicating that the example was saved in an `_meta` field
   - For string/primitive responses, the result is wrapped in a `result` property

### Method Explorer Auto-Saving

1. Enable the feature by setting the environment variable:
   ```
   # In your .env file or directly in docker-compose.yml
   AUTO_SAVE_EXPLORER=true
   ```

2. When enabled, parameters viewed in the AXL Method Explorer will be saved:
   - Saved as `default.json` in the appropriate directory
   - Includes the complete structure returned by the AXL API
   - Automatically formatted for the correct HTTP method (e.g., wrapped in resource tag for post)
   - Useful for capturing default structures without making actual API calls

3. For instance, when viewing parameters for `addAppServerInfo`, a file will be created at:
   ```
   examples/resources/appserverinfo/post/default.json
   ```

These auto-saving features help you build a comprehensive library of examples as you use the API and explore the AXL methods.