/**
 * This is a wrapper module to load the CommonJS ultralight server
 */

// Use dynamic import to load the CJS module
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load the CJS module
const server = require('./ultralight-server.cjs');

// Export the server for testing
export default server;