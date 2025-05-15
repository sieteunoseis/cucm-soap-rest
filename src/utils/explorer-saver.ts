/**
 * Utility to save parameters from the AXL Method Explorer as example files
 */
import path from 'path';
import { getHttpMethodFromAxlMethod, ensureDirectoryExists, writeExampleFile, getExampleDirectoryPath } from './example-utils';

/**
 * Saves Method Explorer parameters as default examples
 * @param method The AXL method name (e.g., addAppServerInfo)
 * @param parameters The parameters object to save as example
 * @returns Object with status and message
 */
export function saveExplorerAsExample(method: string, parameters: any): { status: string; message: string } {
  try {
    if (!method || !parameters) {
      return { 
        status: 'error', 
        message: 'Method name and parameters are required' 
      };
    }
    
    console.log(`Saving explorer example for method ${method}`);
    
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
    
    console.log(`Determined: httpMethod=${httpMethod}, directory=${resourceDir}`);
    
    // Create directories if they don't exist
    if (!ensureDirectoryExists(resourceDir)) {
      return {
        status: 'error',
        message: `Failed to create directory: ${resourceDir}`
      };
    }
    
    // Always use default.json for explorer examples
    const fileName = 'default.json';
    const filePath = path.join(resourceDir, fileName);
    
    // Use the parameters exactly as returned from the AXL server with no modifications
    console.log(`Saving raw parameters from AXL server with no modifications`);
    const exampleValue = parameters;
    
    // Create example object
    const example = {
      summary: `${method} Default Example`,
      description: `Default example generated from AXL Method Explorer for ${method}`,
      value: exampleValue
    };
    
    // Write the file using the utility function
    const result = writeExampleFile(filePath, example);
    
    // Add "explorer" to message for clarity
    if (result.status === 'success') {
      result.message = result.message.replace('Saved example', 'Saved explorer example');
    }
    
    return result;
  } catch (error) {
    console.error('Error saving explorer example:', error);
    return {
      status: 'error',
      message: `Error saving explorer example: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// getHttpMethodFromAxlMethod has been moved to example-utils.ts