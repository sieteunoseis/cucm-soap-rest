# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a dynamic REST API built with Express and TypeScript that provides a RESTful interface to the Cisco Administrative XML (AXL) SOAP-based API. The API automatically maps AXL operations to appropriate HTTP methods based on their naming patterns and provides Swagger documentation.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot-reloading
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Configuration

The application requires a `.env` file in the root directory with the following variables:

```
CUCM_HOST=your-cucm-server
CUCM_USER=your-username
CUCM_PASS=your-password
CUCM_VERSION=14.0  # AXL API version
PORT=3000
DATACONTAINERIDENTIFIERTAILS=_data
```

## Architecture

### Core Components

1. **Dynamic Route Generation**
   - The application dynamically creates RESTful endpoints for all AXL operations
   - HTTP methods are intelligently mapped based on AXL operation naming (e.g., `getPhone` → GET, `addPhone` → PUT)

2. **AXL Operation Handling**
   - All AXL operations are processed through a single controller function
   - Request data is transformed into the appropriate structure for AXL

3. **Swagger Documentation**
   - Swagger documentation is automatically generated for all endpoints
   - The API provides three ways to access docs: Swagger UI, static HTML, and raw JSON

### Method Mapping Convention

| AXL Operation Pattern | HTTP Method | Example Endpoint          |
|-----------------------|------------|---------------------------|
| `get*`                | GET        | `/api/axl/phone/{uuid}`     |
| `list*`               | GET        | `/api/axl/phones`         |
| `add*`                | PUT        | `/api/axl/phone`          |
| `update*`             | PATCH      | `/api/axl/phone/{uuid}`     |
| `remove*`/`delete*`   | DELETE     | `/api/axl/phone/{uuid}`     |
| Other                 | POST       | `/api/axl/customoperation`|

### Request/Response Flow

1. Client makes an HTTP request to a mapped endpoint
2. Express routes the request to the dynamic controller
3. The controller transforms the request into an appropriate AXL operation format
4. The cisco-axl package executes the SOAP request to CUCM
5. The response is transformed back to JSON and returned to the client

### Error Handling

The application includes standardized error handling that provides appropriate HTTP status codes:
- 400 - Bad Request (missing parameters)
- 401 - Unauthorized (invalid credentials)
- 404 - Not Found (resource doesn't exist)
- 409 - Conflict (resource already exists)
- 500 - Internal Server Error

### Important Files

- `src/index.ts`: Application entry point, Express setup, and Swagger config
- `src/controllers/dynamic.controller.ts`: Dynamic route generation and AXL operation execution
- `src/utils/method-mapper.ts`: Maps AXL methods to HTTP methods and routes
- `src/utils/swagger.ts`: Swagger configuration and documentation
- `src/middleware/error.middleware.ts`: Centralized error handling
- `src/config/axl.config.ts`: Configuration for the Cisco AXL connection