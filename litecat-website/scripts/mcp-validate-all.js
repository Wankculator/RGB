#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 MCP Validate All - Comprehensive Project Validation\n');

let totalIssues = 0;
const results = {
  passed: [],
  failed: []
};

// Validation modules
const validations = [
  {
    name: '🔐 Security Validation',
    run: () => {
      console.log('\n🔐 Running Security Validation...');
      const issues = [];
      
      // Check JWT secrets
      const envContent = fs.readFileSync('.env', 'utf8');
      if (envContent.includes('your-') || envContent.includes('minimum-32-characters')) {
        issues.push('JWT secrets not properly configured');
      }
      
      // Check for insecure patterns
      const jsFiles = getAllFiles('.', '.js');
      jsFiles.forEach(file => {
        if (file.includes('node_modules')) return;
        
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for eval()
        if (content.includes('eval(')) {
          issues.push(`${file}: Uses eval() - security risk`);
        }
        
        // Check for SQL injection vulnerabilities
        if (content.match(/query\s*\(\s*[`"'].*\$\{/)) {
          issues.push(`${file}: Potential SQL injection vulnerability`);
        }
      });
      
      return issues;
    }
  },
  
  {
    name: '📦 Dependencies Check',
    run: () => {
      console.log('\n📦 Running Dependencies Check...');
      const issues = [];
      
      try {
        // Check for vulnerabilities
        const audit = execSync('npm audit --json', { encoding: 'utf8' });
        const auditData = JSON.parse(audit);
        
        if (auditData.metadata.vulnerabilities.total > 0) {
          const vulns = auditData.metadata.vulnerabilities;
          issues.push(`Found ${vulns.total} vulnerabilities (${vulns.critical} critical, ${vulns.high} high)`);
        }
      } catch (error) {
        // npm audit returns non-zero exit code if vulnerabilities found
        try {
          const output = error.stdout.toString();
          const data = JSON.parse(output);
          const vulns = data.metadata.vulnerabilities;
          if (vulns.critical > 0 || vulns.high > 0) {
            issues.push(`Found ${vulns.total} vulnerabilities (${vulns.critical} critical, ${vulns.high} high)`);
          }
        } catch (e) {
          issues.push('Failed to run npm audit');
        }
      }
      
      return issues;
    }
  },
  
  {
    name: '🧪 Test Coverage',
    run: () => {
      console.log('\n🧪 Running Test Coverage Check...');
      const issues = [];
      
      // Check if test files exist
      const testFiles = getAllFiles('./tests', '.test.js').concat(
        getAllFiles('./tests', '.spec.js')
      );
      
      if (testFiles.length === 0) {
        issues.push('No test files found');
      }
      
      // Check for untested routes
      const routeFiles = getAllFiles('./server/routes', '.js');
      routeFiles.forEach(routeFile => {
        const routeName = path.basename(routeFile, '.js');
        const hasTest = testFiles.some(test => test.includes(routeName));
        if (!hasTest) {
          issues.push(`No tests for route: ${routeName}`);
        }
      });
      
      return issues;
    }
  },
  
  {
    name: '🎨 Code Quality',
    run: () => {
      console.log('\n🎨 Running Code Quality Check...');
      const issues = [];
      
      const jsFiles = getAllFiles('.', '.js').filter(f => !f.includes('node_modules'));
      
      jsFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        // Check file length
        if (lines.length > 500) {
          issues.push(`${file}: File too long (${lines.length} lines, max: 500)`);
        }
        
        // Check for console.log in production code
        if (!file.includes('test') && !file.includes('scripts')) {
          const consoleLogs = (content.match(/console\.(log|debug|info)/g) || []).length;
          if (consoleLogs > 5) {
            issues.push(`${file}: Too many console statements (${consoleLogs})`);
          }
        }
        
        // Check for TODO comments
        const todos = (content.match(/TODO|FIXME|HACK/g) || []).length;
        if (todos > 0) {
          issues.push(`${file}: Contains ${todos} TODO/FIXME/HACK comments`);
        }
      });
      
      return issues;
    }
  },
  
  {
    name: '🔧 Configuration',
    run: () => {
      console.log('\n🔧 Running Configuration Check...');
      const issues = [];
      
      // Check .env configuration
      const requiredEnvVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY'
      ];
      
      const envContent = fs.readFileSync('.env', 'utf8');
      requiredEnvVars.forEach(varName => {
        const regex = new RegExp(`^${varName}=(.+)$`, 'm');
        const match = envContent.match(regex);
        
        if (!match || match[1].includes('not-configured') || match[1].includes('your-')) {
          issues.push(`${varName} not properly configured`);
        }
      });
      
      // Check for localhost in production settings
      if (envContent.includes('NODE_ENV=production') && envContent.includes('localhost')) {
        issues.push('Production config contains localhost references');
      }
      
      return issues;
    }
  },
  
  {
    name: '🚀 Performance',
    run: () => {
      console.log('\n🚀 Running Performance Check...');
      const issues = [];
      
      // Check client bundle size
      const clientFiles = getAllFiles('./client', '.js');
      let totalSize = 0;
      
      clientFiles.forEach(file => {
        const stats = fs.statSync(file);
        totalSize += stats.size;
      });
      
      const sizeMB = totalSize / (1024 * 1024);
      if (sizeMB > 2) {
        issues.push(`Client JavaScript too large: ${sizeMB.toFixed(2)}MB (max: 2MB)`);
      }
      
      // Check for synchronous file operations in server code
      const serverFiles = getAllFiles('./server', '.js');
      serverFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('readFileSync') && !file.includes('config')) {
          issues.push(`${file}: Uses synchronous file operations`);
        }
      });
      
      return issues;
    }
  }
];

// Helper function to get all files
function getAllFiles(dir, ext) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (stat.isFile() && item.endsWith(ext)) {
          files.push(fullPath);
        }
      });
    } catch (e) {
      // Directory not accessible
    }
  }
  
  traverse(dir);
  return files;
}

// Run all validations
console.log('Starting comprehensive validation...\n');

validations.forEach(validation => {
  const issues = validation.run();
  
  if (issues.length === 0) {
    console.log(`✅ ${validation.name} - PASSED`);
    results.passed.push(validation.name);
  } else {
    console.log(`❌ ${validation.name} - FAILED (${issues.length} issues)`);
    issues.forEach(issue => {
      console.log(`   • ${issue}`);
    });
    results.failed.push(validation.name);
    totalIssues += issues.length;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`📝 Total Issues: ${totalIssues}`);

if (totalIssues === 0) {
  console.log('\n🎉 All validations passed! Your project is ready.');
  process.exit(0);
} else {
  console.log('\n⚠️  Please fix the issues above before deploying.');
  process.exit(1);
}