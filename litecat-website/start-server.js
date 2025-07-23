#!/usr/bin/env node

// Temporary server starter that sets up module paths correctly
const path = require('path');
const { spawn } = require('child_process');

// Set NODE_PATH to include our node_modules
process.env.NODE_PATH = path.join(__dirname, 'node_modules');

// Start the server
const server = spawn('node', [path.join(__dirname, 'server', 'app.js')], {
  env: { ...process.env },
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});