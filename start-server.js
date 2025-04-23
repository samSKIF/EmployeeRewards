/**
 * This is a simple wrapper script to start the server
 */

import('child_process').then(({ spawn }) => {
  console.log('Starting server in ESM mode...');
  const proc = spawn('node', ['server/vite-dev-server.js'], {
    stdio: 'inherit',
    env: process.env
  });

  proc.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  // Handle clean shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    proc.kill('SIGINT');
    process.exit(0);
  });
});