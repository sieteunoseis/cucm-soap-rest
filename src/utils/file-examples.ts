/**
 * File-based examples loader for API documentation
 */
import fs from 'fs';
import path from 'path';
import { getResourceTagFromMethod } from './method-mapper';

/**
 * Gets examples from filesystem for a specific resource and method
 * @param resource The resource name (line, phone, etc.)
 * @param httpMethod The HTTP method (post, patch, delete, etc.)
 * @returns Object containing examples or null if not found
 */
function getFileBasedExamples(resource: string, httpMethod: string): any | null {
  if (!resource) return null;
  
  // Add console log for debugging
  console.log(`Looking for examples for resource: ${resource}, method: ${httpMethod}`);
  
  const examplesDir = path.join(process.cwd(), 'src', 'examples');
  const resourcePath = path.join(examplesDir, 'resources', resource.toLowerCase(), httpMethod.toLowerCase());
  
  // Log the path being checked
  console.log(`Checking path: ${resourcePath}`);
  
  // Check if resource-specific directory exists
  if (!fs.existsSync(resourcePath)) {
    return null;
  }
  
  try {
    const files = fs.readdirSync(resourcePath).filter(file => file.endsWith('.json'));
    if (files.length === 0) {
      console.log(`No example files found in ${resourcePath}`);
      return null;
    }
    
    console.log(`Found ${files.length} example files: ${files.join(', ')}`);
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
 * @param httpMethod The HTTP method (post, patch, delete, etc.)
 * @param resourceTag The camelCase resource tag to use in the example
 * @returns Object containing examples or null if not found
 */
function getGenericFileExamples(httpMethod: string, resourceTag: string): any | null {
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
        
        // Deep clone the example value
        const exampleValue = JSON.parse(JSON.stringify(example.value));
        
        // Replace "resourceTag" placeholder with actual resource tag
        if (exampleValue && exampleValue.resourceTag) {
          const content = exampleValue.resourceTag;
          delete exampleValue.resourceTag;
          exampleValue[resourceTag] = content;
        }
        
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
 * Returns examples for specific resource types based on file-system examples
 * This is a drop-in replacement for the previous getExampleForResource function
 * @param resourceUrlPath Path component that identifies the resource
 * @param httpMethod HTTP method (post, patch, etc.)
 * @returns Object of examples to display in Swagger UI
 */
export function getExampleForResource(resourceUrlPath: string, httpMethod: string = "post"): any {
  // To avoid maintaining a mapping dictionary, we'll use a more flexible approach
  // We'll convert everything to lowercase for file paths and directory structure
  const resourceLower = resourceUrlPath.toLowerCase();
  
  // Debugging to help track the resource path being used
  console.log(`[FILE-EXAMPLES] Looking for examples for ${resourceUrlPath} with method ${httpMethod}`);
  
  // For the resource tag in examples, we'll use a simple conversion to camelCase
  // This handles most common cases like "routePartition", "phoneButtonTemplate", etc.
  // First, split the resource by non-alphanumeric characters
  const parts = resourceLower.split(/[^a-z0-9]+/);
  
  // Then join with first word lowercase, rest capitalized
  let resourceTag = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (parts[i]) {
      resourceTag += parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
    }
  }
  
  console.log(`[FILE-EXAMPLES] Resource tag determined as: ${resourceTag}`);
  
  // Look for resource-specific examples first
  console.log(`[FILE-EXAMPLES] Checking for resource-specific examples for ${resourceUrlPath}`);
  const fileExamples = getFileBasedExamples(resourceUrlPath, httpMethod);
  if (fileExamples) {
    console.log(`[FILE-EXAMPLES] Found resource-specific examples for ${resourceUrlPath}`);
    return fileExamples;
  }
  
  // Try to get generic file examples
  console.log(`[FILE-EXAMPLES] Checking for generic examples for ${httpMethod}`);
  const genericExamples = getGenericFileExamples(httpMethod, resourceTag);
  if (genericExamples) {
    console.log(`[FILE-EXAMPLES] Found generic examples for ${httpMethod}`);
    return genericExamples;
  }
  
  // Default generic example - varies by HTTP method
  if (httpMethod === "post") {
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
          description: "Example updated using the REST API",
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