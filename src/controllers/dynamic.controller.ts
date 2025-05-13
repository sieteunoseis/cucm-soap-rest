import { Express, Request, Response, NextFunction } from "express";
import axlService from "cisco-axl";
import { axlConfig } from "../config/axl.config";
import { mapAxlMethodToHttp, getResourceFromMethod, getResourceTagFromMethod } from "../utils/method-mapper";
import { swaggerSpec } from "../utils/api-explorer";
import fs from "fs";
import path from "path";
import { getExampleForResource } from "../utils/resource-examples";
import { processTemplateVariables, hasTemplateVariables } from "../utils/template-processor";
import { generatePathDescription, generateExamples, generateSummary, generateTags } from "../utils/swagger-helpers";
import { packageInfo } from "../utils/version";

// Function to add paths to Swagger spec
function addPathToSwagger(
  method: string,
  path: string,
  httpMethod: string,
  description: string
): void {
  console.log(`Adding Swagger path: ${httpMethod.toUpperCase()} ${path}`);

  // Prepare parameters if needed
  const parameters = [];
  let requestBody = undefined;

  // Add path parameters for dynamic parameter endpoint
  if (path.includes('{parameter}') && path.includes('{value}')) {
    parameters.push({
      name: 'parameter',
      in: 'path',
      required: true,
      description: 'Parameter type to identify the resource (uuid, name, etc.)',
      schema: {
        type: 'string'
      }
    });

    parameters.push({
      name: 'value',
      in: 'path',
      required: true,
      description: 'Value of the parameter to identify the resource',
      schema: {
        type: 'string'
      }
    });
  }

  // Extract the proper camelCase resource tag from the method
  const resourceTag = getResourceTagFromMethod(method);

  // Add request body for non-GET methods with examples
  if (httpMethod.toLowerCase() !== 'get') {
    // Generate examples using our utility function
    // Pass the method name for special handling of apply operations
    const examples = generateExamples(httpMethod, resourceTag, method);
    
    // Delete operations may have a body, but it's not required
    // Apply operations should also have optional body
    const isRequired = !['delete', 'post'].includes(httpMethod.toLowerCase()) || 
                     !(method && method.toLowerCase().startsWith('apply'));
    
    requestBody = {
      description: 'Request payload for the operation',
      required: isRequired,
      content: {
        'application/json': {
          schema: {
            type: 'object'
          },
          examples: examples
        }
      }
    };
  }

  // Ensure the path exists in the spec
  if (!swaggerSpec.paths[path]) {
    swaggerSpec.paths[path] = {};
  }

  // Generate path description using the utility function
  const pathDescription = generatePathDescription(
    httpMethod, 
    method, 
    path, 
    description, 
    parameters.length > 0
  );

  // Add the operation details
  swaggerSpec.paths[path][httpMethod.toLowerCase()] = {
    summary: generateSummary(httpMethod, path, method),
    description: pathDescription,
    tags: generateTags(method, path),
    parameters: parameters.length > 0 ? parameters : undefined,
    requestBody: requestBody,
    responses: {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object'
            }
          }
        }
      },
      '400': {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      '404': {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
    },
  };

  console.log(`Swagger paths count: ${Object.keys(swaggerSpec.paths).length}`);
}

// Initialize AXL service
const axlClient = new axlService(axlConfig.host, axlConfig.user, axlConfig.pass, axlConfig.version);

// No mock data - requires actual CUCM connection

