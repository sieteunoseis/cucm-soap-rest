import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { getExampleForResource } from './resource-examples';
import { getResourceTagFromMethod } from './method-mapper';

// Define explicit type for Swagger spec
interface SwaggerSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
  };
}

// Create a basic Swagger spec
export const swaggerSpec: SwaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Cisco AXL REST API',
    version: '1.0.0',
    description: 'A dynamic REST API for Cisco Administrative XML (AXL) operations',
  },
  servers: [
    {
      url: '',
      description: 'API Base URL',
    },
  ],
  paths: {},
  components: {
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'number' },
          path: { type: 'string' },
        },
      },
    },
  },
};

// Flag to track if we've already written to the debug file
let debugFileWritten = false;

export function setupSwagger(app: Express): void { // Keeping function name for backward compatibility
  // Custom Swagger UI options
  const options = {
    explorer: true,
    swaggerOptions: {
      displayRequestDuration: true,
      docExpansion: 'list', // 'list', 'full', or 'none'
      filter: true,
      showExtensions: true,
      validatorUrl: null, // Disable validation
      persistAuthorization: true,
      tagsSorter: 'alpha', // Sort tags alphabetically
      // Use a string value to avoid TypeScript issues
      operationsSorter: 'method',
      // This will be overridden with a custom function in the UI itself that orders them:
      // GET -> PUT -> PATCH -> DELETE -> POST
    },
    customCss: '.topbar-wrapper img { content: url("https://www.cisco.com/web/fw/i/cisco-logo-blue.gif"); }',
    customSiteTitle: "Cisco AXL REST API",
    customfavIcon: "https://www.cisco.com/favicon.ico",
    customJs: [] as string[],
    customCssUrl: [] as string[]
  };

  // Add an HTML block to point users to the method explorer
  options.customCssUrl = [
    "https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"
  ];

  options.customJs = [
    "https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"
  ];

  options.customCss += `
    .swagger-ui .info { padding: 30px 0; }
    .swagger-ui .info .title { font-weight: bold; }
    .method-explorer-banner {
      background-color: #f0f8ff;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
      border-left: 5px solid #4990e2;
    }
    .method-explorer-banner a {
      font-weight: bold;
      color: #4990e2;
    }
  `;
  
  // Update the script to fetch methods and handle all edge cases
  options.customJs.push(`
  (function() {
    window.addEventListener('load', function() {
      const dropdown = document.getElementById('method-select');
      const tagsContainer = document.getElementById('tags-json');
      const methodDetails = document.getElementById('method-details');

      if (!dropdown) {
        console.error('Could not find dropdown element');
        return;
      }

      // Show loading state
      dropdown.innerHTML = '<option value="">Loading methods...</option>';
      
      // Fetch methods and populate dropdown
      fetch('/api/debug/operations')
        .then(response => {
          console.log('Response status:', response.status);
          return response.json();
        })
        .then(data => {
          console.log('Debug operations data:', data);
          
          // Clear loading state
          dropdown.innerHTML = '<option value="">-- Select a method --</option>';
          
          if (data.operations && Array.isArray(data.operations)) {
            // Sort operations alphabetically
            data.operations.sort().forEach(operation => {
              const option = document.createElement('option');
              option.value = operation;
              option.textContent = operation;
              dropdown.appendChild(option);
            });
            console.log(\`Populated dropdown with \${data.operations.length} methods\`);
          } else {
            console.error('No operations array in response:', data);
            dropdown.innerHTML = '<option value="">No methods available</option>';
          }
        })
        .catch(error => {
          console.error('Error fetching methods:', error);
          dropdown.innerHTML = '<option value="">Error loading methods</option>';
        });

      // Show/hide method details and handle parameters
      dropdown.addEventListener('change', function() {
        const selectedMethod = dropdown.value;
        methodDetails.style.display = selectedMethod ? 'block' : 'none';
        
        if (selectedMethod) {
          document.querySelector('#selected-method span').textContent = selectedMethod;
          
          // Fetch parameters for the selected method
          fetch(\`/api/axl/methods/\${selectedMethod}/parameters\`)
            .then(response => response.json())
            .then(data => {
              tagsContainer.innerHTML = '';
              if (data.parameters) {
                tagsContainer.textContent = JSON.stringify(data.parameters, null, 2);
              } else {
                tagsContainer.textContent = 'No parameters available';
              }
            })
            .catch(error => {
              console.error('Error fetching parameters:', error);
              tagsContainer.textContent = 'Error loading parameters';
            });
        }
      });
    });
  })();
`);
  
  // Serve raw JSON spec for debugging
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  // Create a static HTML file for direct access
  app.get('/api-explorer', (req: Request, res: Response) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Cisco AXL REST API - API Explorer</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }

        /* Method explorer styling - designed to match Swagger UI */
        :root {
          --swagger-ui-font: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;
        }

        #method-explorer {
          width: 100%; /* Full width to match Swagger UI */
          max-width: 1460px; /* Match Swagger UI's actual container width */
          padding: 20px 20px; /* Remove horizontal padding to match Swagger UI */
          margin: 0 auto; /* Center content like Swagger UI */
          font-family: var(--swagger-ui-font);
          background-color: white;
        }

        /* Match the Swagger UI title style exactly */
        #method-explorer h3.explorer-title {
          color: #3b4151;
          font-family: sans-serif;
          font-size: 36px;
          margin: 0;
          font-weight: bold; /* Changed to bold */
        }

        #method-explorer h3:not(.explorer-title) {
          font-size: 24px;
          font-weight: 600;
          margin-top: 10px;
          margin-bottom: 15px;
          color: #3b4151;
          font-family: var(--swagger-ui-font);
        }

        #method-explorer h4 {
          font-size: 16px;
          font-weight: 600;
          margin: 15px 0 5px 0;
          color: #3b4151;
          font-family: var(--swagger-ui-font);
        }

        #method-explorer p {
          font-size: 14px;
          color: #3b4151;
          font-family: var(--swagger-ui-font);
          margin-bottom: 16px;
        }

        #method-select {
          width: 100%;
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          margin-bottom: 15px;
          font-family: var(--swagger-ui-font);
          color: #3b4151;
        }

        #method-details {
          margin-top: 20px;
          padding: 15px;
          border: 1px solid #d8dde7;
          border-radius: 4px;
          background-color: #f8f9fa;
          display: none;
        }

        .method-tags {
          font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
          white-space: pre;
          overflow-x: auto;
          max-height: 400px;
          background-color: rgb(41, 44, 51);
          color: #fff;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
          line-height: 1.4;
        }

        .endpoint-url {
          font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
          font-size: 13px;
          font-weight: 600;
          color: #49cc90; /* Green color used in Swagger UI for GET */
          padding: 4px 6px;
          border-radius: 3px;
          background-color: rgba(73, 204, 144, 0.1);
          display: inline-block;
        }

        .loading {
          color: #999;
          font-style: italic;
        }

        button {
          background-color: #4990e2;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-family: var(--swagger-ui-font);
          font-weight: 500;
        }

        button:hover {
          background-color: #3a7fd5;
        }

        .filter-container {
          display: flex;
          margin-bottom: 20px;
          gap: 10px;
          align-items: center;
        }

        #filter-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          font-size: 14px;
          font-family: var(--swagger-ui-font);
        }
      </style>
    </head>
    <body>
      <!-- Method Explorer Component -->
      <div id="method-explorer">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="explorer-title">AXL Method Explorer</h3>
        </div>

        <p>This explorer helps you discover available AXL methods and their required parameters. Select a method to see details.</p>

        <div class="filter-container">
          <input id="filter-input" type="text" placeholder="Filter methods by name..." />
          <button id="filter-button">Apply Filter</button>
        </div>

        <select id="method-select">
          <option value="">-- Select a method --</option>
        </select>

        <div id="method-details">
          <h3 id="selected-method">Method: <span></span></h3>
          <p>Corresponding endpoint: <span class="endpoint-url" id="endpoint-url"></span></p>
          <h4>Required Parameters:</h4>
          <div class="method-tags" id="tags-json"></div>
        </div>
      </div>

      <div style="height: 30px;"></div><!-- Spacer between Method Explorer and Swagger UI -->

      <div id="swagger-ui"></div>

      <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-standalone-preset.js"></script>
      <script>
        // Initialize method explorer dropdown
        window.addEventListener('load', function() {
          const dropdown = document.getElementById('method-select');
          const tagsContainer = document.getElementById('tags-json');
          const methodDetails = document.getElementById('method-details');
          const endpointUrl = document.getElementById('endpoint-url');
          const filterInput = document.getElementById('filter-input');
          const filterButton = document.getElementById('filter-button');

          if (!dropdown) {
            console.error('Could not find dropdown element');
            return;
          }

          // Show loading state
          dropdown.innerHTML = '<option value="">Loading methods...</option>';

          // Function to load methods with optional filter
          function loadMethods(filter = '') {
            const url = filter ? \`/api/debug/operations?filter=\${encodeURIComponent(filter)}\` : '/api/debug/operations';

            // Fetch methods and populate dropdown
            fetch(url)
              .then(response => {
                console.log('Response status:', response.status);
                return response.json();
              })
              .then(data => {
                console.log('Debug operations data:', data);

                // Clear loading state
                dropdown.innerHTML = '<option value="">-- Select a method --</option>';

                if (data.operations && Array.isArray(data.operations)) {
                  // Sort operations alphabetically
                  data.operations.sort().forEach(operation => {
                    const option = document.createElement('option');
                    option.value = operation;
                    option.textContent = operation;
                    dropdown.appendChild(option);
                  });
                  console.log(\`Populated dropdown with \${data.operations.length} methods\`);
                } else {
                  console.error('No operations array in response:', data);
                  dropdown.innerHTML = '<option value="">No methods available</option>';
                }
              })
              .catch(error => {
                console.error('Error fetching methods:', error);
                dropdown.innerHTML = '<option value="">Error loading methods</option>';
              });
          }

          // Initialize with all methods
          loadMethods();

          // Handle filter button click
          if (filterButton && filterInput) {
            filterButton.addEventListener('click', function() {
              loadMethods(filterInput.value);
            });

            // Also handle enter key in input
            filterInput.addEventListener('keyup', function(event) {
              if (event.key === 'Enter') {
                loadMethods(filterInput.value);
              }
            });
          }

          // Show/hide method details and handle parameters
          dropdown.addEventListener('change', function() {
            const selectedMethod = dropdown.value;

            if (methodDetails) {
              methodDetails.style.display = selectedMethod ? 'block' : 'none';
            }

            if (selectedMethod) {
              // Update method name display
              const methodNameSpan = document.querySelector('#selected-method span');
              if (methodNameSpan) {
                methodNameSpan.textContent = selectedMethod;
              }

              // Determine HTTP method and path for endpoint URL display
              const httpMethodMap = {
                'get': 'GET',
                'list': 'GET',
                'add': 'PUT',
                'update': 'PATCH',
                'remove': 'DELETE',
                'delete': 'DELETE'
              };

              let httpMethod = 'POST'; // Default
              let resourcePath = selectedMethod.toLowerCase();

              // Extract method type and resource
              for (const prefix in httpMethodMap) {
                if (selectedMethod.toLowerCase().startsWith(prefix)) {
                  httpMethod = httpMethodMap[prefix];
                  resourcePath = selectedMethod.substring(prefix.length);
                  break;
                }
              }

              // Make resource path lowercase for URL
              resourcePath = resourcePath.charAt(0).toLowerCase() + resourcePath.slice(1);

              // Update endpoint URL
              if (endpointUrl) {
                endpointUrl.textContent = \`\${httpMethod} /api/axl/\${resourcePath}\`;
              }

              // Fetch parameters for the selected method
              fetch(\`/api/axl/methods/\${selectedMethod}/parameters\`)
                .then(response => response.json())
                .then(data => {
                  if (tagsContainer) {
                    tagsContainer.innerHTML = '';
                    if (data.parameters) {
                      tagsContainer.textContent = JSON.stringify(data.parameters, null, 2);
                    } else {
                      tagsContainer.textContent = 'No parameters available';
                    }
                  }
                })
                .catch(error => {
                  console.error('Error fetching parameters:', error);
                  if (tagsContainer) {
                    tagsContainer.textContent = 'Error loading parameters';
                  }
                });
            }
          });
        });

        // Static width approach - no dynamic width adjustment
        window.onload = function() {
          const ui = SwaggerUIBundle({
            url: "/api-docs.json",
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "BaseLayout",
            docExpansion: 'list',
            validatorUrl: null,
            tagsSorter: 'alpha', // Sort tags alphabetically
          });
        };

      </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });
  
  // Debug endpoint to write spec to file
  app.get('/api-docs/debug-file', (req: Request, res: Response) => {
    const specJson = JSON.stringify(swaggerSpec, null, 2);
    const debugPath = path.join(process.cwd(), 'swagger-spec.json');
    fs.writeFileSync(debugPath, specJson);
    
    res.status(200).json({
      message: 'Swagger spec debug file created',
      path: debugPath,
      pathCount: Object.keys(swaggerSpec.paths).length,
      paths: Object.keys(swaggerSpec.paths),
    });
  });
  
  console.log('API documentation available at:');
  console.log('- /api-explorer (API Explorer UI)');
  console.log('- /api-docs.json (Raw JSON)');
}

// Dynamically add paths to the API spec
export function addPathToSwagger( // Keeping function name for backward compatibility
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
  // ID parameter has been removed - now using only the dynamic parameter pattern

  // Extract the proper camelCase resource tag from the method
  const resourceTag = getResourceTagFromMethod(method);

  // Add request body for non-GET methods with examples
  if (httpMethod.toLowerCase() !== 'get' && httpMethod.toLowerCase() !== 'delete') {
    requestBody = {
      description: 'Request payload for the operation',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object'
          },
          examples: getExampleForResource(typeof path === 'string' ? path.split('/')[3] || '' : '')
        }
      }
    };
  }

  // Ensure the path exists in the spec
  if (!swaggerSpec.paths[path]) {
    swaggerSpec.paths[path] = {};
  }

  // Add notes about case-sensitive handling
  let pathDescription = httpMethod.toLowerCase() === 'get' && parameters.length === 0
    ? `${description} - Returns all available ${typeof path === 'string' ? path.split('/')[3] || '' : ''} resources`
    : description;

  // For PUT and PATCH methods, add case-sensitive note
  if (httpMethod.toLowerCase() === 'put' || httpMethod.toLowerCase() === 'patch') {
    pathDescription += `\n\n**IMPORTANT - Case-Sensitive Resource Names:** This endpoint requires the exact camelCase for resource names.
    For this endpoint, use \`${resourceTag}\` as the resource key (not \`${typeof path === 'string' ? path.split('/')[3] || '' : ''}\`).
    For example: \`{ "${resourceTag}": { "name": "Example" } }\`
    See the examples below for proper request structure.`;
  }

  // Add the operation details
  if (typeof path === 'string') {
    // Check if path is a valid URL path
    if (path.includes('https://git.new') || path.includes('://')) {
      console.error(`Invalid path detected: ${path}`);
      return;
    }

    swaggerSpec.paths[path][httpMethod.toLowerCase()] = {
      summary: `${httpMethod.toUpperCase()} ${path}`,
      description: pathDescription,
      tags: [path.split('/')[3] || 'axl'], // Use the URL path resource name as the tag
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
  }
  
  console.log(`Swagger paths count: ${Object.keys(swaggerSpec.paths).length}`);
}