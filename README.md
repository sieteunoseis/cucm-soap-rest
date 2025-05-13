# CUCM SOAP to REST API

A dynamic REST API built with Express and TypeScript that provides a RESTful interface to the Cisco Administrative XML (AXL) SOAP-based API. The API automatically maps AXL operations to appropriate HTTP methods based on their naming patterns and provides Swagger documentation.

## Features

- **Dynamic Route Generation**: Automatically creates RESTful endpoints for all AXL operations
- **Intelligent HTTP Method Mapping**: Maps AXL operations to HTTP methods (e.g., `getPhone` → GET, `addPhone` → PUT)
- **Swagger Documentation**: Auto-generated API documentation with interactive UI
- **AXL Operation Support**: Supports all AXL operations available in your CUCM version

## Development

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher
- Cisco CUCM server with AXL service enabled

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
```

## API Documentation

The API documentation is available at:

- `/api-explorer` - Interactive API documentation with Swagger UI
- `/api-docs.json` - Raw JSON documentation

## License

MIT