// Handler for executing AXL operations
async function executeAxlOperation(req: Request, res: Response, next: NextFunction) {
  try {
    const method = req.params.method as string;

    if (!method) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Method name is required",
        statusCode: 400,
      });
    }

    // Check for dynamic parameter in the route
    const parameter = req.params.parameter;
    const value = req.params.value;

    // Use the dynamic parameter approach exclusively
    const paramValue = value;
    const paramType = parameter;

    // Check if the operation exists
    try {
      const availableOperations = await axlClient.returnOperations();
      if (!availableOperations.includes(method)) {
        return res.status(404).json({
          error: "NOT_FOUND",
          message: `Operation '${method}' is not available in the AXL API`,
          statusCode: 404,
        });
      }
    } catch (opError) {
      console.warn("Could not verify operation existence:", opError);
      // Continue anyway in case this is just a temporary issue
    }

    // Always start with the operation tags structure
    let tags: any = {};
    try {
      console.log(`Attempting to get tags for operation: ${method}`);
      tags = await axlClient.getOperationTags(method);

      // Enhanced logging for tag information
      if (Object.keys(tags).length === 0) {
        console.warn(`Warning: No tags returned for operation ${method}`);
      } else {
        console.log(`Initial tags structure for ${method}:`, JSON.stringify(tags, null, 2));
      }

    } catch (tagsError) {
      console.warn(`Could not get operation tags for ${method}:`, tagsError);
      // Initialize with empty tags object if we can't get the structure
      tags = {};
    }

    // Handle different method types differently
    if (method.toLowerCase().startsWith("list")) {
      // For list methods, we only need the searchCriteria object
      console.log(`Request query:`, req.query);
      console.log(`Request params:`, req.params);

      // Apply any filters from query parameters
      if (tags.searchCriteria) {
        // Create a fresh tags object with just the searchCriteria
        const searchCriteria = { ...tags.searchCriteria };
        tags = { searchCriteria };
        
        // First apply URL parameter/value if provided
        if (paramType && paramValue) {
          console.log(`Using parameter ${paramType}=${paramValue} for ${method}`);

          // First set all searchCriteria fields to % as default
          const searchCriteriaKeys = Object.keys(tags.searchCriteria);
          searchCriteriaKeys.forEach((key) => {
            if (key === "customerName") {
              // For customerName, we want to remove it from searchCriteria. This is a special case.
              delete tags.searchCriteria[key];
            } else {
              tags.searchCriteria[key] = "%";
            }
          });

          // Then apply the specific parameter
          if (Object.prototype.hasOwnProperty.call(tags.searchCriteria, paramType)) {
            tags.searchCriteria[paramType] = paramValue;
          } else {
            console.warn(`Parameter ${paramType} not found in searchCriteria for ${method}`);
          }
        }

        // Then apply any query parameters (which will override URL parameters if both are specified)
        Object.keys(req.query).forEach((key) => {
          if (key !== "method" && Object.prototype.hasOwnProperty.call(tags.searchCriteria, key)) {
            tags.searchCriteria[key] = req.query[key];
          }
        });

        // If no specific criteria were provided (either in URL or query), set all searchCriteria keys to %
        if (!paramValue && !Object.keys(req.query).some((k) => k !== "method")) {
          // Get all keys from searchCriteria
          const searchCriteriaKeys = Object.keys(tags.searchCriteria);

          // Set each key to %
          searchCriteriaKeys.forEach((key) => {
            if (key === "customerName") {
              // For customerName, we want to remove it from searchCriteria. This is a special case.
              delete tags.searchCriteria[key];
            } else {
              tags.searchCriteria[key] = "%";
            }
          });
        }
      } else {
        // No searchCriteria available - create an empty tags object
        tags = {};
      }
    } else if (method.toLowerCase().startsWith("get")) {
      // For get methods, we only need the identifier parameters
      // Basic GET operations don't need any tags structure other than the parameter
      if (paramValue) {
        // If we have a parameter value, use it with the correct type
        // Create a fresh tags object for GET operations
        tags = {};
        
        if (paramType) {
          // Add the parameter directly
          tags[paramType] = paramValue;
        } else {
          // Default to uuid as the parameter type
          console.log(`No parameter type specified, defaulting to uuid`);
          tags.uuid = paramValue;
        }
      } else if (Object.keys(req.query).length > 0) {
        // Use query parameters directly without merging
        tags = { ...req.query };
      } else {
        // Generic handling for operations like getAnnunciator
        if (Object.prototype.hasOwnProperty.call(tags, 'name') && tags.name === "" &&
            Object.prototype.hasOwnProperty.call(tags, 'uuid') && tags.uuid === "") {
          // If both name and uuid are present but empty, this operation requires them to be populated
          console.log(`GET operation ${method} requires parameters but none provided`);

          // Return a more informative error message
          return res.status(400).json({
            error: "BAD_REQUEST",
            message: `Operation '${method}' requires valid parameters (like name or uuid)`,
            statusCode: 400,
            operation: method
          });
        }

        // For operations with searchCriteria, keep only the searchCriteria
        if (tags.searchCriteria) {
          console.log(`Setting searchCriteria to % for ${method} with no parameters`);
          // Create a fresh tags object with just the searchCriteria
          const searchCriteria = { ...tags.searchCriteria };
          tags = { searchCriteria };
          
          // Get all keys from searchCriteria
          const searchCriteriaKeys = Object.keys(tags.searchCriteria);

          // Set each key to %
          searchCriteriaKeys.forEach((key) => {
            if (key === "customerName") {
              // For customerName, remove it from searchCriteria (special case)
              delete tags.searchCriteria[key];
            } else {
              tags.searchCriteria[key] = "%";
            }
          });
        }
      }
    } else if (method.toLowerCase().startsWith("add")) {
      // For add methods, use the request body directly
      const resourcePath = getResourceFromMethod(method);

      // Get the actual camelCase resource tag name (e.g., "routePartition" not "routepartition")
      const resourceTag = getResourceTagFromMethod(method);

      // Enhanced debug logs
      console.log(`Add operation: ${method}, Resource path: ${resourcePath}, Resource tag: ${resourceTag}`);
      console.log(`Request body (raw):`, req.body);
      console.log(`Request body (formatted):`, JSON.stringify(req.body, null, 2));
      
      // Check for template variables in the request
      const dataContainerIdentifierTails = process.env.DATACONTAINERIDENTIFIERTAILS || '_data';
      const bodyString = JSON.stringify(req.body);
      console.log(`Request body string for template analysis (length ${bodyString.length}):`);
      console.log(bodyString);
      
      const hasDataFields = bodyString.includes(`"${dataContainerIdentifierTails}"`) || 
                           bodyString.includes(`"_data":`);
      console.log(`Does request body have template variables? ${hasDataFields}`);
      
      // Create fresh tags object for add operations - don't merge with existing tags
      tags = {};
      
      // Check if the body already has the resource tag name as a key with exact case match
      if (req.body && req.body[resourceTag]) {
        console.log(`Request body already has ${resourceTag} as a tag (exact match)`);
        // Use the request body directly without merging with existing tags
        tags[resourceTag] = req.body[resourceTag];
      } else {
        console.log(`Wrapping body in ${resourceTag} key`);
        // Most add operations expect the data in a specific structure
        tags[resourceTag] = req.body;
      }
    } else if (method.toLowerCase().startsWith("update")) {
      // For update methods, use the request body directly with the proper parameter
      const resourcePath = getResourceFromMethod(method);

      // Get the actual camelCase resource tag name (e.g., "routePartition" not "routepartition")
      const resourceTag = getResourceTagFromMethod(method);

      // Debug logs to see what's happening
      console.log(`Update operation: ${method}, Resource path: ${resourcePath}, Resource tag: ${resourceTag}`);
      console.log(`Request body:`, JSON.stringify(req.body, null, 2));
      
      // Check for template variables in the request body
      const dataContainerIdentifierTails = process.env.DATACONTAINERIDENTIFIERTAILS || '_data';
      const bodyString = JSON.stringify(req.body);
      console.log(`Request body string for template analysis (length ${bodyString.length}):`);
      console.log(bodyString);
      
      const hasDataFields = bodyString.includes(`"${dataContainerIdentifierTails}"`) || 
                           bodyString.includes(`"_data":`);
      console.log(`Does request body have template variables? ${hasDataFields}`);

      // Create fresh tags object for update operations - don't merge with existing tags
      tags = {};
      
      // Most update operations need an identifier and the resource data
      // Use the specific parameter type if available
      if (paramType && paramValue) {
        if (req.body && req.body[resourceTag]) {
          console.log(`Request body has ${resourceTag} wrapper, but we'll use direct parameters instead`);
          // For update operations, don't use the wrapper - use direct parameters
          tags = {
            ...req.body[resourceTag],
            [paramType]: paramValue,
          };
        } else {
          console.log(`Using direct request body with ${paramType} parameter`);
          // Set the parameters directly without wrapper
          tags = {
            ...req.body,
            [paramType]: paramValue,
          };
        }
      } else {
        // UUID is required for update operations if no parameter is provided
        if (req.body && req.body[resourceTag]) {
          console.log(`Request body has ${resourceTag} wrapper, but we'll use direct parameters`);
          // For update operations, don't use the wrapper
          tags = { ...req.body[resourceTag] };
          
          // Check if UUID is provided
          if (!tags.uuid) {
            console.warn(`No UUID provided for ${method} operation. This may fail.`);
          }
        } else {
          console.log(`Using direct request body without wrapper`);
          // Use the request body directly
          tags = { ...req.body };
          
          // Check if UUID is provided
          if (!tags.uuid) {
            console.warn(`No UUID provided for ${method} operation. This may fail.`);
          }
        }
      }
    } else if (method.toLowerCase().startsWith("remove") || method.toLowerCase().startsWith("delete")) {
      // For delete methods, we need the appropriate identifier
      // Check if we have URL parameters
      if (paramValue) {
        console.log(`Using URL parameter ${paramType}=${paramValue} for ${method}`);
        
        // Use the specific parameter type if available
        if (paramType) {
          // Add the parameter to existing tags
          tags[paramType] = paramValue;
        } else {
          // Use uuid as the default parameter type
          console.log(`No parameter type specified, defaulting to uuid`);
          tags.uuid = paramValue;
        }
      } 
      // If no URL parameters, check if body contains an identifier
      else if (req.body) {
        console.log(`Checking request body for identifiers: ${JSON.stringify(req.body)}`);
        
        // Check if any identifiers are in the body
        const hasName = req.body.name && req.body.name !== '';
        const hasUuid = req.body.uuid && req.body.uuid !== '';
        
        if (hasName) {
          console.log(`Using name=${req.body.name} from request body`);
          tags.name = req.body.name;
        } else if (hasUuid) {
          console.log(`Using uuid=${req.body.uuid} from request body`);
          tags.uuid = req.body.uuid;
        } else {
          // No identifiers found
          return res.status(400).json({
            error: "BAD_REQUEST",
            message: "An identifier (name or uuid) is required in either URL parameters or request body for delete operations",
            statusCode: 400,
          });
        }
      } else {
        // No parameters provided
        return res.status(400).json({
          error: "BAD_REQUEST",
          message: "An identifier (name or uuid) is required for delete operations",
          statusCode: 400,
        });
      }
    } else if (method.toLowerCase().startsWith('apply') || 
               method.toLowerCase().startsWith('reset') || 
               method.toLowerCase().startsWith('do')) {
      // Special handling for apply/reset/do operations - we want a simple format
      console.log(`Special handling for ${method} operation`);
      console.log(`Request body for ${method}:`, JSON.stringify(req.body, null, 2));

      // Get the operation type for error messages
      const operationType = method.toLowerCase().startsWith('apply') ? 'apply' : 
                          method.toLowerCase().startsWith('reset') ? 'reset' : 'do';

      // Create the tags object - don't use any wrappers
      tags = {};

      // Check if we have URL parameters first
      if (paramValue) {
        console.log(`Using URL parameter ${paramType}=${paramValue} for ${method}`);
        
        // Create basic request with parameter
        if (paramType) {
          // Use the parameter type from URL
          tags[paramType] = paramValue;
        } else {
          // Default to uuid
          tags.uuid = paramValue;
        }
      }
      // Otherwise, check the request body for simple format
      else if (req.body) {
        console.log(`Checking request body for ${method}`);
        
        // Check for direct name/uuid properties only (strict format)
        const hasName = req.body.name && req.body.name !== '';
        const hasUuid = req.body.uuid && req.body.uuid !== '';
        
        if (hasName) {
          tags.name = req.body.name;
        }
        
        if (hasUuid) {
          tags.uuid = req.body.uuid;
        }
        
        // Copy any additional properties from body to tags
        // This handles parameters like doDeviceLogin's loginDuration
        Object.keys(req.body).forEach(key => {
          if (key !== 'name' && key !== 'uuid') {
            tags[key] = req.body[key];
          }
        });
        
        // For 'do' operations, allow empty body attempts - the backend will validate
        // Only enforce identifier requirement for apply and reset operations
        if (!hasName && !hasUuid && 
            !method.toLowerCase().startsWith('do')) {
          // No valid identifiers found and not a 'do' operation
          return res.status(400).json({
            error: "BAD_REQUEST",
            message: `An identifier (name or uuid) is required for ${operationType} operations at the root level: { "name": "Example-Name", "uuid": "" }`,
            statusCode: 400,
          });
        }
        
        console.log(`Identifiers for ${method}:`, tags);
      } else {
        // No parameters provided
        return res.status(400).json({
          error: "BAD_REQUEST",
          message: `An identifier (name or uuid) is required for ${operationType} operations`,
          statusCode: 400,
        });
      }

      console.log(`Final ${method} tags:`, JSON.stringify(tags, null, 2));
    } else {
      // For other methods, use a combination of params, query, and body
      console.log(`Handling operation: ${method}, HTTP method: ${req.method}`);

      const paramsObj = { ...req.params };
      delete paramsObj.method; // Remove method from the params

      // Merge with existing tags from getOperationTags
      tags = {
        ...tags,
        ...paramsObj,
        ...req.query,
        ...req.body,
      };
    }

    try {
      // Check if we need to process template variables
      const dataContainerIdentifierTails = process.env.DATACONTAINERIDENTIFIERTAILS || '_data';
      
      // Debug the environment variable
      console.log(`Using dataContainerIdentifierTails: ${dataContainerIdentifierTails}`);
      
      // Stringify the tags for analysis
      const tagsString = JSON.stringify(tags);
      console.log(`Tags string for analysis (length ${tagsString.length}):`);
      console.log(tagsString);
      
      // Look for _data fields in the tags object with more specific search
      const hasDataFields = tagsString.includes(`"${dataContainerIdentifierTails}"`);
      console.log(`Does tags include "${dataContainerIdentifierTails}"? ${hasDataFields}`);
      
      // Additional check with the direct key path
      const hasFieldsAlt = tagsString.includes(`"_data":`);
      console.log(`Does tags include "_data:" specifically? ${hasFieldsAlt}`);
      
      if (hasDataFields || hasFieldsAlt) {
        console.log(`Found template variables in tags, processing with custom template processor...`);
        try {
          // Process template variables with our custom function
          let processedTags = processTemplateVariables(tags, dataContainerIdentifierTails);
          console.log(`Processed tags with template processor:`, JSON.stringify(processedTags, null, 2));
          
          // Assign the processed tags back to tags
          tags = processedTags;
        } catch (templateError) {
          console.error(`Error processing template variables:`, templateError);
          // Continue with original tags if processing fails
        }
      } else {
        console.log(`No template variables found in tags, skipping template processing.`);
      }
      
      // Execute the AXL operation
      console.log(`Executing operation ${method} with tags:`, JSON.stringify(tags, null, 2));
      const result = await axlClient.executeOperation(method, tags);
      if (!result) {
        console.log(`No result returned for operation ${method}`);
        return res.status(200).json({
          message: `No content returned for operation ${method}`,
          statusCode: 200,
        });
      } else {
        console.log(`Operation ${method} executed successfully, result:`, JSON.stringify(result, null, 2).substring(0, 200) + "...");
        // Return the result
        res.status(200).json(result);
      }
    } catch (execError: any) {
      console.error(`Error executing operation ${method}:`, execError);

      if (execError.message && execError.message.includes("ECONNREFUSED")) {
        console.log(`Connection error for ${method}`);

        return res.status(503).json({
          error: "SERVICE_UNAVAILABLE",
          message: "Cannot connect to CUCM server. Please check your connection and credentials.",
          statusCode: 503,
          serverInfo: `${axlConfig.host} (version ${axlConfig.version})`,
        });
      }

      // Handle SOAP errors with improved format
      if (execError.response && execError.response.data) {
        const soapError = execError.response.data;

        // Check if it's a structured SOAP fault
        if (soapError.faultcode && soapError.faultstring) {
          return res.status(400).json({
            error: "AXL_ERROR",
            message: soapError.faultstring,
            detail: soapError.detail,
            statusCode: 400,
            operation: method,
            params: tags,
          });
        } else {
          // Fall back to generic error format
          return res.status(400).json({
            error: "AXL_ERROR",
            message: typeof soapError === "object" ? JSON.stringify(soapError) : soapError,
            statusCode: 400,
            operation: method,
            params: tags,
          });
        }
      }

      throw execError; // Re-throw to be caught by the outer catch block
    }
  } catch (error: any) {
    // Enhance the error with status code
    if (error.message && error.message.includes("not found")) {
      error.statusCode = 404;
    } else if (error.message && error.message.includes("already exists")) {
      error.statusCode = 409;
    } else if (error.message && (error.message.includes("invalid") || error.message.includes("missing required"))) {
      error.statusCode = 400;
    } else {
      error.statusCode = 500;
    }
    next(error);
  }
}

