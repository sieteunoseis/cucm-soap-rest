// Examples for resource name handling

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
    description: "",
    members: {
      member: {
        routePartitionName: "",
        index: ""
      }
    },
    partitionUsage: "",
    name: "AXL-REST-API-CSS"
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

export const lineExample = {
  line: {
    pattern: "%%_extension_%%",
    routePartitionName: "INTERNAL-PT",
    alertingName: "%%_firstName_%% %%_lastName_%%",
    asciiAlertingName: "%%_firstName_%% %%_lastName_%%",
    description: "%%_firstName_%% %%_lastName_%%",
    _data: {
      extension: "+13758084002", // We can now safely use + signs in template variables
      firstName: "Tom",
      lastName: "Smith"
    }
  }
};

/**
 * Returns examples for specific resource types
 */
export function getExampleForResource(resourceUrlPath: string): any {
  // Map common URL paths to their proper resource tags
  let resourceTag = '';

  const resourceLower = resourceUrlPath.toLowerCase();

  // Mapping of URL path names to actual resource tags
  const resourceMappings: {[key: string]: string} = {
    'routepartition': 'routePartition',
    'phone': 'phone',
    'css': 'css',
    'callpickupgroup': 'callPickupGroup',
    'linegroup': 'lineGroup',
    'huntlist': 'huntList',
    'huntpilot': 'huntPilot',
    'devicepool': 'devicePool',
    'phonebuttontemplate': 'phoneButtonTemplate',
    'line': 'line',
  };
  
  // Get the correct camelCase resource tag (default to resourceUrlPath if not found)
  resourceTag = resourceMappings[resourceLower] || resourceLower;

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
  
  if (resourceLower === 'line') {
    return {
      example1: {
        summary: "With line key and json-variables",
        value: lineExample
      },
      example2: {
        summary: "Without resource key wrapper",
        value: lineExample.line
      }
    };
  }

  // Default generic example
  return {
    example1: {
      summary: "With correct camelCase key",
      value: {
        [resourceTag]: {
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