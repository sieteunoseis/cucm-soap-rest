# Dynamic REST API for Cisco AXL SOAP operations

A dynamic REST API built with Express and TypeScript that provides a RESTful interface to the Cisco Administrative XML (AXL) SOAP-based API. The API automatically maps AXL operations to appropriate HTTP methods based on their naming patterns and provides Swagger documentation.

## Features

- **Dynamic Route Generation**: Automatically creates RESTful endpoints for all AXL operations
- **Intelligent HTTP Method Mapping**: Maps AXL operations to HTTP methods (e.g., `getPhone` → GET, `addPhone` → PUT)
- **Swagger Documentation**: Auto-generated API documentation with interactive UI
- **AXL Operation Support**: Supports all AXL operations available in your CUCM version
- **Template Variables**: Support for JSON template variables using the `%%_variable_%%` syntax with `_data` field
- **Cisco Branding**: Includes Cisco favicon and logo in the UI

## Development

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher
- Cisco CUCM server with AXL service enabled
- Docker (optional, for containerized deployment)

### Setup

1. Clone the repository

```bash
git clone <repository-url>
cd cucm-soap-rest
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
CUCM_HOST=your-cucm-server
CUCM_USER=your-username
CUCM_PASS=your-password
CUCM_VERSION=14.0  # AXL API version
PORT=3000
DATACONTAINERIDENTIFIERTAILS=_data  # Identifier for json-variables template fields
DEBUG=false  # Enable/disable debug logging (set to true, false, or comma-separated scopes)

# API Gateway settings (optional)
USE_API_KEY=true  # Enable API key authentication
API_KEY_NAME=x-api-key  # Header or query parameter name for the API key
API_KEY_LOCATION=header  # Location of the API key (header or query)
DEV_API_KEY=cisco-axl-rest-api-dev-key  # Development API key for testing
```

### Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot-reloading
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Build Docker image
docker build -t cucm-soap-rest .

# Run with Docker
docker run -p 3000:3000 --env-file .env cucm-soap-rest

# Run with Docker Compose
docker-compose up
```

### Version Management

The project includes scripts to help manage versioning consistently across package.json and the Swagger API documentation:

```bash
# Increment patch version (e.g., 1.7.0 -> 1.7.1)
npm run version:patch

# Increment minor version (e.g., 1.7.0 -> 1.8.0)
npm run version:minor

# Increment major version (e.g., 1.7.0 -> 2.0.0)
npm run version:major

# Set a specific version
node scripts/bump-version.js 1.9.0
```

These commands automatically:
1. Update the version in package.json
2. Rebuild the project to update the Swagger documentation
3. Suggest git commands to commit the changes

Choose the appropriate command based on the changes made:
- `version:patch` - For bug fixes and small changes that don't affect the API
- `version:minor` - For new features or non-breaking changes
- `version:major` - For breaking changes to the API

## API Documentation

The API documentation is available at:

- `/api-explorer` - Interactive API documentation with Swagger UI
- `/api-docs.json` - Raw JSON documentation

## Debug Logging

The application includes a configurable debug logging system that helps with troubleshooting and development. Debug logs can be enabled or disabled via the `DEBUG` environment variable.

### Configuring Debug Logs

Set the `DEBUG` environment variable to control log output:

```
# In .env file or environment variables
# Enable all debug logs
DEBUG=true

# Disable all debug logs
DEBUG=false

# Enable specific log scopes
DEBUG=axl,routes,swagger
```

### Available Log Scopes

- `axl` - AXL API operations and SOAP requests
- `swagger` - Swagger documentation generation
- `routes` - API route setup and registration
- `axl-meta` - AXL metadata operations (listing available methods)

### Examples

```bash
# Enable all debug logs for development
DEBUG=true npm run dev

# Enable only AXL operation logs
DEBUG=axl npm run dev

# Enable multiple specific scopes
DEBUG=axl,routes npm run dev

# Disable all debug logs for production
DEBUG=false npm start
```

When debugging is enabled, the application will output detailed information to the console about API operations, requests, responses, and internal processes.

## Template Variables

This API supports template variables in JSON payloads using the [json-variables](https://www.npmjs.com/package/json-variables) library. This allows you to define variables once and reuse them throughout your request payload.

### How to Use Template Variables

1. Use the `%%_variable_%%` syntax in any string value where you want to insert a variable
2. Add a `_data` object containing your variable values
3. The API will automatically process and replace the variables before sending to CUCM

### Example JSON

```json
{
  "pattern": "%%_extension_%%",
  "routePartitionName": "INTERNAL-PT",
  "alertingName": "%%_firstName_%% %%_lastName_%%",
  "asciiAlertingName": "%%_firstName_%% %%_lastName_%%",
  "description": "%%_firstName_%% %%_lastName_%%",
  "_data": {
    "extension": "3000",
    "firstName": "Tom",
    "lastName": "Smith"
  }
}
```

If you need to use a pattern with a plus sign (like an E.164 number format), use the backslash-escaped format in the \_data object. The template processor will handle it correctly:

```json
{
  "pattern": "%%_extension_%%",
  "routePartitionName": "INTERNAL-PT",
  "alertingName": "%%_firstName_%% %%_lastName_%%",
  "asciiAlertingName": "%%_firstName_%% %%_lastName_%%",
  "description": "%%_firstName_%% %%_lastName_%%",
  "_data": {
    "extension": "\\+13758084002",
    "firstName": "Tom",
    "lastName": "Smith"
  }
}
```

In this example, the payload will be processed to replace all occurrences of `%%_extension_%%`, `%%_firstName_%%`, and `%%_lastName_%%` with their respective values from the `_data` object. The `_data` field will be automatically removed before sending to the AXL API.

Note: This example is for an updateLine operation, but the same principles apply to other operations as well.

### Important Notes

1. When using template variables, ensure your JSON is properly formatted
2. For phone numbers with + signs (E.164 format), use a backslash-escaped format like `\\+13758084002`
3. Use valid values that match your CUCM configuration (like partition names)
4. The template processor will handle JSON escaping and properly format the output for CUCM

### Curl Example

```bash
# Basic example
curl -X 'PATCH' \
  'http://localhost:3000/api/axl/line' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "pattern": "%%_extension_%%",
    "routePartitionName": "INTERNAL-PT",
    "alertingName": "%%_firstName_%% %%_lastName_%%",
    "asciiAlertingName": "%%_firstName_%% %%_lastName_%%",
    "description": "%%_firstName_%% %%_lastName_%%",
    "_data": {
      "extension": "13758084002",
      "firstName": "Tom",
      "lastName": "Smith"
    }
  }'