// Get all available AXL methods
async function getAvailableMethods(req: Request, res: Response, next: NextFunction) {
  try {
    console.log("Getting available methods");

    // Use the returnOperations method to get available operations
    // Can use an optional filter parameter if provided in the query
    const filterParam = req.query.filter as string | undefined;

    try {
      const operations = await axlClient.returnOperations(filterParam);
      console.log(`Found ${operations.length} operations`);

      // Transform operations into API endpoints
      const endpoints = operations.map((op: string) => {
        const { httpMethod, route } = mapAxlMethodToHttp(op);
        return {
          axlMethod: op,
          httpMethod: httpMethod.toUpperCase(),
          endpoint: `/api/axl/${route}`,
          usage: `${httpMethod.toUpperCase()} /api/axl/${route}`,
        };
      });

      res.status(200).json({
        count: endpoints.length,
        endpoints,
      });
    } catch (opError) {
      console.error("Error getting operations:", opError);

      // Return an empty array rather than failing
      res.status(200).json({
        count: 0,
        endpoints: [],
        error: "Error retrieving operations. CUCM connection may be unavailable.",
      });
    }
  } catch (error: any) {
    console.error("Unexpected error in getAvailableMethods:", error);

    // Return an empty response instead of failing
    res.status(200).json({
      count: 0,
      endpoints: [],
      error: error.message || "Unexpected error occurred",
    });
  }
}

