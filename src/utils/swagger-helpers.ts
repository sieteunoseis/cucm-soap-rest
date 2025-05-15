import { getResourceTagFromMethod, getResourceFromMethod } from "./method-mapper";
import fs from "fs";
import path from "path";

/**
 * Generates a path description for a Swagger endpoint based on HTTP method and operation
 * @param httpMethod The HTTP method (get, put, patch, etc.)
 * @param operation The AXL operation name
 * @param path The API path
 * @param description Base description text
 * @param parameters Whether parameters exist for this endpoint
 * @returns Formatted description with appropriate guidance based on HTTP method
 */
export function generatePathDescription(
  httpMethod: string,
  operation: string,
  path: string,
  description: string,
  parameters: boolean = false
): string {
  // Extract the resource name from the path
  const resource = path.split('/')[3] || '';
  
  // Extract the proper camelCase resource tag from the method
  const resourceTag = getResourceTagFromMethod(operation);

  // Add notes about case-sensitive handling
  let pathDescription = httpMethod.toLowerCase() === 'get' && !parameters
    ? `${description} - Returns all available ${resource} resources (${operation})`
    : `${description} (${operation})`;

  // Add documentation notes based on HTTP method
  if (httpMethod.toLowerCase() === 'put') {
    pathDescription += `\n\n**IMPORTANT - Case-Sensitive Resource Names:** For add operations (PUT), you must use the exact camelCase resource wrapper.
    For this endpoint, use \`${resourceTag}\` as the resource key (not \`${resource}\`).
    For example: \`{ "${resourceTag}": { "name": "Example" } }\`
    See the examples below for proper request structure.
    
    **NOTE:** The examples below are general guidelines. For detailed parameter requirements, 
    use the AXL Method Explorer at the top of the page or refer to Cisco's AXL documentation for the ${operation} operation.`;
  }
  
  // For PATCH methods, add direct parameters note
  if (httpMethod.toLowerCase() === 'patch') {
    pathDescription += `\n\n**Direct Parameter Format:** For update operations (PATCH), provide parameters directly without a resource wrapper.
    For example: \`{ "name": "Example", "description": "Updated description" }\`
    If using a URL parameter (like uuid or name), it will be added automatically.
    See the examples below for proper request structure.
    
    **NOTE:** The examples below are general guidelines. For detailed parameter requirements, 
    use the AXL Method Explorer at the top of the page or refer to Cisco's AXL documentation for the ${operation} operation.`;
  }
  
  // For DELETE methods, add identifier note
  if (httpMethod.toLowerCase() === 'delete') {
    pathDescription += `\n\n**Resource Identifier:** For delete operations, you can identify resources using either:
    - URL path parameters as shown in this endpoint (recommended)
    - Request body with either name or uuid (both are optional)
    - For example: \`{ "name": "Example-Name" }\` or \`{ "uuid": "12345678-1234-1234-1234-123456789012" }\`
    See the examples below for proper request structure.
    
    **NOTE:** The examples below are general guidelines. For detailed parameter requirements, 
    use the AXL Method Explorer at the top of the page or refer to Cisco's AXL documentation for the ${operation} operation.`;
  }
  
  // For APPLY, RESET, and DO methods, add identifier note
  if (operation.toLowerCase().startsWith('apply') || 
      operation.toLowerCase().startsWith('reset') ||
      operation.toLowerCase().startsWith('do')) {
    
    // Get the operation type for the message
    const opType = operation.toLowerCase().startsWith('apply') ? 'apply' : 
                  operation.toLowerCase().startsWith('reset') ? 'reset' : 'do';
    
    // Special handling for 'do' operations
    if (operation.toLowerCase().startsWith('do')) {
      pathDescription += `\n\n**${opType.charAt(0).toUpperCase() + opType.slice(1)} Resource:** For ${opType} operations:
      - Some operations may work with an empty request body: \`{}\`
      - Others may require identifiers at the root level: \`{ "name": "Example-Name", "uuid": "" }\`
      - Additional parameters can be included at the root level (like loginDuration for doDeviceLogin)
      - No nesting or wrapper objects - all properties must be at the root level
      - The API will return appropriate error messages if the request format is incorrect
      
      **NOTE:** The examples below are general guidelines. For detailed parameter requirements, 
      use the AXL Method Explorer at the top of the page or refer to Cisco's AXL documentation for the ${operation} operation.`;
    } else {
      pathDescription += `\n\n**${opType.charAt(0).toUpperCase() + opType.slice(1)} Resource:** For ${opType} operations, you only need to provide an identifier:
      - Use name or uuid at the root level to identify the resource to ${opType}
      - Format: \`{ "name": "Example-Name", "uuid": "" }\` or \`{ "uuid": "12345678-1234-1234-1234-123456789012", "name": "" }\`
      - URL path parameters can also be used as shown in this endpoint
      - Additional parameters can be included at the root level if needed
      - No nesting or wrapper objects - all properties must be at the root level
      
      **NOTE:** The examples below are general guidelines. For detailed parameter requirements, 
      use the AXL Method Explorer at the top of the page or refer to Cisco's AXL documentation for the ${operation} operation.`;
    }
  }
  
  // For GET methods, also add the note
  if (httpMethod.toLowerCase() === 'get') {
    pathDescription += `\n\n**NOTE:** The examples below are general guidelines. For detailed parameter requirements, 
    use the AXL Method Explorer at the top of the page or refer to Cisco's AXL documentation for the ${operation} operation.`;
  }

  return pathDescription;
}