# Example with E.164 format (including escaped plus sign)
curl -X 'PATCH' \
  'http://localhost:3000/api/axl/line' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "pattern": "%%_extension_%%",
    "routePartitionName": "INTERNAL-PT",
    "alertingName": "%%_firstName_%% %%_lastName_%%",
    "asciiAlertingName": "%%_firstName_%% %%_lastName_%%",
    "description": "%%_firstName_%% %%_lastName_%%",
    "_data": {
      "extension": "\\+13758084002",
      "firstName": "Tom",
      "lastName": "Smith"
    }
  }'
```

## Docker Deployment

This project includes Docker support for easy deployment. The included Dockerfile uses a multi-stage build process to create an optimized production image.

### Kong API Gateway Integration

The application can be deployed behind Kong API Gateway for enhanced security and API management:

```bash
# Start the API with Kong Gateway
cd docker/kong
docker-compose up -d
```

Kong is configured in DB-less mode with the following features:
- API key authentication for API endpoints (while keeping Swagger UI accessible)
- Rate limiting protection (optional)
- Request size limits
- CORS handling

To enable API key authentication in the application:

1. Set the environment variables in your `.env` file:
```
USE_API_KEY=true
API_KEY_NAME=x-api-key
API_KEY_LOCATION=header
DEV_API_KEY=cisco-axl-rest-api-dev-key  # Development API key for testing
```

2. Configure your API key in the Kong configuration file (`docker/kong/kong.yml`):
```yaml
consumers:
  - username: api-user
    keyauth_credentials:
      - key: your-secret-api-key  # Replace with your actual API key
```

3. When making API requests, include your API key in the header:
```
x-api-key: your-secret-api-key
```

For development and testing, you can use the development API key defined in the DEV_API_KEY environment variable:
```
x-api-key: cisco-axl-rest-api-dev-key
```

The Swagger UI will automatically show the API key requirements, include the authentication field when API key auth is enabled, and display the development API key for easier testing.

Example curl commands with API key authentication:

```bash
# Using API key in header (default)
curl -X GET 'http://localhost:3000/api/axl/phone/name/SEP001122334455' \
  -H 'accept: application/json' \
  -H 'x-api-key: cisco-axl-rest-api-dev-key'

# Using API key in query parameter (if API_KEY_LOCATION=query)
curl -X GET 'http://localhost:3000/api/axl/phone/name/SEP001122334455?x-api-key=cisco-axl-rest-api-dev-key' \
  -H 'accept: application/json'

# Check health endpoint with dev key information
curl -X GET 'http://localhost:3000/health?includeDevKey=true'
```

### Using Docker

```bash
# Build the Docker image
docker build -t cucm-soap-rest .

# Run the container
docker run -p 3000:3000 --env-file .env cucm-soap-rest
```

### Using Docker Compose

For easier configuration management, you can use Docker Compose. Two compose files are provided:

- `docker-compose.yml` - Uses the GitHub Container Registry image with a local `.env` file
- `docker-compose.prod.yml` - Uses the GitHub Container Registry image with environment variables

```bash
# Start the application (development - uses local .env file)
docker-compose up -d

# Start the application (production - uses environment variables)
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### GitHub Actions

This repository includes a GitHub Actions workflow that automatically builds and publishes a Docker image to GitHub Container Registry whenever changes are pushed to the master branch.

To use the published image:

```bash
# Pull the latest image
docker pull ghcr.io/sieteunoseis/cucm-soap-rest:latest

# Run the container with .env file
docker run -p 3000:3000 --env-file .env ghcr.io/sieteunoseis/cucm-soap-rest:latest

# Or run the container with environment variables
docker run -p 3000:3000 \
  -e CUCM_HOST=your-cucm-server \
  -e CUCM_USER=your-username \
  -e CUCM_PASS=your-password \
  -e CUCM_VERSION=14.0 \
  -e DATACONTAINERIDENTIFIERTAILS=_data \
  -e DEBUG=false \
  -e USE_API_KEY=true \
  -e API_KEY_NAME=x-api-key \
  -e API_KEY_LOCATION=header \
  -e DEV_API_KEY=cisco-axl-rest-api-dev-key \
  ghcr.io/sieteunoseis/cucm-soap-rest:latest
```

## License

MIT