// Get operation tags/parameters for a specific method
async function getMethodParameters(req: Request, res: Response, next: NextFunction) {
  try {
    const method = req.params.method as string;

    if (!method) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Method name is required",
        statusCode: 400,
      });
    }

    // Get the tags structure for this operation
    const tags = await axlClient.getOperationTags(method);

    res.status(200).json({
      method,
      parameters: tags,
    });
  } catch (error: any) {
    next(error);
  }
}


// Create dynamic routes for all AXL methods
export async function createDynamicRoutes(app: Express) {
  try {
    console.log("Setting up dynamic routes...");

    // Create metadata endpoints
    app.get("/api/axl/methods", (req: Request, res: Response, next: NextFunction) => {
      getAvailableMethods(req, res, next);
    });

    // Add metadata endpoint to Swagger
    addPathToSwagger("getAvailableMethods", "/api/axl/methods", "get", "Get all available AXL methods");

    app.get("/api/axl/methods/:method/parameters", (req: Request, res: Response, next: NextFunction) => {
      getMethodParameters(req, res, next);
    });

    // Add parameters endpoint to Swagger
    addPathToSwagger("getMethodParameters", "/api/axl/methods/{method}/parameters", "get", "Get parameters for a specific AXL method");


    // Add a debug endpoint to check available operations
    app.get("/api/debug/operations", async (req: Request, res: Response) => {
      try {
        const filter = (req.query.filter as string) || "";
        const operations = await axlClient.returnOperations();

        // Filter operations if a filter is provided
        const filteredOperations = filter ? operations.filter((op: string) => op.toLowerCase().includes(filter.toLowerCase())) : operations;

        res.status(200).json({
          count: filteredOperations.length,
          operations: filteredOperations,
        });
      } catch (error) {
        console.error("Error getting operations:", error);
        res.status(500).json({ error: "Failed to get operations" });
      }
    });

    // Variable to store all operations for swagger update
    let allOperations: string[] = [];

    try {
      // Try to get operations using returnOperations
      console.log("Getting AXL operations...");
      const operations = await axlClient.returnOperations();
      console.log(`Found ${operations.length} AXL operations`);

      // Save all operations for swagger update
      allOperations = operations;

      console.log(`Using ${allOperations.length} operations for routes`);

      // First sort operations so that list* operations are processed before get* operations
      // This ensures that in cases where routes might conflict, the list routes are registered first
      const sortedOperations = [...allOperations].sort((a, b) => {
        if (a.toLowerCase().startsWith('list') && b.toLowerCase().startsWith('get')) return -1;
        if (b.toLowerCase().startsWith('list') && a.toLowerCase().startsWith('get')) return 1;
        return a.localeCompare(b);
      });

      // Create dynamic routes for each operation
      sortedOperations.forEach((operation: string) => {
        const { httpMethod, route } = mapAxlMethodToHttp(operation);
        const routePath = `/api/axl/${route}`;
        const isGetOperation = operation.toLowerCase().startsWith('get') && httpMethod === 'get';

        console.log(`Setting up route: ${httpMethod.toUpperCase()} ${routePath}`);

        // For operations that have plural form (list*), always register the base route
        // For singular get* operations, only register parameterized routes (below)
        if (!isGetOperation) {
          app[httpMethod](routePath, (req: Request, res: Response, next: NextFunction) => {
            // Add the method to the params
            (req.params as any).method = operation;
            executeAxlOperation(req, res, next);
          });
        } else {
          console.log(`Skipping non-parameterized route for ${operation} since it requires parameters`);
        }

        // Also register a GET endpoint for viewing resources (for add* operations)
        if (httpMethod === "put") {
          console.log(`Also registering GET route for: ${routePath}`);
          app.get(routePath, (req: Request, res: Response, next: NextFunction) => {
            // For GET on an addX endpoint, transform to a listX operation
            const listOperation = operation.replace("add", "list");
            (req.params as any).method = listOperation;
            executeAxlOperation(req, res, next);
          });
        }

        // Add the route to Swagger only if it's not a GET operation that starts with 'get'
        if (!isGetOperation) {
          addPathToSwagger(operation, routePath, httpMethod, `Execute ${operation} AXL operation`);
        }

        // For operations that typically accept parameters, register a single dynamic parameter route
        if (httpMethod === "get" || httpMethod === "patch" || httpMethod === "delete") {
          // Create a single unified dynamic parameter route
          const paramRoutePath = `${routePath}/:parameter/:value`;
          const swaggerParamPath = `${routePath}/{parameter}/{value}`; // Swagger uses {} for path params

          console.log(`Setting up dynamic parameter route: ${httpMethod.toUpperCase()} ${paramRoutePath}`);

          app[httpMethod](paramRoutePath, (req: Request, res: Response, next: NextFunction) => {
            // Add the method to the params
            (req.params as any).method = operation;
            executeAxlOperation(req, res, next);
          });

          // Add the dynamic parameter route to Swagger
          // For get operations, this is the only route that should be in Swagger
          let description = isGetOperation
            ? `Execute ${operation} AXL operation (requires parameter)`
            : `Execute ${operation} AXL operation with any specified parameter type`;

          // Add wildcard note ONLY for list* operations, not get* operations
          if (operation.toLowerCase().startsWith('list')) {
            description += `\n\n**Wildcard Searches:** You can use the '%' character at the beginning or end of your search value for partial matching.
For example: \`/api/axl/${route}/name/ABC%\` will find all items where the name starts with "ABC".`;
          }

          addPathToSwagger(
            operation,  // Use the actual operation name instead of adding "ByDynamicParameter"
            swaggerParamPath,
            httpMethod,
            description
          );
        }
      });

      console.log(`Set up ${allOperations.length} route(s) for AXL operations`);
    } catch (axlError) {
      console.error("Error getting AXL operations:", axlError);

      // If we can't get operations, log error but don't create fallback routes
      console.log("Unable to get operations from CUCM. Ensure CUCM server is accessible and credentials are correct.");

      // Return empty operations array - routes will be created when CUCM connection is available
      allOperations = [];
    }

    // Debugging route - this will help troubleshoot Swagger issues
    app.get("/api/debug/routes", (req: Request, res: Response) => {
      // Get all registered routes
      const routes: any[] = [];

      app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
          // Routes registered directly on the app
          const path = middleware.route.path;
          const methods = Object.keys(middleware.route.methods)
            .filter((method) => middleware.route.methods[method])
            .map((method) => method.toUpperCase());

          routes.push({
            path,
            methods,
            type: "route",
          });
        } else if (middleware.name === "router") {
          // Routes registered in a router
          middleware.handle.stack.forEach((handler: any) => {
            if (handler.route) {
              const path = handler.route.path;
              const methods = Object.keys(handler.route.methods)
                .filter((method) => handler.route.methods[method])
                .map((method) => method.toUpperCase());

              routes.push({
                path,
                methods,
                type: "router",
              });
            }
          });
        }
      });

      res.status(200).json({
        routeCount: routes.length,
        routes,
      });
    });

    // After you register all routes, update the Swagger file
    await updateSwaggerFile(allOperations);
  } catch (error) {
    console.error("Failed to create dynamic routes:", error);
    throw error;
  }
}

