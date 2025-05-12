// Examples for case-insensitive resource name handling

/**
 * Example request bodies for different resources
 */
export const routePartitionExample = {
  routePartition: {
    name: "AXL-REST-API-PT",
    description: "Test using the REST API endpoint.",
    timeScheduleIdName: "",
    useOriginatingDeviceTimeZone: "true",
    timeZone: "",
    partitionUsage: ""
  }
};

export const cssExample = {
  css: {
    name: "AXL-REST-API-CSS",
    description: "Test CSS using the REST API endpoint."
  }
};

export const phoneExample = {
  phone: {
    name: "SEP001122334455",
    description: "Test phone using the REST API endpoint.",
    product: "Cisco 8845",
    class: "Phone",
    protocol: "SIP",
    protocolSide: "User",
    devicePoolName: "Default",
    locationName: "Hub_None",
    sipProfileName: "Standard SIP Profile",
    commonPhoneConfigName: "Standard Common Phone Profile"
  }
};

/**
 * Returns examples for specific resource types
 */
export function getExampleForResource(resourceName: string): any {
  const resourceLower = resourceName.toLowerCase();
  
  if (resourceLower === 'routepartition') {
    return {
      // Case-sensitive key example
      example1: {
        summary: "With correct camelCase key",
        value: routePartitionExample
      },
      // Examples without wrapping
      example2: {
        summary: "Without resource key wrapper",
        value: routePartitionExample.routePartition
      }
    };
  }
  
  if (resourceLower === 'css') {
    return {
      example1: {
        summary: "With CSS key",
        value: cssExample
      },
      example2: {
        summary: "Without resource key wrapper",
        value: cssExample.css
      }
    };
  }
  
  if (resourceLower === 'phone') {
    return {
      example1: {
        summary: "With phone key",
        value: phoneExample
      },
      example2: {
        summary: "Without resource key wrapper",
        value: phoneExample.phone
      }
    };
  }
  
  // Default generic example
  return {
    example1: {
      summary: "With resource key wrapper",
      value: {
        [resourceName]: {
          "name": "Example-Name",
          "description": "Example created using the REST API"
        }
      }
    },
    example2: {
      summary: "Without resource key wrapper",
      value: {
        "name": "Example-Name",
        "description": "Example created using the REST API"
      }
    }
  };
}