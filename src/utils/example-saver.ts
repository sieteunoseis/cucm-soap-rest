/**
 * Utility to save API Explorer requests as example files
 */
import path from 'path';
import { getHttpMethodFromAxlMethod, ensureDirectoryExists, writeExampleFile, getExampleDirectoryPath } from './example-utils';

/**
 * Saves an API request as an example file
 * @param method The AXL method name (e.g., addLine, updatePhone)
 * @param requestBody The request body to save as an example
 * @returns Object with status and message
 */
export function saveRequestAsExample(method: string, requestBody: any): { status: string; message: string } {
  try {
    if (!method) {
      return { 
        status: 'error', 
        message: 'Method name is required' 
      };
    }
    
    // Ensure requestBody is valid
    if (!requestBody) {
      requestBody = {}; // Use empty object if no body provided
    }
    
    // Log what we're saving for debugging
    console.log(`Saving example for method ${method}, requestBody type: ${typeof requestBody}`);
    if (typeof requestBody === 'string') {
      try {
        // If it's a string that looks like JSON, parse it
        if (requestBody.trim().startsWith('{') || requestBody.trim().startsWith('[')) {
          requestBody = JSON.parse(requestBody);
          console.log('Parsed string request body as JSON');
        }
      } catch (parseError) {
        console.log('Could not parse request body as JSON, using as-is');
      }
    }

    // Determine HTTP method and get directory path
    const httpMethod = getHttpMethodFromAxlMethod(method);
    if (!httpMethod) {
      return { 
        status: 'error', 
        message: `Could not determine HTTP method from '${method}'` 
      };
    }
    
    // Get the directory path
    const resourceDir = getExampleDirectoryPath(method, httpMethod);
    if (!resourceDir) {
      return { 
        status: 'error', 
        message: `Could not determine resource from '${method}'` 
      };
    }

    // Create directories if they don't exist
    if (!ensureDirectoryExists(resourceDir)) {
      return {
        status: 'error',
        message: `Failed to create directory: ${resourceDir}`
      };
    }

    // Create example file name
    // Use either generated-example.json or method-name.json
    const fileName = `${method.toLowerCase()}.json`;
    const filePath = path.join(resourceDir, fileName);

    // Create example object
    const example = {
      summary: `${method} Example`,
      description: `Example generated from API Explorer for ${method}`,
      value: requestBody
    };

    // Write the file using the utility function
    return writeExampleFile(filePath, example);
  } catch (error) {
    console.error('Error saving example:', error);
    return {
      status: 'error',
      message: `Error saving example: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// getHttpMethodFromAxlMethod has been moved to example-utils.ts