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
    partitionUsage: "",
  },
};

export const cssExample = {
  css: {
    description: "",
    members: {
      member: {
        routePartitionName: "",
        index: "",
      },
    },
    partitionUsage: "",
    name: "AXL-REST-API-CSS",
  },
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
    commonPhoneConfigName: "Standard Common Phone Profile",
  },
};

export const lineExample = {
  line: {
    pattern: "\\+13758084002",
    routePartitionName: "INTERNAL-PT",
    alertingName: "Tom Smith",
    asciiAlertingName: "Tom Smith",
    description: "Tom Smith",
  },
};

export const lineExampleWithoutWrapper = {
  pattern: "\\+13758084002",
  routePartitionName: "INTERNAL-PT",
  alertingName: "Tom Smith",
  asciiAlertingName: "Tom Smith",
  description: "Tom Smith",
};

/**
 * Returns examples for specific resource types
 */
export function getExampleForResource(resourceUrlPath: string, httpMethod: string = "put"): any {
  // Map common URL paths to their proper resource tags
  let resourceTag = "";

  const resourceLower = resourceUrlPath.toLowerCase();

  // Mapping of URL path names to actual resource tags
  const resourceMappings: { [key: string]: string } = {
    routepartition: "routePartition",
    phone: "phone",
    css: "css",
    callpickupgroup: "callPickupGroup",
    linegroup: "lineGroup",
    huntlist: "huntList",
    huntpilot: "huntPilot",
    devicepool: "devicePool",
    phonebuttontemplate: "phoneButtonTemplate",
    line: "line",
  };

  // Get the correct camelCase resource tag (default to resourceUrlPath if not found)
  resourceTag = resourceMappings[resourceLower] || resourceLower;

  // This function should be called with the HTTP method context to provide appropriate examples
  // Unfortunately, the function signature doesn't include the HTTP method parameter
  // So we'll need to provide examples for both PUT and PATCH

  if (resourceLower === "routepartition") {
    if (httpMethod === "put") {
      // PUT examples (add operation)
      return {
        example1: {
          summary: "Add Route Partition - With routePartition wrapper",
          description: "For add operations, use the routePartition wrapper - required for addRoutePartition",
          value: routePartitionExample,
        },
      };
    } else if (httpMethod === "patch") {
      // PATCH examples (update operation)
      return {
        example1: {
          summary: "Update Route Partition - Direct parameters",
          description: "For update operations, provide parameters directly without a resource wrapper",
          value: {
            name: "AXL-REST-API-PT",
            description: "Updated via PATCH request",
            useOriginatingDeviceTimeZone: "true",
            uuid: "12345678-1234-1234-1234-123456789012", // UUID required for update
          },
        },
      };
    } else {
      // Default examples for other methods
      return {
        example1: {
          summary: "Route Partition Example",
          description: "Example route partition configuration",
          value: routePartitionExample.routePartition,
        },
      };
    }
  }

  if (resourceLower === "css") {
    if (httpMethod === "put") {
      // PUT examples (add operation)
      return {
        example1: {
          summary: "Add CSS - With css wrapper",
          description: "For add operations, use the css wrapper - required for addCss",
          value: cssExample,
        },
      };
    } else if (httpMethod === "patch") {
      // PATCH examples (update operation)
      return {
        example1: {
          summary: "Update CSS - Direct parameters",
          description: "For update operations, provide parameters directly without a resource wrapper",
          value: {
            name: "AXL-REST-API-CSS",
            description: "Updated via PATCH request",
            members: {
              member: {
                routePartitionName: "INTERNAL-PT",
                index: "1",
              },
            },
            uuid: "12345678-1234-1234-1234-123456789012", // UUID required for update
          },
        },
      };
    } else {
      // Default examples for other methods
      return {
        example1: {
          summary: "CSS Example",
          description: "Example CSS configuration",
          value: cssExample.css,
        },
      };
    }
  }

  if (resourceLower === "phone") {
    if (httpMethod === "put") {
      // PUT examples (add operation)
      return {
        example1: {
          summary: "Add Phone - With phone wrapper",
          description: "For add operations, use the phone wrapper - required for addPhone",
          value: phoneExample,
        },
      };
    } else if (httpMethod === "patch") {
      // PATCH examples (update operation)
      return {
        example1: {
          summary: "Update Phone - Direct parameters",
          description: "For update operations, provide parameters directly without a resource wrapper",
          value: {
            name: "SEP001122334455",
            description: "Updated phone via PATCH request",
            devicePoolName: "Default",
            uuid: "12345678-1234-1234-1234-123456789012", // UUID required for update
          },
        },
      };
    } else {
      // Default examples for other methods
      return {
        example1: {
          summary: "Phone Example",
          description: "Example phone configuration",
          value: phoneExample.phone,
        },
      };
    }
  }

  if (resourceLower === "line") {
    // Create examples based on HTTP method
    if (httpMethod === "put") {
      // PUT examples (add operation)
      return {
        example1: {
          summary: "Add Line - With line wrapper",
          description: "For add operations, use the line wrapper - required for addLine",
          value: lineExample,
        },
        example2: {
          summary: "Add Line - With template variables",
          description: "For add operations with template variables - wrapper required",
          value: {
            line: {
              pattern: "%%_number_%%",
              description: "Line for %%_username_%%",
              alertingName: "%%_username_%%",
              routePartitionName: "INTERNAL-PT",
              _data: {
                number: "1001",
                username: "Example User",
              },
            },
          },
        },
        // Removing this example as it contradicts our guidance that PUT operations require wrappers
        // example3: {
        //   summary: "Add Line - Without line wrapper",
        //   description: "For add operations, without the use of a line wrapper",
        //   value: lineExampleWithoutWrapper,
        // },
      };
    } else if (httpMethod === "patch") {
      // PATCH examples (update operation)
      return {
        example1: {
          summary: "Update Line - Direct parameters",
          description: "For update operations, provide parameters directly without a resource wrapper",
          value: {
            pattern: "1001",
            routePartitionName: "INTERNAL-PT",
            alertingName: "Tom Smith",
            asciiAlertingName: "Tom Smith",
            description: "Tom Smith",
            uuid: "12345678-1234-1234-1234-123456789012", // UUID required for update
          },
        },
        example2: {
          summary: "Update Line - With template variables",
          description: "For update operations with template variables - no wrapper needed",
          value: {
            pattern: "%%_number_%%",
            description: "Line for %%_username_%%",
            alertingName: "%%_username_%%",
            routePartitionName: "INTERNAL-PT",
            _data: {
              number: "1001",
              username: "Example User",
            },
          },
        },
      };
    } else {
      // Default examples for other methods
      return {
        example1: {
          summary: "Line Example",
          description: "Example line configuration",
          value: lineExample.line,
        },
      };
    }
  }

  // Default generic example - varies by HTTP method
  if (httpMethod === "put") {
    // PUT examples (add operation)
    return {
      example1: {
        summary: "Add Resource - With resource wrapper [Generic]",
        description: "For add operations, use the resource wrapper with exact camelCase",
        value: {
          [resourceTag]: {
            name: "Example-Name",
            description: "Example created using the REST API",
          },
        },
      },
    };
  } else if (httpMethod === "patch") {
    // PATCH examples (update operation)
    return {
      example1: {
        summary: "Update Resource - Direct parameters [Generic]",
        description: "For update operations, provide parameters directly without a resource wrapper",
        value: {
          name: "Example-Name",
          description: "Example created using the REST API",
          uuid: "12345678-1234-1234-1234-123456789012", // UUID required for update
        },
      },
    };
  } else {
    // Default examples for other methods
    return {
      example1: {
        summary: "Example Resource",
        description: "Example resource configuration",
        value: {
          name: "Example-Name",
          description: "Example created using the REST API",
        },
      },
    };
  }
}
