# CUCM SOAP to REST API Examples

This document provides examples of how to use the CUCM SOAP to REST API, including details on proper resource name handling.

## Resource Name Case Sensitivity

IMPORTANT: Resource names in CUCM are case-sensitive. You must use the exact camelCase format (e.g., `routePartition` not `routepartition`) for the resource names.

### Example 1: CamelCase Resource Names

**Resource**: Route Partition (camelCase in CUCM: `routePartition`)  
**Endpoint**: `POST /api/axl/routepartition`

#### Request Body - With camelCase Key:

```json
{
  "routePartition": {
    "name": "AXL-REST-API-PT",
    "description": "Test using the REST API endpoint.",
    "timeScheduleIdName": "",
    "useOriginatingDeviceTimeZone": "true",
    "timeZone": "",
    "partitionUsage": ""
  }
}
```

**Result**: Request body is used as-is because it already contains the correct `routePartition` tag with proper camelCase.

#### Request Body - Incorrect Casing (will NOT work):

```json
{
  "routepartition": {
    "name": "AXL-REST-API-PT",
    "description": "Test using the REST API endpoint.",
    "timeScheduleIdName": "",
    "useOriginatingDeviceTimeZone": "true",
    "timeZone": "",
    "partitionUsage": ""
  }
}
```

**Result**: This request will NOT work correctly as is. The API will wrap this in another layer: `{ "routePartition": { "routepartition": { ... } } }`

### Example 2: Request Without Resource Wrapper

**Endpoint**: `POST /api/axl/routepartition`

#### Request Body - Without Resource Key:

```json
{
  "name": "AXL-REST-API-PT",
  "description": "Test using the REST API endpoint.",
  "timeScheduleIdName": "",
  "useOriginatingDeviceTimeZone": "true",
  "timeZone": "",
  "partitionUsage": ""
}
```

**Result**: Request body is automatically wrapped with the appropriate resource key:

```json
{
  "routePartition": {
    "name": "AXL-REST-API-PT",
    "description": "Test using the REST API endpoint.",
    "timeScheduleIdName": "",
    "useOriginatingDeviceTimeZone": "true",
    "timeZone": "",
    "partitionUsage": ""
  }
}
```

## Other Common Resources with CamelCase Names

Several CUCM resources use camelCase naming. Here are some common examples:

- Phone operations: `addPhone`, `updatePhone`, `getPhone` (resource name: `phone`)
- Line operations: `addLine`, `updateLine`, `getLine` (resource name: `line`)
- CSS operations: `addCss`, `updateCss`, `getCss` (resource name: `css`)
- Route Partition: `addRoutePartition`, `updateRoutePartition` (resource name: `routePartition`)
- Call Pickup Group: `addCallPickupGroup` (resource name: `callPickupGroup`)
- Line Group: `addLineGroup` (resource name: `lineGroup`)
- Hunt List: `addHuntList` (resource name: `huntList`)
- Hunt Pilot: `addHuntPilot` (resource name: `huntPilot`)

## API Method Mapping

| AXL Operation Pattern | HTTP Method | Example Endpoint          |
|-----------------------|------------|---------------------------|
| `get*`                | GET        | `/api/axl/phone/{id}`     |
| `list*`               | GET        | `/api/axl/phones`         |
| `add*`                | POST        | `/api/axl/phone`          |
| `update*`             | PATCH      | `/api/axl/phone/{id}`     |
| `remove*`/`delete*`   | DELETE     | `/api/axl/phone/{id}`     |
| Other                 | POST       | `/api/axl/customoperation`|