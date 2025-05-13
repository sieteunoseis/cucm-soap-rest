# CUCM SOAP to REST API

A dynamic REST API built with Express and TypeScript that provides a RESTful interface to the Cisco Administrative XML (AXL) SOAP-based API. The API automatically maps AXL operations to appropriate HTTP methods based on their naming patterns and provides Swagger documentation.

## Features

- **Dynamic Route Generation**: Automatically creates RESTful endpoints for all AXL operations
- **Intelligent HTTP Method Mapping**: Maps AXL operations to HTTP methods (e.g., `getPhone` → GET, `addPhone` → PUT)
- **Swagger Documentation**: Auto-generated API documentation with interactive UI
- **AXL Operation Support**: Supports all AXL operations available in your CUCM version
- **Template Variables**: Support for JSON template variables using the `%%_variable_%%` syntax with `_data` field

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
dataContainerIdentifierTails=_data  # Identifier for json-variables template fields
```

### Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot-reloading
npm run dev
# NOTE FOR CLAUDE: Do not run npm run dev as it's already running in the background

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

## API Documentation

The API documentation is available at:

- `/api-explorer` - Interactive API documentation with Swagger UI
- `/api-docs.json` - Raw JSON documentation

## Template Variables

This API supports template variables in JSON payloads using the [json-variables](https://www.npmjs.com/package/json-variables) library. This allows you to define variables once and reuse them throughout your request payload.

### How to Use Template Variables

1. Use the `%%_variable_%%` syntax in any string value where you want to insert a variable
2. Add a `_data` object containing your variable values
3. The API will automatically process and replace the variables before sending to CUCM

### Example JSON

```json
{
  "line": {
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
  }
}
```

If you need to use a pattern with a plus sign (like an E.164 number format), use the backslash-escaped format in the _data object. The template processor will handle it correctly:

```json
{
  "line": {
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
}
```

In this example, the payload will be processed to replace all occurrences of `%%_extension_%%`, `%%_firstName_%%`, and `%%_lastName_%%` with their respective values from the `_data` object. The `_data` field will be automatically removed before sending to the AXL API.

### Important Notes

1. When using template variables, ensure your JSON is properly formatted
2. For phone numbers with + signs (E.164 format), use a backslash-escaped format like `\\+13758084002`
3. Use valid values that match your CUCM configuration (like partition names)
4. The template processor will handle JSON escaping and properly format the output for CUCM

### Curl Example

```bash
# Basic example
curl -X 'PUT' \
  'http://localhost:3000/api/axl/line' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "line": {
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
  }
}'

# Example with E.164 format (including escaped plus sign)
curl -X 'PUT' \
  'http://localhost:3000/api/axl/line' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "line": {
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
}'
```

## Docker Deployment

This project includes Docker support for easy deployment. The included Dockerfile uses a multi-stage build process to create an optimized production image.

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
  ghcr.io/sieteunoseis/cucm-soap-rest:latest
```

## License

MIT