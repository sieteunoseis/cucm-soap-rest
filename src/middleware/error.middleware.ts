import { Request, Response, NextFunction } from 'express';
import { json } from 'stream/consumers';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
  code?: string;
  originalBody?: string;  // The original request body before any cleaning
  cleanedBody?: string;   // The cleaned body after our preprocessing
  parseError?: Error;     // The original parse error
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set appropriate status code
  const statusCode = err.statusCode || 500;

  // Check for JSON syntax errors
  const isJsonError = err.name === 'SyntaxError' &&
                      err.message.includes('JSON');

  if (isJsonError) {
    console.error(`[Error] 400 - JSON Syntax Error: ${err.message}`);
    console.error(`Request path: ${req.path}`);
    console.error(`Request method: ${req.method}`);

    // Special handling for apply* endpoints
    if (req.path.startsWith('/api/axl/apply')) {
      const errorPosition = err.message.match(/position (\d+)/);
      const methodName = req.path.split('/').pop();
      let helpfulMessage = `Invalid JSON in request body: ${err.message}`;
      let examplePayload = '';

      // Determine which apply* endpoint and provide a suitable example
      const applyMethod = methodName || 'apply';
      const resourceName = applyMethod.replace('apply', '').toLowerCase();

      // Generate example for common apply endpoints
      if (applyMethod === 'applyPhone') {
        examplePayload = `{
  "applyPhone": {
    "phone": {
      "name": "SEP001122334455",
      "description": "John Doe's Phone",
      "lines": {
        "line": [
          {
            "index": 1,
            "dirn": {
              "pattern": "1234"
            }
          }
        ]
      }
    }
  }
}`;
      } else if (resourceName) {
        // Generic example for other apply methods
        examplePayload = `{
  "apply${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}": {
    "${resourceName}": {
      "name": "Example${resourceName}",
      "description": "Example description"
    }
  }
}`;
      }

      // Add specific guidance based on error position
      if (errorPosition) {
        const position = parseInt(errorPosition[1]);

        // Common error at position 53 (line 4, column 3)
        if (position >= 50 && position <= 60) {
          helpfulMessage += `\n\nThis is likely due to a trailing comma or format issue near line 4. Common causes:
1. Trailing comma after a property (remove the extra comma)
2. Missing quotes around property name (ensure all property names have double quotes)
3. Unclosed braces or brackets (check that all {, [, " have matching closing characters)`;
        }
        // Errors near the beginning
        else if (position < 20) {
          helpfulMessage += `\n\nThis error is near the beginning of your JSON. Common causes:
1. Missing opening brace {
2. Invalid character at the start of the payload
3. Malformatted property name at the root level`;
        }
        // Other positions
        else {
          helpfulMessage += `\n\nCommon JSON syntax problems:
1. Missing quotes around property names (all property names must have double quotes)
2. Using single quotes instead of double quotes (JSON requires double quotes)
3. Trailing commas in objects or arrays (remove extra commas)
4. Unquoted string values (string values must be in double quotes)
5. Using JavaScript-style comments (JSON does not support comments)`;
        }
      }

      // Add enhanced error info if available from our middleware
      if (err.originalBody) {
        helpfulMessage += `\n\nOur parser attempted to fix common syntax issues but still failed.`;
      }

      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: helpfulMessage,
        statusCode: 400,
        path: req.path,
        hint: `The payload must follow strict JSON format for ${applyMethod} operations.`,
        example: examplePayload ? `Example payload:\n${examplePayload}` : undefined
      });
    }

    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: `Invalid JSON in request body: ${err.message}`,
      statusCode: 400,
      path: req.path
    });
  }

  console.error(`[Error] ${statusCode} - ${err.name}: ${err.message}`);

  // Check if error is from SOAP/AXL
  const isSoapError = err.message && (
    err.message.includes('SOAP') ||
    err.message.includes('AXL') ||
    err.message.includes('Error:')
  );

  // Format the error message for better readability
  let errorMessage = err.message;
  if (isSoapError && typeof errorMessage === 'string') {
    // Try to extract the actual error message from SOAP error
    const matches = errorMessage.match(/Error:(.*?)(?:\.|$)/i);
    if (matches && matches[1]) {
      errorMessage = matches[1].trim();
    }
  }

  res.status(statusCode).json({
    error: err.code || err.name,
    message: errorMessage,
    statusCode,
    path: req.path,
    details: err.details || undefined
  });
};