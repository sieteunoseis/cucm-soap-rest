// Utility to map AXL method names to HTTP methods and routes

interface MethodMapping {
  httpMethod: 'get' | 'post' | 'put' | 'patch' | 'delete';
  route: string;
}

export function mapAxlMethodToHttp(axlMethod: string): MethodMapping {
  const methodLower = axlMethod.toLowerCase();
  
  // Default to POST if we can't determine the HTTP method
  let httpMethod: 'get' | 'post' | 'put' | 'patch' | 'delete' = 'post';
  let route = methodLower;
  
  // Map AXL method to HTTP method based on prefixes
  if (methodLower.startsWith('get') || methodLower.startsWith('list')) {
    httpMethod = 'get';

    // For list methods, create a plural route
    if (methodLower.startsWith('list')) {
      // Extract the resource name after "list"
      route = methodLower.replace('list', '').toLowerCase();

      // Ensure route has no invalid characters
      route = route.replace(/[^\w-]/g, '');

      // Make the route plural if it's not already
      if (!route.endsWith('s')) {
        route += 's';
      }
    } else if (methodLower.startsWith('get')) {
      // For get methods, create a singular route (same as before we added "get-" prefix)
      route = methodLower.replace('get', '').toLowerCase();

      // Ensure route has no invalid characters
      route = route.replace(/[^\w-]/g, '');
    }
  } else if (methodLower.startsWith('add')) {
    httpMethod = 'put';
    route = methodLower.replace('add', '').toLowerCase();
    // Ensure route has no invalid characters
    route = route.replace(/[^\w-]/g, '');
  } else if (methodLower.startsWith('update')) {
    httpMethod = 'patch';
    route = methodLower.replace('update', '').toLowerCase();
    // Ensure route has no invalid characters
    route = route.replace(/[^\w-]/g, '');
  } else if (methodLower.startsWith('remove') || methodLower.startsWith('delete')) {
    httpMethod = 'delete';
    route = methodLower
      .replace('remove', '')
      .replace('delete', '')
      .toLowerCase();
    // Ensure route has no invalid characters
    route = route.replace(/[^\w-]/g, '');
  }
  
  return { httpMethod, route };
}

// Function to extract resource name from AXL method with proper camelCase
export function getResourceFromMethod(axlMethod: string): string {
  // Extract resource name with correct case (for API endpoint path)
  const methodLower = axlMethod.toLowerCase();
  let resource = methodLower;

  // Remove common prefixes (lowercase)
  ['get', 'list', 'add', 'update', 'remove', 'delete'].forEach(prefix => {
    if (methodLower.startsWith(prefix)) {
      resource = methodLower.substring(prefix.length);
    }
  });

  // Convert to kebab-case for URL
  return resource
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

// Function to extract properly cased resource tag name from AXL method
export function getResourceTagFromMethod(axlMethod: string): string {
  // AXL operations are camelCase like addRoutePartition, getPhone, etc.
  // The resource tag should preserve camelCase: routePartition, phone, etc.

  // Extract just the resource name part with proper casing
  let resourceTag = '';

  // Common operation prefixes in AXL
  const prefixes = ['get', 'list', 'add', 'update', 'remove', 'delete'];

  // Find the prefix used in this method
  const prefix = prefixes.find(p => axlMethod.toLowerCase().startsWith(p));

  if (prefix && axlMethod.length > prefix.length) {
    // Extract the resource name, preserving case
    resourceTag = axlMethod.substring(prefix.length);
  } else {
    resourceTag = axlMethod;
  }

  // Keep the correct case but ensure first letter is lowercase
  // (converts "RoutePartition" to "routePartition" while preserving internal caps)
  if (resourceTag.length > 0) {
    resourceTag = resourceTag.charAt(0).toLowerCase() + resourceTag.substring(1);
  }

  return resourceTag;
}