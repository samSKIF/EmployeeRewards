// Create a script to update package.json to include a simpler script
import fs from 'fs';
import path from 'path';

// Load the current package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Add a new script for the simple server
packageJson.scripts['simple-server'] = 'node server/simple-server.js';

// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('Updated package.json with simple-server script');