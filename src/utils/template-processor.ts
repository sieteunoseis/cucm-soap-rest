/**
 * Custom template processor for replacing variables in JSON objects
 * Supports %%_variable_%% syntax and _data container for values
 */

/**
 * Process template variables in an object
 * @param obj The object containing template variables
 * @param dataContainerIdentifierTails The suffix for data containers (default: '_data')
 * @returns A new object with template variables replaced
 */
export function processTemplateVariables(obj: any, dataContainerIdentifierTails: string = '_data'): any {
  console.log(`Starting template variable processing with identifier: ${dataContainerIdentifierTails}`);
  
  // No need to clone the object - we'll modify it in place
  // This is more efficient for large objects and avoids deep clone issues
  const result = obj;
  
  // Find all _data containers in the object
  const dataContainers: { container: any, path: string[] }[] = [];
  
  // Function to recursively search for _data containers
  function findDataContainers(currentObj: any, path: string[] = []) {
    if (!currentObj || typeof currentObj !== 'object') return;
    
    // Check if this object is a data container
    if (Object.prototype.hasOwnProperty.call(currentObj, dataContainerIdentifierTails)) {
      console.log(`Found data container at path: ${path.join('.')}`);
      dataContainers.push({ 
        container: currentObj,
        path: [...path]
      });
    }
    
    // Recursively search in all properties
    for (const key in currentObj) {
      if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
        findDataContainers(currentObj[key], [...path, key]);
      }
    }
  }
  
  // Start the search
  findDataContainers(result);
  console.log(`Found ${dataContainers.length} data containers to process`);
  
  // Process each data container
  for (const { container, path } of dataContainers) {
    const dataValues = container[dataContainerIdentifierTails];
    const parentContainer = container;
    
    // Log the data container processing
    console.log(`Processing data container at path: ${path.join('.')}`);
    
    // Process each string value in the parent container
    processContainerValues(parentContainer, dataValues);
    
    // Remove the data container
    delete parentContainer[dataContainerIdentifierTails];
  }
  
  return result;
}

/**
 * Process string values in a container, replacing template markers
 * @param container The object containing template markers
 * @param dataValues The values to substitute into the templates
 */
export function processContainerValues(container: any, dataValues: any) {
  // Skip processing if container or dataValues are not objects
  if (!container || typeof container !== 'object' || !dataValues || typeof dataValues !== 'object') {
    console.log(`Skipping container processing: container or dataValues is not an object`);
    return;
  }
  
  // Process each key in the container
  for (const key in container) {
    if (Object.prototype.hasOwnProperty.call(container, key)) {
      const value = container[key];
      
      // Skip the data container itself
      if (key === '_data') continue;
      
      // If value is a string, process template variables
      if (typeof value === 'string') {
        // Check if this string contains template markers
        if (value.includes('%%_')) {
          console.log(`Processing template markers in ${key}: "${value}"`);
          const processed = processStringValue(value, dataValues);
          
          // Log the results
          if (processed !== value) {
            console.log(`Replaced template markers in ${key}: "${value}" -> "${processed}"`);
          }
          
          container[key] = processed;
        }
      } 
      // If value is an object, recursively process it
      else if (value && typeof value === 'object') {
        processContainerValues(value, dataValues);
      }
    }
  }
}

/**
 * Process a string value, replacing all template markers
 * @param value The string containing template markers
 * @param dataValues The values to substitute into the templates
 * @returns The processed string with template markers replaced
 */
export function processStringValue(value: string, dataValues: any): string {
  // Replace all occurrences of %%_variable_%% with the corresponding value
  return value.replace(/%%_([^%]+)_%%/g, (match, variableName) => {
    // Check if the variable exists
    if (dataValues[variableName] !== undefined) {
      // Get the replacement value
      let replacement = dataValues[variableName];
      
      // Parse and fix escaped characters 
      if (typeof replacement === 'string' && replacement.includes('\\')) {
        console.log(`Processing escaped string: "${replacement}"`);
        
        // Handle escaped characters by replacing double backslashes with single backslashes
        const originalReplacement = replacement;
        replacement = replacement.replace(/\\\\/g, '\\');
        if (replacement !== originalReplacement) {
          console.log(`Replaced double backslashes: "${originalReplacement}" -> "${replacement}"`);
        }
      }
      
      return replacement;
    }
    
    // Keep the original marker if variable not found
    return match;
  });
}

/**
 * Checks if an object contains template variables
 * @param obj The object to check
 * @param dataContainerIdentifierTails The suffix for data containers (default: '_data')
 * @returns Boolean indicating whether template variables were found
 */
export function hasTemplateVariables(obj: any, dataContainerIdentifierTails: string = '_data'): boolean {
  const objString = JSON.stringify(obj);
  return objString.includes(`"${dataContainerIdentifierTails}"`) || objString.includes(`"_data":`);
}