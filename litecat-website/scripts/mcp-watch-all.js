#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('👁️  MCP Watch Mode - Continuous Validation\n');

// File patterns to watch
const watchPatterns = [
  'server/**/*.js',
  'client/**/*.js',
  'client/**/*.html',
  'client/**/*.css',
  '*.json',
  '.env'
];

// Validation checks
const validators = {
  security: {
    name: 'Security Check',
    test: () => {
      const files = getJavaScriptFiles();
      let issues = [];
      
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for Math.random() in crypto contexts
        if (content.includes('Math.random()') && 
            (content.includes('crypto') || content.includes('token') || content.includes('secret'))) {
          issues.push(`${file}: Math.random() used in security context`);
        }
        
        // Check for hardcoded secrets
        const secretPatterns = [
          /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
          /password\s*[:=]\s*["'][^"']+["']/i,
          /secret\s*[:=]\s*["'][^"']+["']/i
        ];
        
        secretPatterns.forEach(pattern => {
          if (pattern.test(content) && !file.includes('example') && !file.includes('test')) {
            issues.push(`${file}: Possible hardcoded secret`);
          }
        });
      });
      
      return { passed: issues.length === 0, issues };
    }
  },
  
  memory: {
    name: 'Memory Leak Check',
    test: () => {
      const files = getJavaScriptFiles();
      let issues = [];
      
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for event listeners without cleanup
        if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
          issues.push(`${file}: Event listener without cleanup`);
        }
        
        // Check for setInterval without clearInterval
        if (content.includes('setInterval') && !content.includes('clearInterval')) {
          issues.push(`${file}: setInterval without cleanup`);
        }
      });
      
      return { passed: issues.length === 0, issues };
    }
  },
  
  performance: {
    name: 'Performance Check',
    test: () => {
      let issues = [];
      
      // Check bundle size
      const clientJsFiles = getJavaScriptFiles('client');
      let totalSize = 0;
      
      clientJsFiles.forEach(file => {
        const stats = fs.statSync(file);
        totalSize += stats.size;
      });
      
      const sizeMB = totalSize / (1024 * 1024);
      if (sizeMB > 1) {
        issues.push(`Client JS bundle too large: ${sizeMB.toFixed(2)}MB (max: 1MB)`);
      }
      
      return { passed: issues.length === 0, issues };
    }
  },
  
  cors: {
    name: 'CORS Compliance',
    test: () => {
      let issues = [];
      const files = getJavaScriptFiles();
      
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for direct external API calls
        const apiPatterns = [
          /fetch\s*\(\s*["']https?:\/\/(?!localhost|127\.0\.0\.1)/,
          /axios\s*\.\s*\w+\s*\(\s*["']https?:\/\/(?!localhost|127\.0\.0\.1)/
        ];
        
        apiPatterns.forEach(pattern => {
          if (pattern.test(content)) {
            issues.push(`${file}: Direct external API call detected`);
          }
        });
      });
      
      return { passed: issues.length === 0, issues };
    }
  }
};

// Helper functions
function getJavaScriptFiles(dir = '.') {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && item.endsWith('.js')) {
        files.push(fullPath);
      }
    });
  }
  
  traverse(dir);
  return files;
}

// Run all validators
function runValidation() {
  console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Running validation...\n`);
  
  let allPassed = true;
  
  Object.entries(validators).forEach(([key, validator]) => {
    const result = validator.test();
    
    if (result.passed) {
      console.log(`✅ ${validator.name}`);
    } else {
      console.log(`❌ ${validator.name}`);
      result.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('\n🎉 All checks passed!');
  } else {
    console.log('\n⚠️  Issues detected - please fix before committing');
  }
  
  return allPassed;
}

// Watch for changes
let debounceTimer;
function watchFiles() {
  console.log('👀 Watching for changes...\n');
  
  const chokidar = tryRequire('chokidar');
  if (!chokidar) {
    // Fallback to simple polling
    setInterval(runValidation, 30000); // Run every 30 seconds
    runValidation(); // Run once immediately
    return;
  }
  
  const watcher = chokidar.watch(watchPatterns, {
    ignored: /node_modules/,
    persistent: true
  });
  
  watcher.on('change', (path) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`\n📝 File changed: ${path}`);
      runValidation();
    }, 1000);
  });
  
  // Run initial validation
  runValidation();
}

function tryRequire(module) {
  try {
    return require(module);
  } catch (e) {
    return null;
  }
}

// Start watching
watchFiles();

// Handle exit
process.on('SIGINT', () => {
  console.log('\n\n👋 MCP Watch stopped');
  process.exit(0);
});