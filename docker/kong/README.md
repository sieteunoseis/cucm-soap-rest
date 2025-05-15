# CUCM SOAP to REST with Kong API Gateway

This directory contains Docker configurations for running the CUCM SOAP to REST API with Kong API Gateway for enhanced security, rate limiting, and management.

## Quick Setup

You can download and use these configuration files directly without cloning the entire repository.

### Download Configuration Files

```bash
# Create directories
mkdir -p cucm-soap-rest/docker/kong
cd cucm-soap-rest/docker/kong

# Download Kong configuration files
wget https://raw.githubusercontent.com/sieteunoseis/cucm-soap-rest/master/docker/kong/docker-compose.yml
wget https://raw.githubusercontent.com/sieteunoseis/cucm-soap-rest/master/docker/kong/kong.yml
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

## Usage

Start the Kong Gateway and API service:

```bash
docker-compose up -d
```

## Access Points

- API Gateway: http://localhost:8000
- Swagger UI: http://localhost:8000/
- API Explorer: http://localhost:8000/api-explorer
- API Endpoints: http://localhost:8000/api/axl/...

## Kong Gateway Features

The Kong configuration provides:

1. **Authentication**: API Key authentication (keys: `x-api-key` or `apikey`)
2. **Rate Limiting**: Prevents excessive requests to protect CUCM AXL
   - 5 requests/second
   - 60 requests/minute
   - 1,000 requests/hour
3. **Request Size Limiting**: 2MB max payload size
4. **Caching**: Improves performance for repeated requests
5. **Consumer Management**: Different user tiers with varied permissions

## API Keys

The default configuration includes two API keys:
- Regular user: `your-secret-api-key`
- Power user (higher rate limits): `power-user-api-key`

**Important**: Modify these default keys in the `kong.yml` file before deploying to production!

## Customization

Edit `kong.yml` to modify:
- Routes and paths
- Rate limits
- Authentication requirements
- Cache settings
- API keys

## Troubleshooting

If you encounter issues:
1. Check container logs: `docker logs kong-api-gateway`
2. Verify CUCM connectivity: `docker logs cucm-rest-api`
3. Ensure API keys are correctly configured in requests