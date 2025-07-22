#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting LITECAT Development Environment\n');

// Services to start
const services = [
  {
    name: 'API Server',
    command: 'node',
    args: ['server/app.js'],
    color: '\x1b[36m', // Cyan
    env: { ...process.env, NODE_ENV: 'development' }
  },
  {
    name: 'Client Server',
    command: 'python3',
    args: ['-m', 'http.server', '8080', '--directory', 'client'],
    color: '\x1b[33m', // Yellow
    cwd: process.cwd()
  },
  {
    name: 'MCP Watch',
    command: 'node',
    args: ['scripts/mcp-watch-all.js'],
    color: '\x1b[35m', // Magenta
    optional: true
  }
];

// Process management
const processes = [];
let isShuttingDown = false;

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m'
};

// Start services
services.forEach(service => {
  try {
    console.log(`${colors.green}Starting ${service.name}...${colors.reset}`);
    
    const proc = spawn(service.command, service.args, {
      cwd: service.cwd || process.cwd(),
      env: service.env || process.env,
      shell: true
    });
    
    // Handle stdout
    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.log(`${service.color}[${service.name}]${colors.reset} ${line}`);
      });
    });
    
    // Handle stderr
    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.error(`${colors.red}[${service.name}]${colors.reset} ${line}`);
      });
    });
    
    // Handle exit
    proc.on('exit', (code) => {
      console.log(`${colors.red}[${service.name}] Process exited with code ${code}${colors.reset}`);
      
      if (!isShuttingDown && !service.optional) {
        console.log(`${colors.red}Critical service failed. Shutting down...${colors.reset}`);
        shutdown();
      }
    });
    
    processes.push({ ...service, process: proc });
    
  } catch (error) {
    console.error(`${colors.red}Failed to start ${service.name}: ${error.message}${colors.reset}`);
    if (!service.optional) {
      shutdown();
    }
  }
});

// Graceful shutdown
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n${colors.blue}Shutting down services...${colors.reset}`);
  
  processes.forEach(({ name, process }) => {
    console.log(`${colors.blue}Stopping ${name}...${colors.reset}`);
    process.kill('SIGTERM');
  });
  
  // Force exit after 5 seconds
  setTimeout(() => {
    console.log(`${colors.red}Force exiting...${colors.reset}`);
    process.exit(0);
  }, 5000);
}

// Handle signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Display status
setTimeout(() => {
  console.log(`\n${colors.green}${colors.bright}✅ All services started!${colors.reset}\n`);
  console.log('📍 Access points:');
  console.log('   Frontend: http://localhost:8080');
  console.log('   API:      http://localhost:3000');
  console.log('   WebSocket: ws://localhost:3000/ws');
  console.log('   Health:   http://localhost:3000/health\n');
  console.log(`${colors.blue}Press Ctrl+C to stop all services${colors.reset}\n`);
}, 2000);