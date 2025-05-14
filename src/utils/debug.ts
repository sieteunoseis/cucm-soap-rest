/**
 * Debug logging utility that only logs when DEBUG environment variable is enabled.
 * Set DEBUG=true to enable all logs, or customize what gets logged by setting DEBUG=axl,router,etc.
 */

/**
 * Check if debugging is enabled for a specific scope
 * @param scope The logging scope to check (e.g., 'axl', 'router', etc.)
 * @returns True if debugging is enabled for the given scope
 */
export const isDebugEnabled = (scope?: string): boolean => {
  // Get the DEBUG value, handling case-insensitivity
  const debug = process.env.DEBUG;
  
  // If DEBUG is not set, return false
  if (!debug) {
    return false;
  }

  // Check if DEBUG is set to a falsy value
  if (["false", "no", "0", "off", "n"].includes(debug.toLowerCase())) {
    return false;
  }

  // If DEBUG is set to a truthy value like "true", "yes", "1" - return true for any scope
  if (["true", "yes", "1", "on", "y"].includes(debug.toLowerCase())) {
    return true;
  }

  // If DEBUG is set to a truthy value and no scope is specified, return true
  if (!scope) {
    return true;
  }

  // Check if the scope is included in the DEBUG value (supports comma-separated values)
  const debugScopes = debug.toLowerCase().split(',').map(s => s.trim());
  return debugScopes.includes('*') || debugScopes.includes('all') || debugScopes.includes(scope.toLowerCase());
};
/**
 * Debug logging function that only logs when DEBUG environment variable is enabled
 * 
 * @param message The message to log
 * @param data Optional data to log with the message
 * @param scope Optional scope for targeted debugging (e.g., 'axl', 'router', etc.)
 */
export const debugLog = (message: string, data?: any, scope: string = 'axl'): void => {
  if (isDebugEnabled(scope)) {
    if (data !== undefined) {
      console.log(`[${scope.toUpperCase()}] ${message}`, data);
    } else {
      console.log(`[${scope.toUpperCase()}] ${message}`);
    }
  }
};