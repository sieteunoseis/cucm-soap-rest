import { Request, Response, NextFunction } from "express";
import { debugLog } from "../utils/debug";

// Configuration options from environment variables
export const apiKeyConfig = {
  enabled: process.env.USE_API_KEY?.toLowerCase() === "true",
  keyName: process.env.API_KEY_NAME || "x-api-key",
  location: process.env.API_KEY_LOCATION || "header",
  devKey: process.env.DEV_API_KEY || "cisco-axl-rest-api-dev-key",
};

/**
 * Middleware to verify API key if enabled
 * This is a placeholder for actual API key validation logic
 * In this implementation, we're just checking if the API key exists
 * Since the actual authentication will be handled by Kong Gateway
 */
export function checkApiKey(req: Request, res: Response, next: NextFunction) {
  // If API key authentication is disabled, skip this middleware
  if (!apiKeyConfig.enabled) {
    return next();
  }

  // If running behind Kong and Kong headers are present, trust Kong's authentication
  if (process.env.NODE_ENV === "production" && (req.header("X-Consumer-ID") || req.header("X-Anonymous-Consumer"))) {
    debugLog(`Request authenticated by Kong`, null, "auth");
    return next();
  }

  // Rest of your existing code for direct access...
  let apiKey: string | undefined;

  // Get API key based on configured location
  if (apiKeyConfig.location === "header") {
    apiKey = req.header(apiKeyConfig.keyName);
  } else if (apiKeyConfig.location === "query") {
    apiKey = req.query[apiKeyConfig.keyName] as string;
  }

  // Check if API key is provided
  if (!apiKey) {
    debugLog(`API key missing in ${apiKeyConfig.location}`, null, "auth");
    return res.status(401).json({
      error: "AUTHENTICATION_FAILED",
      message: `API key is required. Please provide it in the ${apiKeyConfig.location === "header" ? "header" : "query parameter"} '${apiKeyConfig.keyName}'`,
      statusCode: 401,
    });
  }

  // For development/direct access
  if (apiKey === apiKeyConfig.devKey) {
    debugLog(`Valid development API key provided in ${apiKeyConfig.location}`, null, "auth");
    next();
  } else {
    debugLog(`Invalid API key provided in ${apiKeyConfig.location}`, null, "auth");
    return res.status(401).json({
      error: "AUTHENTICATION_FAILED",
      message: "Invalid API key provided. Please check your credentials.",
      statusCode: 401,
    });
  }
}
