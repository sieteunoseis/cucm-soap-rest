// Configuration for Cisco AXL connection
export const axlConfig = {
  host: process.env.CUCM_HOST || 'localhost',
  user: process.env.CUCM_USER || 'administrator',
  pass: process.env.CUCM_PASS || 'password',
  version: process.env.CUCM_VERSION || '14.0'
};