/**
 * Gets examples from filesystem for a specific resource and method
 * @param resource The resource name (line, phone, etc.)
 * @param httpMethod The HTTP method (put, patch, delete, etc.)
 * @returns Object containing examples or null if not found
 */
function getFileBasedExamples(resource: string, httpMethod: string): any | null {
  const examplesDir = path.join(process.cwd(), 'src', 'examples');
  const resourcePath = path.join(examplesDir, 'resources', resource.toLowerCase(), httpMethod.toLowerCase());
  
  // Check if resource-specific directory exists
  if (!fs.existsSync(resourcePath)) {
    return null;
  }
  
  try {
    const files = fs.readdirSync(resourcePath).filter(file => file.endsWith('.json'));
    if (files.length === 0) {
      return null;
    }
    
    const examples: any = {};
    
    files.forEach((file, index) => {
      try {
        const content = fs.readFileSync(path.join(resourcePath, file), 'utf8');
        const example = JSON.parse(content);
        examples[`example${index + 1}`] = {
          summary: example.summary,
          description: example.description,
          value: example.value
        };
      } catch (err) {
        console.error(`Error reading example file ${file}:`, err);
      }
    });
    
    return Object.keys(examples).length > 0 ? examples : null;
  } catch (err) {
    console.error(`Error reading examples directory for ${resource}/${httpMethod}:`, err);
    return null;
  }
}

/**
 * Gets generic examples from filesystem for an HTTP method
 * @param httpMethod The HTTP method (put, patch, delete, etc.)
 * @returns Object containing examples or null if not found
 */
function getGenericFileExamples(httpMethod: string): any | null {
  const examplesDir = path.join(process.cwd(), 'src', 'examples');
  const genericPath = path.join(examplesDir, 'generic', httpMethod.toLowerCase());
  
  // Check if generic directory exists
  if (!fs.existsSync(genericPath)) {
    return null;
  }
  
  try {
    const files = fs.readdirSync(genericPath).filter(file => file.endsWith('.json'));
    if (files.length === 0) {
      return null;
    }
    
    const examples: any = {};
    
    files.forEach((file, index) => {
      try {
        const content = fs.readFileSync(path.join(genericPath, file), 'utf8');
        const example = JSON.parse(content);
        
        // For generic examples, we need to replace "resourceTag" with the actual resource tag
        const exampleValue = JSON.parse(JSON.stringify(example.value)); // Deep clone
        
        examples[`example${index + 1}`] = {
          summary: example.summary,
          description: example.description,
          value: exampleValue
        };
      } catch (err) {
        console.error(`Error reading generic example file ${file}:`, err);
      }
    });
    
    return Object.keys(examples).length > 0 ? examples : null;
  } catch (err) {
    console.error(`Error reading generic examples directory for ${httpMethod}:`, err);
    return null;
  }
}