// After you register all routes, update the Swagger file
async function updateSwaggerFile(operations: string[]) {
  try {
    // Read the existing swagger file
    const swaggerPath = path.join(process.cwd(), "swagger-output.json");

    // If the file doesn't exist, create a basic structure
    let swaggerFile: any;
    try {
      swaggerFile = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
    } catch (readError) {
      console.log("Creating new swagger file");
      swaggerFile = {
        openapi: "3.0.0",
        info: {
          title: "Cisco AXL REST API",
          version: packageInfo.version,
          description: packageInfo.description,
        },
        servers: [
          {
            url: "http://localhost:3000",
            description: "Development server",
          },
        ],
        paths: {},
        components: {
          schemas: {
            ErrorResponse: {
              type: "object",
              properties: {
                error: { type: "string" },
                message: { type: "string" },
                statusCode: { type: "number" },
                path: { type: "string" },
              },
            },
          },
        },
      };
    }

    // Ensure paths object exists
    if (!swaggerFile.paths) {
      swaggerFile.paths = {};
    }

    // Process each operation
    operations.forEach((operation) => {
      const { httpMethod, route } = mapAxlMethodToHttp(operation);
      const routePath = `/api/axl/${route}`;
      const resourceTag = getResourceTagFromMethod(operation);

      // Add to swagger paths
      if (!swaggerFile.paths[routePath]) {
        swaggerFile.paths[routePath] = {};
      }

      // Generate description using utility function
      const baseDescription = httpMethod === "get" 
        ? `Returns all available ${route} resources` 
        : `Execute ${operation} AXL operation`;
      
      const pathDescription = generatePathDescription(
        httpMethod,
        operation,
        routePath,
        baseDescription
      );

      swaggerFile.paths[routePath][httpMethod] = {
        summary: generateSummary(httpMethod, routePath, operation),
        description: pathDescription,
        tags: generateTags(operation, routePath),
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      };

      // If it's a non-GET method, add a request body with examples
      if (httpMethod !== "get") {
        // Create examples using utility function
        // Pass the operation name for special handling of apply operations
        const examples = generateExamples(httpMethod, resourceTag, operation);
        
        // Delete operations may have a body, but it's not required
        // Apply operations should also have optional body
        const isRequired = !['delete', 'post'].includes(httpMethod.toLowerCase()) || 
                          !(operation && operation.toLowerCase().startsWith('apply'));

        swaggerFile.paths[routePath][httpMethod].requestBody = {
          required: isRequired,
          content: {
            "application/json": {
              schema: {
                type: "object",
              },
              examples: examples,
            },
          },
        };
      }

      // Add a single dynamic parameter route for applicable operations
      if (httpMethod === "get" || httpMethod === "patch" || httpMethod === "delete") {
        // Add the dynamic parameter path
        const paramPath = `${routePath}/{parameter}/{value}`;

        if (!swaggerFile.paths[paramPath]) {
          swaggerFile.paths[paramPath] = {};
        }

        // Generate description for parameter path
        const paramBaseDescription = `Filter ${route} resources by specified parameter type and value`;
        
        const paramPathDescription = generatePathDescription(
          httpMethod,
          operation,
          paramPath,
          paramBaseDescription,
          true // parameters = true
        );

        swaggerFile.paths[paramPath][httpMethod] = {
          summary: generateSummary(httpMethod, paramPath, operation),
          description: paramPathDescription,
          tags: generateTags(operation, routePath),
          parameters: [
            {
              name: "parameter",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
              description: "Parameter type to identify the resource (uuid, name, etc.)",
            },
            {
              name: "value",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
              description: "Value of the parameter to identify the resource",
            },
          ],
          responses: {
            "200": {
              description: "Successful operation",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        };
      }
    });

    // Write the updated swagger file
    fs.writeFileSync(swaggerPath, JSON.stringify(swaggerFile, null, 2));
    console.log(`Updated Swagger file with ${operations.length} operations`);
  } catch (error) {
    console.error("Error updating Swagger file:", error);
  }
}
