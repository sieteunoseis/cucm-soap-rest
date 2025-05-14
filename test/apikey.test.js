// Test script for API Key validation
const assert = require('assert');
const axios = require('axios');

// Test configuration
const API_HOST = process.env.API_HOST || 'http://localhost:3000';
const API_URL = `${API_HOST}/api/axl/phone/name/SEP001122334455`;  // Any AXL endpoint
const DEV_API_KEY = process.env.DEV_API_KEY || 'cisco-axl-rest-api-dev-key';

describe('API Key Authentication', function() {
  // Set longer timeout for API calls
  this.timeout(10000);

  // Skipping tests when API key validation is disabled
  before(async function() {
    try {
      const response = await axios.get(`${API_HOST}/health`);
      if (!response.data.apiKeyEnabled) {
        console.log('\nAPI key validation is DISABLED. Skipping API key tests.\n');
        this.skip();
      }
    } catch (error) {
      console.error('Error checking API key status:', error.message);
    }
  });

  it('should reject requests without an API key', async function() {
    try {
      await axios.get(API_URL);
      assert.fail('Request should have been rejected');
    } catch (error) {
      assert.strictEqual(error.response.status, 401);
      assert.strictEqual(error.response.data.error, 'AUTHENTICATION_FAILED');
    }
  });

  it('should reject requests with an invalid API key', async function() {
    try {
      await axios.get(API_URL, {
        headers: {
          'x-api-key': 'invalid-api-key'
        }
      });
      assert.fail('Request should have been rejected');
    } catch (error) {
      assert.strictEqual(error.response.status, 401);
      assert.strictEqual(error.response.data.error, 'AUTHENTICATION_FAILED');
    }
  });

  it('should accept requests with the development API key', async function() {
    try {
      // This test may fail if CUCM authentication is not set up correctly
      // We're just testing that API key validation passes, not the actual CUCM response
      await axios.get(API_URL, {
        headers: {
          'x-api-key': DEV_API_KEY
        }
      });
      // The request might fail with a 404 or 500 depending on CUCM setup
      // That's okay - we just need to make sure it passes API key validation
      // If we get here without a 401, the API key validation passed
    } catch (error) {
      // Only fail if we got a 401 (API key error)
      if (error.response && error.response.status === 401) {
        assert.fail(`API key validation failed: ${error.response.data.message}`);
      }
      // Other errors are acceptable for this test
      console.log(`Got expected non-401 error: ${error.response ? error.response.status : error.message}`);
    }
  });
});

console.log('API Key Authentication tests completed');