/**
 * Generates examples for request bodies based on HTTP method and resource
 * @param httpMethod The HTTP method (put, patch, delete, etc.)
 * @param resourceTag The camelCase resource tag
 * @param method Optional AXL method name (for special handling)
 * @returns Example objects for Swagger UI
 */
export function generateExamples(
  httpMethod: string,
  resourceTag: string,
  method?: string
): any {
  // Extract the resource name from the method if available
  const resource = method ? getResourceFromMethod(method) : '';
  
  // First check for special operations
  if (method && (method.toLowerCase().startsWith("apply") || 
               method.toLowerCase().startsWith("reset") || 
               method.toLowerCase().startsWith("do"))) {
    
    // Get the operation type for messages
    const opType = method.toLowerCase().startsWith('apply') ? 'apply' : 
                 method.toLowerCase().startsWith('reset') ? 'reset' : 'do';
    
    // Examples for APPLY/RESET/DO operations - simple identifiers only
    let examples: any = {
      example1: {
        summary: `${opType.charAt(0).toUpperCase() + opType.slice(1)} by Name`,
        description: `Provide the name for ${opType} operations`,
        value: {
          name: "Example-Name",
          uuid: ""
        },
      },
      example2: {
        summary: `${opType.charAt(0).toUpperCase() + opType.slice(1)} by UUID`,
        description: `UUID is the most reliable identifier for ${opType} operations (recommended)`,
        value: {
          uuid: "12345678-1234-1234-1234-123456789012",
          name: ""
        },
      }
    };
    
    // Add special examples for specific operations
    if (method.toLowerCase() === "dodevicelogin") {
      examples.example3 = {
        summary: "Device Login with Duration",
        description: "Example with additional parameters for doDeviceLogin",
        value: {
          name: "SEP001122334455",
          uuid: "",
          loginDuration: 60
        }
      };
    }
    
    // Add example for doLdapSync
    if (method.toLowerCase() === "doldapsync") {
      examples.example4 = {
        summary: "LDAP Sync with sync parameter",
        description: "Example for LDAP synchronization with sync flag",
        value: {
          name: "WebexCommonIdentitySync",
          uuid: "",
          sync: "true"
        }
      };
    }
    
    // For all do operations, add an empty body example
    if (method && method.toLowerCase().startsWith('do')) {
      examples.example3 = {
        summary: "Empty request body",
        description: "Some do operations can be called with an empty request body (refer to AXL documentation for details)",
        value: {}
      };
    }
    
    return examples;
  } else if (httpMethod.toLowerCase() === "put") {
    // Look for resource-specific examples first
    const fileExamples = resource ? getFileBasedExamples(resource, httpMethod) : null;
    if (fileExamples) {
      return fileExamples;
    }
    
    // Try to get generic file examples
    const genericExamples = getGenericFileExamples(httpMethod);
    if (genericExamples) {
      // Replace "resourceTag" placeholder with actual resource tag
      Object.keys(genericExamples).forEach(key => {
        const example = genericExamples[key];
        if (example.value && example.value.resourceTag) {
          const content = example.value.resourceTag;
          delete example.value.resourceTag;
          example.value[resourceTag] = content;
        }
      });
      return genericExamples;
    }
    
    // Fallback to hardcoded examples
    return {
      example1: {
        summary: "With resource wrapper (required) [Generic]",
        description: "For add operations, you must use the resource wrapper with exact camelCase",
        value: {
          // Use the proper camelCase resource tag
          [resourceTag]: {
            name: "Example-Name",
            description: "Example created using the REST API",
          },
        },
      }
    };
  } else if (httpMethod.toLowerCase() === "patch") {
    // Look for resource-specific examples first
    const fileExamples = resource ? getFileBasedExamples(resource, httpMethod) : null;
    if (fileExamples) {
      return fileExamples;
    }
    
    // Try to get generic file examples
    const genericExamples = getGenericFileExamples(httpMethod);
    if (genericExamples) {
      return genericExamples;
    }
    
    // Fallback to hardcoded examples
    return {
      example1: {
        summary: "Direct parameters (no wrapper) [Generic]",
        description: "For update operations, provide parameters directly without a resource wrapper",
        value: {
          name: "Example-Name",
          description: "Example created using the REST API",
          uuid: "12345678-1234-1234-1234-123456789012", // For update operations
        },
      }
    };
  } else if (httpMethod.toLowerCase() === "delete") {
    // Look for resource-specific examples first
    const fileExamples = resource ? getFileBasedExamples(resource, httpMethod) : null;
    if (fileExamples) {
      return fileExamples;
    }
    
    // Try to get generic file examples
    const genericExamples = getGenericFileExamples(httpMethod);
    if (genericExamples) {
      return genericExamples;
    }
    
    // Fallback to hardcoded examples
    return {
      example1: {
        summary: "Identifier options for DELETE",
        description: "You can specify either name or uuid in the DELETE body (or use URL parameters)",
        value: {
          name: "Example-Name",
          uuid: ""
        },
      },
      example2: {
        summary: "Delete by UUID",
        description: "UUID is the most reliable identifier for DELETE operations",
        value: {
          uuid: "12345678-1234-1234-1234-123456789012",
          name: ""
        },
      }
    };
  } else {
    // Look for resource-specific examples first
    const fileExamples = resource ? getFileBasedExamples(resource, httpMethod) : null;
    if (fileExamples) {
      return fileExamples;
    }
    
    // Try to get generic file examples
    const genericExamples = getGenericFileExamples(httpMethod);
    if (genericExamples) {
      return genericExamples;
    }
    
    // Generic examples for other methods
    return {
      example1: {
        summary: "Example request body",
        value: {
          name: "Example-Name",
          description: "Example created using the REST API",
        },
      }
    };
  }
}

