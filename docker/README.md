# CUCM SOAP to REST - Docker Setup

This directory contains Docker configurations for running the CUCM SOAP to REST API service.

## Quick Setup

You can download and use these Docker Compose files directly without cloning the entire repository.

### Download Configuration Files

```bash
# Create directory for the project
mkdir -p cucm-soap-rest/docker
cd cucm-soap-rest/docker

# Download docker-compose files
wget https://raw.githubusercontent.com/sieteunoseis/cucm-soap-rest/master/docker/docker-compose.yml
wget https://raw.githubusercontent.com/sieteunoseis/cucm-soap-rest/master/docker/docker-compose.prod.yml
```

### Create Environment File

Create a `.env` file in the directory with your CUCM credentials:

```bash
# .env file
CUCM_HOST=your-cucm-server.example.com
CUCM_USER=your-username
CUCM_PASS=your-password
CUCM_VERSION=12.5  # Use your CUCM version
```

## Usage Options

### Development Mode

```bash
docker-compose up
```

### Production Mode

The production configuration includes restart policy set to "always" for better reliability. This mode is suitable for production environments, however you need to secure the endpoint with HTTPS and authentication. If your environment is not secured, consider using the development mode or the Kong API Gateway integration example provided in the `kong` directory.

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration Details

Both configurations:
- Pull the latest image from GitHub Container Registry
- Map port 3000 to the host machine
- Configure the API with environment variables
- Mount the .env file as a volume (in dev mode)
- Mount the examples directory as a volume for customization

## Customizing API Examples

The Docker Compose configuration maps the `./examples` directory to allow customizing API documentation examples without rebuilding the container:

```bash
# Create examples directory structure
mkdir -p examples/resources/line/post

# Create a custom example for lines
cat > examples/resources/line/post/custom-example.json << 'EOF'
{
  "summary": "Add Custom Line Example",
  "description": "Example showing custom line configuration",
  "value": {
    "line": {
      "pattern": "\\+14155551234",
      "routePartitionName": "CUSTOM-PT",
      "alertingName": "Custom User",
      "description": "Custom line example"
    }
  }
}
EOF
```

New examples are picked up immediately without requiring a container restart, as they're read from disk each time they're requested.

If you want to use the examples provided in the repository, you can run the following command to copy them into the `examples` directory:

```bash
wget -q -O - https://api.github.com/repos/sieteunoseis/cucm-soap-rest/tarball/master | tar -xz --wildcards --strip=2 "*/src/examples"
```
This will download the latest examples from the repository and place them in the `examples` directory.

### Auto-Saving Examples

You can enable automatic saving of API requests and Method Explorer parameters as examples by setting the following environment variables:

```bash
# Add to your .env file
AUTO_SAVE_EXAMPLES=true   # Save API requests as examples
AUTO_SAVE_EXPLORER=true   # Save Method Explorer parameters as default examples
```

#### API Request Auto-Saving

When `AUTO_SAVE_EXAMPLES` is enabled, every successful API request will be saved as an example in the appropriate directory. For instance, if you use the API to add a line with `addLine`, the request will be automatically saved as an example in `examples/resources/line/post/addline.json`.

The API response will include metadata about the saved example:

```json
{
  "result": "uuid-1234-5678-abcd",
  "_meta": {
    "exampleSaved": true,
    "exampleMessage": "Saved example to .../examples/resources/line/post/addline.json"
  }
}
```

#### Method Explorer Auto-Saving

When `AUTO_SAVE_EXPLORER` is enabled, parameters fetched in the AXL Method Explorer will be automatically saved as `default.json` examples in the appropriate directory. For example, viewing the parameters for `addAppServerInfo` will save a `default.json` file in `examples/resources/appserverinfo/post/`.

The Method Explorer response will include metadata about the saved example:

```json
{
  "method": "addAppServerInfo",
  "parameters": { ... },
  "_meta": {
    "exampleSaved": true,
    "exampleMessage": "Saved explorer example to .../examples/resources/appserverinfo/post/default.json"
  }
}
```

These features make it easy to build up a comprehensive library of working examples as you use the API and explore the AXL methods.

### Refreshing Examples in Swagger UI

After examples are saved (either automatically or manually), you have several options to make them appear in the API documentation:

1. **Wait for restart**: The examples will be loaded the next time the application restarts.

2. **Manual refresh**: Call the refresh endpoint to regenerate the documentation:
   ```bash
   curl http://localhost:3000/api/debug/refresh-examples
   ```

3. **UI reload helper**: Visit the reload helper page which will automatically refresh the UI:
   ```
   http://localhost:3000/api/debug/reload-ui
   ```
   This provides a simple page that automatically redirects to the Swagger UI after regenerating the documentation.
   
4. **Complete workflow**: For the most reliable refresh experience:
   ```bash
   # First regenerate the examples
   curl http://localhost:3000/api/debug/refresh-examples
   
   # Then open the UI reload helper in your browser
   open http://localhost:3000/api/debug/reload-ui
   ```

## Advanced Usage

For Kong API Gateway integration, see the [kong directory](./kong/) for additional setup instructions.

## Service Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| CUCM_HOST | Hostname/IP of your CUCM server | `cucm.example.com` |
| CUCM_USER | AXL API username | `axluser` |
| CUCM_PASS | AXL API password | `password` |
| CUCM_VERSION | CUCM version for API compatibility | `12.5` |
| PORT | Service port (default: 3000) | `3000` |
| NODE_ENV | Environment setting | `production` |