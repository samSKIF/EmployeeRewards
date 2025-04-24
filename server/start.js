const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function killPort(port) {
  try {
    console.log(`Attempting to kill processes on port ${port}...`);
    await execAsync(`npx kill-port ${port}`);
    console.log(`Successfully killed processes on port ${port}`);
  } catch (error) {
    console.log(`No processes found on port ${port} or error: ${error.message}`);
  }
}

async function start() {
  // First kill any process on port 5000
  await killPort(5000);
  
  // Wait a moment to ensure ports are free
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Start the application
  console.log('Starting application...');
  require('./index');
}

start().catch(error => {
  console.error('Error starting application:', error);
  process.exit(1);
});