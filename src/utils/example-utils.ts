/**
 * Common utilities for example saving functionality
 */
import fs from 'fs';
import path from 'path';
import { getResourceFromMethod as getResourceFromMethod_mapper } from './method-mapper';

/**
 * Determines the HTTP method based on the AXL method prefix
 * @param axlMethod The AXL method name (e.g., addLine, updatePhone)
 * @returns The corresponding HTTP method (post, patch, etc.)
 */
export function getHttpMethodFromAxlMethod(axlMethod: string): string | null {
  const methodLower = axlMethod.toLowerCase();
  
  if (methodLower.startsWith('add')) {
    return 'post';
  } else if (methodLower.startsWith('update')) {
    return 'patch';
  } else if (methodLower.startsWith('remove') || methodLower.startsWith('delete')) {
    return 'delete';
  } else if (methodLower.startsWith('get') || methodLower.startsWith('list')) {
    return 'get';
  } else if (methodLower.startsWith('apply') || methodLower.startsWith('reset') || methodLower.startsWith('do')) {
    return 'post';
  }
  
  return null;
}

/**
 * Ensures the directory exists for saving example files
 * @param dirPath The directory path to create
 * @returns Boolean indicating success or failure
 */
export function ensureDirectoryExists(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o777 }); // Allow everyone to write
      console.log(`Created directory: ${dirPath}`);
    }
    return true;
  } catch (dirError) {
    console.error(`Error creating directory ${dirPath}:`, dirError);
    return false;
  }
}

/**
 * Safely writes an example file to disk
 * @param filePath The path where the file should be written
 * @param data The data to write
 * @returns Object with status and message
 */
export function writeExampleFile(filePath: string, data: any): { status: string; message: string } {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o666 }); // Allow everyone read/write
    return {
      status: 'success',
      message: `Saved example to ${filePath}`
    };
  } catch (writeError) {
    console.error(`Error writing example file ${filePath}:`, writeError);
    return {
      status: 'error',
      message: `Error writing example: ${writeError instanceof Error ? writeError.message : String(writeError)}`
    };
  }
}

/**
 * Creates the full directory path for saving an example
 * @param method The AXL method name
 * @param httpMethod The HTTP method (post, patch, etc.)
 * @returns The directory path or null if unable to determine
 */
export function getExampleDirectoryPath(method: string, httpMethod: string): string | null {
  try {
    // Get the resource name from the method using the imported utility
    const resource = getResourceFromMethod_mapper(method);
    
    if (!resource) {
      console.error(`Unable to determine resource from method: ${method}`);
      return null;
    }
    
    // Create the directory path
    const examplesDir = path.join(process.cwd(), 'src', 'examples');
    const resourceDir = path.join(examplesDir, 'resources', resource.toLowerCase(), httpMethod.toLowerCase());
    
    return resourceDir;
  } catch (error) {
    console.error(`Error creating directory path for ${method}:`, error);
    return null;
  }
}

// Using getResourceFromMethod from method-mapper.ts instead