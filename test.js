#!/usr/bin/env node

/**
 * Test runner script for ThrivioHR
 * Since package.json scripts cannot be modified in Replit, 
 * use this script to run tests.
 * 
 * Usage:
 *   node test.js              # Run all tests
 *   node test.js --watch      # Run tests in watch mode
 *   node test.js --coverage   # Run tests with coverage
 */

import { spawn } from 'child_process';

const args = process.argv.slice(2);
const jestArgs = ['jest'];

if (args.includes('--watch')) {
  jestArgs.push('--watch');
} else if (args.includes('--coverage')) {
  jestArgs.push('--coverage');
}

const jest = spawn('npx', jestArgs, { stdio: 'inherit' });

jest.on('close', (code) => {
  process.exit(code);
});