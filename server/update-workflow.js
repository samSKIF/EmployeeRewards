#!/usr/bin/env node

/**
 * This script creates or updates a .replit file to use our ultralight server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = path.join(__dirname, '..');
const replitPath = path.join(rootDir, '.replit');

// Create the .replit file content
const replitContent = `run = "node server/ultralight-server.js"
hidden = [".config", "package-lock.json"]

[packager]
language = "nodejs"
[packager.features]
packageSearch = true
guessImports = true

[languages.javascript]
pattern = "**/*.{js,jsx,ts,tsx}"
[languages.javascript.languageServer]
start = ["typescript-language-server", "--stdio"]

[deployment]
run = ["node", "server/ultralight-server.js"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 5000
externalPort = 80
`;

// Write the file
try {
  fs.writeFileSync(replitPath, replitContent, 'utf8');
  console.log('Updated .replit file successfully to use ultralight server');
} catch (err) {
  console.error('Error updating .replit file:', err);
}