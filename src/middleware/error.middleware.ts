import { Request, Response, NextFunction } from 'express';
import { json } from 'stream/consumers';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
  code?: string;
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
      let helpfulMessage = `Invalid JSON in request body: ${err.message}`;

      // Add specific guidance if it's the common error at position 53 (line 4, column 3)
      if (errorPosition && errorPosition[1] === '53') {
        helpfulMessage += `\n\nThis is likely due to a trailing comma or format issue near line 4. Common causes:
1. Trailing comma after a property (remove the extra comma)
2. Missing quotes around property name (ensure all property names have double quotes)
3. Unclosed braces or brackets (check that all {, [, " have matching closing characters)`;
      }

      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: helpfulMessage,
        statusCode: 400,
        path: req.path,
        hint: "The payload should follow strict JSON format. If you're using applyPhone, ensure the payload structure is correct."
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