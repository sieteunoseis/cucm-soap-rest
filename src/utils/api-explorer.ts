import { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getExampleForResource } from './file-examples';
import { getResourceTagFromMethod } from './method-mapper';
import { packageInfo } from './version';
import { isAuthenticated } from '../middleware/auth.middleware';
import { apiKeyConfig } from '../middleware/apikey.middleware';

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
    version: packageInfo.version,
    description: packageInfo.description,
  },
  servers: [
    {
      url: '/',
      description: 'API Base URL (relative path)',
    }
  ],
  paths: {},
  components: {
    // Add security schemes if API key authentication is enabled
    ...(apiKeyConfig.enabled ? {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: apiKeyConfig.keyName,
          in: apiKeyConfig.location,
          description: `API key for authorization. Required when using Kong API Gateway. Provide your API key in the ${apiKeyConfig.location} parameter '${apiKeyConfig.keyName}'. For development, you can use: '${apiKeyConfig.devKey}'`
        }
      }
    } : {}),
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
  // Add global security if API key authentication is enabled
  ...(apiKeyConfig.enabled ? {
    security: [
      {
        apiKey: []
      }
    ]
  } : {})
};

// Flag to track if we've already written to the debug file
let debugFileWritten = false;

export function setupSwagger(app: Express): void { // Keeping function name for backward compatibility
  // Custom Swagger UI options
  const options = {
    explorer: true,
    swaggerOptions: {
      displayRequestDuration: true,
      docExpansion: 'none', // 'list', 'full', or 'none' - controls initial expansion state
      filter: true,
      showExtensions: true,
      validatorUrl: null, // Disable validation
      persistAuthorization: true,
      tagsSorter: 'alpha', // Sort tags alphabetically
      // Use a string value to avoid TypeScript issues
      operationsSorter: 'method',
      deepLinking: true,
      // This will be overridden with a custom function in the UI itself that orders them:
      // GET -> PATCH -> DELETE -> POST
    },
    customCss: `
      .topbar-wrapper img { content: url("/logo.png"); }
      /* Improve visibility of expanded operations */
      .swagger-ui .opblock.is-open {
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        border-radius: 4px;
        margin-bottom: 15px;
      }
      /* Highlight the operation when expanded */
      .swagger-ui .opblock.is-open .opblock-summary {
        border-bottom: 1px solid rgba(59,65,81,0.3);
      }
      /* Back to Top Button */
      #back-to-top {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #4990e2;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        text-align: center;
        line-height: 40px;
        font-size: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        cursor: pointer;
        z-index: 1000;
        opacity: 0;
        transition: all 0.3s ease-in-out;
      }
      #back-to-top:hover {
        background-color: #3a7fd5;
        transform: translateY(-3px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      }
      #back-to-top.visible {
        opacity: 1;
      }
      #back-to-top::after {
        content: 'Back to top';
        position: absolute;
        top: -35px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0,0,0,0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
        pointer-events: none;
      }
      #back-to-top:hover::after {
        opacity: 1;
      }
    `,
    customSiteTitle: "Cisco AXL REST API",
    customfavIcon: "/favicon.ico",
    customJs: [] as string[],
    customCssUrl: [] as string[]
  };

  // Add an HTML block to point users to the method explorer
  options.customCssUrl = [
    "https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css",
    "https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css"
  ];

  options.customJs = [
    "https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js",
    "https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js",
    "https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"
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
    .config-panel {
      background-color: #f8f9fa;
      border-left: 5px solid #4990e2;
      padding: 10px 15px;
      margin: 10px 0 20px 0;
      border-radius: 4px;
      font-family: sans-serif;
    }
    .config-panel h4 {
      margin-top: 0;
      margin-bottom: 8px;
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }
    .config-item {
      margin-right: 30px;
      margin-bottom: 5px;
      display: inline-block;
    }
    .status-connected {
      color: #198754;
      font-weight: 500;
    }
    .status-disconnected {
      color: #dc3545;
      font-weight: 500;
    }
  `;
  
  // Add HTML for config panel to be inserted into the UI
  options.customJs.push(`
    (function() {
      window.addEventListener('load', function() {
        // Create config panel
        const configPanel = document.createElement('div');
        configPanel.className = 'config-panel';
        configPanel.innerHTML = \`
          <h4>Configuration</h4>
          <div>
            <div class="config-item">
              <strong>CUCM Host:</strong> ${process.env.CUCM_HOST || 'Not configured'}
            </div>
            <div class="config-item">
              <strong>CUCM Version:</strong> ${process.env.CUCM_VERSION || 'Not configured'}
            </div>
            <div class="config-item">
              <strong>CUCM User:</strong> ${process.env.CUCM_USER || 'Not configured'}
            </div>
            <div class="config-item">
              <strong>Status:</strong> <span class="${isAuthenticated ? 'status-connected' : 'status-disconnected'}">${isAuthenticated ? 'Connected' : 'Disconnected'}</span>
            </div>
            ${apiKeyConfig.enabled ? `
            <div class="config-item">
              <strong>API Key Required:</strong> <span class="status-disconnected">Yes</span> (${apiKeyConfig.location}: ${apiKeyConfig.keyName})
            </div>
            <div class="config-item">
              <strong>Dev API Key:</strong> <span style="font-family: monospace;">${apiKeyConfig.devKey}</span>
            </div>` : ''}
          </div>
        \`;
        
        // Insert after title
        const infoContainer = document.querySelector('.swagger-ui .info');
        if (infoContainer) {
          infoContainer.appendChild(configPanel);
        }
        
        // Create back to top button
        const backToTopButton = document.createElement('div');
        backToTopButton.id = 'back-to-top';
        backToTopButton.innerHTML = '&#8593;'; // Up arrow
        backToTopButton.title = 'Back to top';
        document.body.appendChild(backToTopButton);
        
        // Handle back to top button click
        backToTopButton.addEventListener('click', function() {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        });
        
        // Show/hide back to top button based on scroll position
        window.addEventListener('scroll', function() {
          if (window.pageYOffset > 300) {
            backToTopButton.classList.add('visible');
          } else {
            backToTopButton.classList.remove('visible');
          }
        });
        
        // The code that prevented methods from collapsing has been removed
        // Swagger UI's native toggle functionality will now work properly
        console.log("Swagger UI initialized - operations can now be expanded and collapsed normally");
        setTimeout(() => {
          // We could add any other custom behavior here if needed
        }, 1000); // Give Swagger UI time to initialize
      });
    })();
  `);
  
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
          return response.json();
        })
        .then(data => {          
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
          } else {
            dropdown.innerHTML = '<option value="">No methods available</option>';
          }
        })
        .catch(error => {
          dropdown.innerHTML = '<option value="">Error loading methods</option>';
        });

      // Show/hide method details and handle parameters
      dropdown.addEventListener('change', function() {
        const selectedMethod = dropdown.value;
        methodDetails.style.display = selectedMethod ? 'block' : 'none';

        if (selectedMethod) {
          document.querySelector('#selected-method span').textContent = selectedMethod;

          // Generate endpoint URL based on the method type
          const methodLower = selectedMethod.toLowerCase();
          let httpMethod = 'POST';
          let resourcePath = '';
          let prefix = '';

          // Determine HTTP method based on prefix
          if (methodLower.startsWith('get') || methodLower.startsWith('list')) {
            httpMethod = 'GET';
            prefix = methodLower.startsWith('get') ? 'get' : 'list';
          } else if (methodLower.startsWith('add')) {
            httpMethod = 'POST';
            prefix = 'add';
          } else if (methodLower.startsWith('update')) {
            httpMethod = 'PATCH';
            prefix = 'update';
          } else if (methodLower.startsWith('remove') || methodLower.startsWith('delete')) {
            httpMethod = 'DELETE';
            prefix = methodLower.startsWith('remove') ? 'remove' : 'delete';
          }

          // Extract resource name from method
          resourcePath = selectedMethod.substring(prefix.length);
          resourcePath = resourcePath.charAt(0).toLowerCase() + resourcePath.slice(1);

          // Format URL pattern based on method type
          if (prefix === 'list') {
            // For list* methods, use plural form
            if (!resourcePath.endsWith('s')) {
              resourcePath += 's';
            }
          } else if (prefix === 'get') {
            // For get* methods, add parameter pattern
            resourcePath += '/{parameter}/{value}';
          }

          // Set the endpoint URL display
          const endpointEl = document.getElementById('endpoint-url');
          if (endpointEl) {
            endpointEl.textContent = \`\${httpMethod} /api/axl/\${resourcePath}\`;
          }

          // Fetch parameters for the selected method
          fetch(\`/api/setup/methods/\${selectedMethod}/parameters\`)
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
      <link rel="icon" href="/favicon.ico" type="image/x-icon">
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
      <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" />
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

        /* Select2 customization */
        .select2-container {
          margin-bottom: 15px;
          font-family: var(--swagger-ui-font);
          width: 100% !important; /* Force full width */
        }
        
        .select2-container--classic .select2-selection--single {
          height: 38px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background-color: #fff;
        }
        
        .select2-container--classic .select2-selection--single .select2-selection__rendered {
          color: #3b4151;
          line-height: 38px;
          padding-left: 12px;
          font-size: 14px;
        }
        
        .select2-container--classic .select2-selection--single .select2-selection__arrow {
          height: 36px;
        }
        
        .select2-container--classic .select2-results__option {
          padding: 8px 12px;
          font-size: 14px;
          white-space: nowrap; /* Prevent line breaks in dropdown options */
        }
        
        /* Make sure the dropdown is always wide enough */
        .select2-container--classic .select2-dropdown {
          min-width: 300px;
          max-width: 100%;
        }
        
        .select2-container--classic .select2-search--dropdown .select2-search__field {
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 14px;
        }

        #method-details {
          margin-top: 5px;
          padding: 15px;
          border: 1px solid #d8dde7;
          border-radius: 4px;
          background-color: #f8f9fa;
          display: none; /* Hidden by default */
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
          position: relative;
        }
        
        .copy-button {
          position: absolute;
          top: 8px;
          right: 8px;
          background-color: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 4px;
          color: white;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .copy-button:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
        
        .copy-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        .refresh-button {
          background-color: #28a745;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-family: var(--swagger-ui-font);
          font-weight: 500;
          display: flex;
          align-items: center;
        }

        .refresh-button:hover {
          background-color: #218838;
        }

        .refresh-button.loading {
          background-color: #6c757d;
          cursor: wait;
        }
        
        .goto-swagger-button {
          background-color: #17a2b8;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-family: var(--swagger-ui-font);
          font-weight: 500;
          width: 100%;
          text-align: center;
        }
        
        .goto-swagger-button:hover {
          background-color: #138496;
        }
        
        /* Back to Top Button */
        #back-to-top {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: #4990e2;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          text-align: center;
          line-height: 40px;
          font-size: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          cursor: pointer;
          z-index: 1000;
          opacity: 0;
          transition: all 0.3s ease-in-out;
        }
        
        #back-to-top:hover {
          background-color: #3a7fd5;
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }
        
        #back-to-top.visible {
          opacity: 1;
        }
        
        #back-to-top::after {
          content: 'Back to top';
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0,0,0,0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s ease-in-out;
          pointer-events: none;
        }
        
        #back-to-top:hover::after {
          opacity: 1;
        }

        /* Additional Select2 dropdown styling */
        .select2-dropdown {
          border-color: #d9d9d9;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .select2-container--classic .select2-results__option--highlighted.select2-results__option--selectable {
          background-color: #4990e2;
        }
      </style>
    </head>
    <body>
      <!-- Method Explorer Component -->
      <div id="method-explorer">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center;">
            <img src="/logo.png" alt="Cisco Logo" style="height: 40px; margin-right: 15px;" />
            <h3 class="explorer-title">AXL Method Explorer</h3>
          </div>
          <div>
            <button id="refresh-examples-btn" class="refresh-button">Refresh Examples</button>
          </div>
        </div>

        <div style="background-color: #f8f9fa; border-left: 5px solid #4990e2; padding: 10px 15px; margin: 10px 0 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; margin-bottom: 8px; color: #333; font-size: 16px;">Configuration</h4>
          <div style="display: flex; flex-wrap: wrap;">
            <div style="margin-right: 30px; margin-bottom: 5px;">
              <strong>CUCM Host:</strong> ${process.env.CUCM_HOST || 'Not configured'}
            </div>
            <div style="margin-right: 30px; margin-bottom: 5px;">
              <strong>CUCM Version:</strong> ${process.env.CUCM_VERSION || 'Not configured'}
            </div>
            <div style="margin-right: 30px; margin-bottom: 5px;">
              <strong>CUCM User:</strong> ${process.env.CUCM_USER || 'Not configured'}
            </div>
            <div style="margin-right: 30px; margin-bottom: 5px;">
              <strong>Status:</strong> <span style="color: ${isAuthenticated ? '#198754' : '#dc3545'}; font-weight: 500;">${isAuthenticated ? 'Connected' : 'Disconnected'}</span>
            </div>
            ${apiKeyConfig.enabled ? `
            <div style="margin-right: 30px; margin-bottom: 5px;">
              <strong>API Key Required:</strong> <span style="color: #dc3545;">Yes</span> (${apiKeyConfig.location}: ${apiKeyConfig.keyName})
            </div>` : ''}
            ${apiKeyConfig.mode === "development" && apiKeyConfig.enabled ? `
            <div style="margin-bottom: 5px;">
              <strong>Dev API Key:</strong> <span style="font-family: monospace;">${apiKeyConfig.devKey}</span>
            </div>` : ''}
            
          </div>
        </div>

        <p>This explorer helps you discover available AXL methods and their required parameters. Select a method to see details.</p>

        <div style="margin-bottom: 15px;">
          <div class="select2-container" style="width: 100%; margin-bottom: 10px;">
            <select id="method-select" style="width: 100%;">
              <option value="">-- Select a method --</option>
            </select>
          </div>
          <div id="goto-swagger-container" style="display: none; margin-top: 10px;">
            <button id="goto-swagger-btn" class="goto-swagger-button">View Method in Swagger UI</button>
          </div>
        </div>

        <div id="method-details">
          <h3 id="selected-method">Method: <span></span></h3>
          <p>Corresponding endpoint: <span class="endpoint-url" id="endpoint-url"></span></p>
          <h4>Required Parameters:</h4>
          <div class="method-tags" id="tags-json">
          </div>
        </div>
      </div>

      <div id="swagger-ui"></div>

      <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-standalone-preset.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
      <script>
        // Initialize method explorer dropdown
        window.addEventListener('load', function() {
          const dropdown = document.getElementById('method-select');
          const tagsContainer = document.getElementById('tags-json');
          const methodDetails = document.getElementById('method-details');
          const endpointUrl = document.getElementById('endpoint-url');
          const copyButton = document.getElementById('copy-button');
          
          // Create back to top button
          const backToTopButton = document.createElement('div');
          backToTopButton.id = 'back-to-top';
          backToTopButton.innerHTML = '&#8593;'; // Up arrow
          backToTopButton.title = 'Back to top';
          document.body.appendChild(backToTopButton);
          
          // Handle back to top button click
          backToTopButton.addEventListener('click', function() {
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          });
          
          // Show/hide back to top button based on scroll position
          window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
              backToTopButton.classList.add('visible');
            } else {
              backToTopButton.classList.remove('visible');
            }
          });
          
          if (!dropdown) {
            return;
          }

          // Check if jQuery is available
          if (typeof jQuery === 'undefined') {
            return;
          }
          
          // Initialize Select2 dropdown with loading placeholder
          jQuery(dropdown).select2({
            placeholder: "Loading methods...",
            allowClear: true,
            width: '100%', // Set width in options
            theme: 'classic',
            dropdownParent: jQuery('.select2-container').parent() // Ensure dropdown is properly positioned
          });

          // Load methods from the API
          fetch('/api/debug/operations')
            .then(response => {
              return response.json();
            })
            .then(data => {

              // Clear existing options
              jQuery(dropdown).empty();
              
              // Add placeholder option
              const placeholderOption = document.createElement('option');
              placeholderOption.value = '';
              placeholderOption.text = '-- Select a method --';
              placeholderOption.selected = true;
              dropdown.appendChild(placeholderOption);

              if (data.operations && Array.isArray(data.operations)) {
                // Sort operations alphabetically
                data.operations.sort().forEach(operation => {
                  const option = document.createElement('option');
                  option.value = operation;
                  option.text = operation;
                  dropdown.appendChild(option);
                });
              }

              // Trigger change event to update Select2
              // No need to trigger the change event here - just refresh the control's appearance
              jQuery(dropdown).select2('destroy').select2({
                placeholder: "-- Select a method --",
                allowClear: true,
                width: '100%', 
                theme: 'classic',
                dropdownParent: jQuery('.select2-container').parent()
              });
            })
            .catch(error => {
              jQuery(dropdown).empty();
              
              const errorOption = document.createElement('option');
              errorOption.value = '';
              errorOption.text = 'Error loading methods';
              errorOption.selected = true;
              dropdown.appendChild(errorOption);
              
              // Reinitialize Select2 with error state
              jQuery(dropdown).select2('destroy').select2({
                placeholder: "Error loading methods",
                allowClear: false,
                width: '100%', 
                theme: 'classic',
                dropdownParent: jQuery('.select2-container').parent()
              });
            });

          // We don't need to add a click handler here as we're adding it dynamically when parameters are loaded

          // Show/hide method details and handle parameters
          // Use both native change and Select2 change events to ensure both work
          jQuery(dropdown).on('select2:select', function(e) {
            
            // Directly show the method details when a selection is made
            if (methodDetails && e.params.data && e.params.data.id) {
              methodDetails.style.display = 'block';
              
              // Show the goto swagger button
              const gotoSwaggerContainer = document.getElementById('goto-swagger-container');
              if (gotoSwaggerContainer) {
                gotoSwaggerContainer.style.display = 'block';
              }
            }
          }).on('change', function() {
            const selectedMethod = dropdown.value;
            
            if (methodDetails) {
              methodDetails.style.display = selectedMethod ? 'block' : 'none';
            }
            
            // Show/hide the goto swagger button
            const gotoSwaggerContainer = document.getElementById('goto-swagger-container');
            if (gotoSwaggerContainer) {
              gotoSwaggerContainer.style.display = selectedMethod ? 'block' : 'none';
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
                'add': 'POST',
                'update': 'PATCH',
                'remove': 'DELETE',
                'delete': 'DELETE'
              };

              let httpMethod = 'POST'; // Default
              let resourcePath = selectedMethod.toLowerCase();
              let prefix = '';

              // Extract method type and resource
              for (const p in httpMethodMap) {
                if (selectedMethod.toLowerCase().startsWith(p)) {
                  httpMethod = httpMethodMap[p];
                  prefix = p;
                  resourcePath = selectedMethod.substring(p.length);
                  break;
                }
              }

              // Format resource path based on the operation type
              if (prefix === 'list') {
                // For list* methods, use plural form for the resource
                resourcePath = resourcePath.charAt(0).toLowerCase() + resourcePath.slice(1);
                // Make plural if not already ending with 's'
                if (!resourcePath.endsWith('s')) {
                  resourcePath += 's';
                }
              } else if (prefix === 'get') {
                // For get* methods, use singular form with parameter placeholders
                resourcePath = resourcePath.charAt(0).toLowerCase() + resourcePath.slice(1);
                resourcePath += '/{parameter}/{value}';
              } else {
                // For other methods, just use the resource name
                resourcePath = resourcePath.charAt(0).toLowerCase() + resourcePath.slice(1);
              }

              // Update endpoint URL
              if (endpointUrl) {
                endpointUrl.textContent = \`\${httpMethod} /api/axl/\${resourcePath}\`;
              }

              // Fetch parameters for the selected method
              fetch(\`/api/setup/methods/\${selectedMethod}/parameters\`)
                .then(response => response.json())
                .then(data => {
                  if (tagsContainer) {
                    // Clear everything except the copy button
                    while (tagsContainer.firstChild) {
                      tagsContainer.removeChild(tagsContainer.firstChild);
                    }
                    
                    // Add back the copy button
                    const copyButton = document.createElement('button');
                    copyButton.className = 'copy-button';
                    copyButton.id = 'copy-button';
                    copyButton.textContent = 'Copy';
                    tagsContainer.appendChild(copyButton);
                    
                    // Create the parameters content
                    const parametersText = data.parameters && Object.keys(data.parameters).length > 0
                        ? JSON.stringify(data.parameters, null, 2)
                        : 'No parameters available';
                    
                    // Add as text node
                    const text = document.createTextNode(parametersText);
                    tagsContainer.appendChild(text);
                    
                    // Disable copy button if no parameters
                    if (parametersText === 'No parameters available') {
                      copyButton.disabled = true;
                    }
                    
                    // Set up the copy button event listener
                    copyButton.addEventListener('click', function() {
                      const textToCopy = data.parameters && Object.keys(data.parameters).length > 0
                        ? JSON.stringify(data.parameters, null, 2)
                        : '';
                      
                      if (!textToCopy) {
                        return; // Don't try to copy if there's nothing to copy
                      }
                      
                      navigator.clipboard.writeText(textToCopy)
                        .then(() => {
                          copyButton.textContent = 'Copied!';
                          setTimeout(() => {
                            copyButton.textContent = 'Copy';
                          }, 2000);
                        })
                        .catch(err => {
                          copyButton.textContent = 'Failed!';
                          setTimeout(() => {
                            copyButton.textContent = 'Copy';
                          }, 2000);
                        });
                    });
                  }
                })
                .catch(error => {
                  if (tagsContainer) {
                    // Clear everything except the copy button
                    while (tagsContainer.firstChild) {
                      tagsContainer.removeChild(tagsContainer.firstChild);
                    }
                    
                    // Add back the copy button
                    const copyButton = document.createElement('button');
                    copyButton.className = 'copy-button';
                    copyButton.id = 'copy-button';
                    copyButton.textContent = 'Copy';
                    copyButton.disabled = true; // Disable the button since there's no data to copy
                    tagsContainer.appendChild(copyButton);
                    
                    // Add error message
                    const text = document.createTextNode('Error loading parameters');
                    tagsContainer.appendChild(text);
                  }
                });
            }
          });
        });

        // Handle goto swagger button
        window.addEventListener('load', function() {
          const gotoSwaggerBtn = document.getElementById('goto-swagger-btn');
          
          if (gotoSwaggerBtn) {
            gotoSwaggerBtn.addEventListener('click', function() {
              const selectedMethod = document.getElementById('method-select').value;
              if (!selectedMethod) return;
              
              // Determine which type of operation this is to find the right tag
              const methodLower = selectedMethod.toLowerCase();
              let tagToFind = '';
              
              // Common prefix mapping to operation type
              if (methodLower.startsWith('get') || methodLower.startsWith('list')) {
                // Extract resource name - remove the get/list prefix
                const prefix = methodLower.startsWith('get') ? 'get' : 'list';
                tagToFind = selectedMethod.substring(prefix.length).toLowerCase();
                // For list methods, check if we need to make it plural
                if (prefix === 'list' && !tagToFind.endsWith('s')) {
                  tagToFind += 's';
                }
              } else if (methodLower.startsWith('add')) {
                tagToFind = selectedMethod.substring(3).toLowerCase();
              } else if (methodLower.startsWith('update')) {
                tagToFind = selectedMethod.substring(6).toLowerCase();
              } else if (methodLower.startsWith('remove')) {
                tagToFind = selectedMethod.substring(6).toLowerCase();
              } else if (methodLower.startsWith('delete')) {
                tagToFind = selectedMethod.substring(6).toLowerCase();
              } else if (methodLower.startsWith('apply')) {
                tagToFind = 'apply';
              } else if (methodLower.startsWith('reset')) {
                tagToFind = 'reset';
              } else if (methodLower.startsWith('do')) {
                tagToFind = 'do';
              } else {
                // Default to the operation name
                tagToFind = methodLower;
              }
              
              // Look for tag elements in Swagger UI
              const tagElements = document.querySelectorAll('.swagger-ui .opblock-tag');
              let found = false;
              
              // Try to find and expand the tag section
              for (const tagEl of tagElements) {
                const tagText = tagEl.textContent.toLowerCase();
                if (tagText.includes(tagToFind)) {
                  // Found a match - scroll to it and click to expand if collapsed
                  tagEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  
                  // If tag is collapsed, expand it
                  if (!tagEl.classList.contains('is-open')) {
                    tagEl.click();
                  }
                  
                  found = true;
                  break;
                }
              }
              
              // If no tag found, scroll to the Swagger UI section anyway
              if (!found) {
                const swaggerUI = document.getElementById('swagger-ui');
                if (swaggerUI) {
                  swaggerUI.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }
            });
          }
        });
        
        // Handle refresh examples button
        window.addEventListener('load', function() {
          const refreshButton = document.getElementById('refresh-examples-btn');
          
          if (refreshButton) {
            refreshButton.addEventListener('click', function() {
              // Show loading state
              const originalText = refreshButton.textContent;
              refreshButton.textContent = 'Refreshing...';
              refreshButton.classList.add('loading');
              refreshButton.disabled = true;
              
              // Call the refresh examples endpoint
              fetch('/api/debug/refresh-examples')
                .then(response => {
                  if (!response.ok) {
                    throw new Error('Failed to refresh examples');
                  }
                  return response.json();
                })
                .then(data => {
                  // Show success message
                  refreshButton.textContent = 'Success!';
                  refreshButton.classList.remove('loading');
                  refreshButton.style.backgroundColor = '#28a745';
                  
                  // Reset button after delay
                  setTimeout(() => {
                    refreshButton.textContent = originalText;
                    refreshButton.disabled = false;
                  }, 2000);

                  console.log('Examples refreshed successfully:', data);
                })
                .catch(error => {
                  // Show error message
                  refreshButton.textContent = 'Failed!';
                  refreshButton.classList.remove('loading');
                  refreshButton.style.backgroundColor = '#dc3545';
                  
                  // Reset button after delay
                  setTimeout(() => {
                    refreshButton.textContent = originalText;
                    refreshButton.disabled = false;
                  }, 2000);

                  console.error('Error refreshing examples:', error);
                });
            });
          }
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
            docExpansion: 'none', // Initial state: collapsed
            validatorUrl: null,
            tagsSorter: 'alpha', // Sort tags alphabetically
            onComplete: function() {
              // Add custom behavior when Swagger UI is loaded
              setTimeout(() => {
                // The code that prevented methods from collapsing has been removed
                // Swagger UI's native toggle functionality will now work properly
                console.log("API Explorer initialized - operations can now be expanded and collapsed normally");
              }, 1000);
            }
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

  // For POST and PATCH methods, add case-sensitive note
  if (httpMethod.toLowerCase() === 'post' || httpMethod.toLowerCase() === 'patch') {
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
      tags: [
        method.toLowerCase().startsWith('apply') ? 'apply' :
        method.toLowerCase().startsWith('reset') ? 'reset' :
        method.toLowerCase().startsWith('do') ? 'do' :
        method.toLowerCase().startsWith('restart') ? 'restart' :
        (path.split('/')[3] || 'axl')
      ], // Group apply*, reset*, do*, and restart* endpoints together, otherwise use URL path resource name as tag
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