/**
 * Generates the summary for a Swagger endpoint
 * @param httpMethod HTTP method (GET, PUT, etc.)
 * @param path API path
 * @param operation AXL operation name
 * @returns Formatted summary string
 */
export function generateSummary(
  httpMethod: string,
  path: string,
  operation: string
): string {
  return `${httpMethod.toUpperCase()} ${path} (${operation})`;
}

/**
 * Generates appropriate tags for grouping operations in Swagger UI
 * @param method The AXL method name
 * @param path The API path
 * @returns Array of tags
 */
export function generateTags(method: string, path: string): string[] {
  // Extract resource name from path
  let resourcePath = path.split('/')[3] || 'axl';

  // Group special operations together
  if (method.toLowerCase().startsWith('apply')) {
    return ['apply'];
  } else if (method.toLowerCase().startsWith('reset')) {
    return ['reset'];
  } else if (method.toLowerCase().startsWith('do')) {
    return ['do'];
  } else if (method.toLowerCase().startsWith('restart')) {
    return ['restart'];
  } else {
    // Handle list operations by extracting the resource name from the method
    // This ensures that list* and get* operations are grouped together
    if (method.toLowerCase().startsWith('list')) {
      // For list operations, extract resource name directly from the method
      // This is more reliable than using the URL path for list operations
      // E.g., listPhone → phone, listPhones → phone
      const resourceNameFromMethod = method.substring(4).toLowerCase();
      
      // Remove trailing 's' if present to get singular form
      if (resourceNameFromMethod.endsWith('s') && resourceNameFromMethod.length > 3) {
        return [resourceNameFromMethod.slice(0, -1)];
      }
      
      return [resourceNameFromMethod];
    }
    
    // For all other operations (get*, add*, update*, remove*)
    // Handle plural forms by converting to singular for consistent grouping
    // e.g., 'aargroups' → 'aargroup', 'phones' → 'phone'
    if (resourcePath.endsWith('s')) {
      // Check if this is a plural form (not just a word that ends with 's')
      const singularForm = resourcePath.slice(0, -1);
      
      // Only convert to singular if it's a true plural (e.g., phones → phone)
      // Some resources might naturally end with 's' like 'css'
      if (singularForm.length > 2) {
        resourcePath = singularForm;
      }
    }
    
    return [resourcePath];
  }
}