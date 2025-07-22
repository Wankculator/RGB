#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const terser = require('terser');
const CleanCSS = require('clean-css');

console.log('🏗️  LITECAT Production Build\n');

const BUILD_DIR = path.join(__dirname, '..', 'dist');
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const SERVER_DIR = path.join(__dirname, '..', 'server');

// Clean build directory
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });
fs.mkdirSync(path.join(BUILD_DIR, 'client'), { recursive: true });
fs.mkdirSync(path.join(BUILD_DIR, 'server'), { recursive: true });

// Build configuration
const buildConfig = {
  minify: true,
  sourceMaps: false,
  bundleAnalysis: false,
  optimization: {
    removeConsole: true,
    removeDebugger: true,
    compress: true
  }
};

// Step 1: Minify JavaScript files
async function minifyJavaScript() {
  console.log('📦 Minifying JavaScript files...');
  
  const jsFiles = getAllFiles(CLIENT_DIR, '.js');
  let totalOriginalSize = 0;
  let totalMinifiedSize = 0;
  
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    totalOriginalSize += content.length;
    
    try {
      const result = await terser.minify(content, {
        compress: {
          drop_console: buildConfig.optimization.removeConsole,
          drop_debugger: buildConfig.optimization.removeDebugger,
          dead_code: true,
          unused: true
        },
        mangle: {
          toplevel: true
        },
        format: {
          comments: false
        }
      });
      
      const relativePath = path.relative(CLIENT_DIR, file);
      const outputPath = path.join(BUILD_DIR, 'client', relativePath);
      const outputDir = path.dirname(outputPath);
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, result.code);
      totalMinifiedSize += result.code.length;
      
    } catch (error) {
      console.error(`Error minifying ${file}:`, error.message);
    }
  }
  
  const reduction = ((1 - totalMinifiedSize / totalOriginalSize) * 100).toFixed(1);
  console.log(`✅ JavaScript minified: ${reduction}% size reduction`);
}

// Step 2: Minify CSS files
function minifyCSS() {
  console.log('🎨 Minifying CSS files...');
  
  const cssFiles = getAllFiles(CLIENT_DIR, '.css');
  const cleanCSS = new CleanCSS({
    level: 2,
    compatibility: 'ie11'
  });
  
  let totalOriginalSize = 0;
  let totalMinifiedSize = 0;
  
  cssFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    totalOriginalSize += content.length;
    
    const result = cleanCSS.minify(content);
    
    const relativePath = path.relative(CLIENT_DIR, file);
    const outputPath = path.join(BUILD_DIR, 'client', relativePath);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, result.styles);
    totalMinifiedSize += result.styles.length;
  });
  
  const reduction = ((1 - totalMinifiedSize / totalOriginalSize) * 100).toFixed(1);
  console.log(`✅ CSS minified: ${reduction}% size reduction`);
}

// Step 3: Optimize images
function optimizeImages() {
  console.log('🖼️  Copying images...');
  
  const imageFiles = getAllFiles(CLIENT_DIR, ['.jpg', '.png', '.gif', '.svg']);
  let totalSize = 0;
  
  imageFiles.forEach(file => {
    const relativePath = path.relative(CLIENT_DIR, file);
    const outputPath = path.join(BUILD_DIR, 'client', relativePath);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.copyFileSync(file, outputPath);
    totalSize += fs.statSync(file).size;
  });
  
  console.log(`✅ ${imageFiles.length} images copied (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
}

// Step 4: Generate production HTML with asset hashing
function generateProductionHTML() {
  console.log('📄 Generating production HTML...');
  
  const indexPath = path.join(CLIENT_DIR, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Asset versioning
  const assetMap = new Map();
  
  // Process JS files
  const jsFiles = getAllFiles(path.join(BUILD_DIR, 'client'), '.js');
  jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    const relativePath = path.relative(path.join(BUILD_DIR, 'client'), file).replace(/\\/g, '/');
    const hashedName = relativePath.replace('.js', `.${hash}.js`);
    
    // Rename file with hash
    const newPath = path.join(path.dirname(file), path.basename(hashedName));
    fs.renameSync(file, newPath);
    
    assetMap.set(relativePath, hashedName);
  });
  
  // Process CSS files
  const cssFiles = getAllFiles(path.join(BUILD_DIR, 'client'), '.css');
  cssFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    const relativePath = path.relative(path.join(BUILD_DIR, 'client'), file).replace(/\\/g, '/');
    const hashedName = relativePath.replace('.css', `.${hash}.css`);
    
    // Rename file with hash
    const newPath = path.join(path.dirname(file), path.basename(hashedName));
    fs.renameSync(file, newPath);
    
    assetMap.set(relativePath, hashedName);
  });
  
  // Update HTML with hashed assets
  assetMap.forEach((hashedName, originalName) => {
    html = html.replace(
      new RegExp(`(src|href)=["']${originalName}["']`, 'g'),
      `$1="${hashedName}"`
    );
  });
  
  // Add production optimizations
  html = html.replace('</head>', `
  <link rel="preconnect" href="https://cdn.litecat.xyz">
  <link rel="dns-prefetch" href="https://api.coinpayments.net">
  </head>`);
  
  // Save production HTML
  fs.writeFileSync(path.join(BUILD_DIR, 'client', 'index.html'), html);
  console.log('✅ Production HTML generated with asset hashing');
}

// Step 5: Copy server files
function copyServerFiles() {
  console.log('🖥️  Copying server files...');
  
  const serverFiles = getAllFiles(SERVER_DIR, '.js');
  
  serverFiles.forEach(file => {
    const relativePath = path.relative(SERVER_DIR, file);
    const outputPath = path.join(BUILD_DIR, 'server', relativePath);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.copyFileSync(file, outputPath);
  });
  
  // Copy package files
  const packageFiles = ['package.json', 'package-lock.json', '.env.production'];
  packageFiles.forEach(file => {
    const sourcePath = path.join(__dirname, '..', file);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, path.join(BUILD_DIR, file));
    }
  });
  
  console.log('✅ Server files copied');
}

// Step 6: Generate deployment info
function generateDeploymentInfo() {
  console.log('📋 Generating deployment info...');
  
  const deployInfo = {
    version: require('../package.json').version,
    buildTime: new Date().toISOString(),
    commit: getGitCommit(),
    environment: 'production',
    node: process.version,
    checksums: {}
  };
  
  // Generate checksums for critical files
  const criticalFiles = getAllFiles(BUILD_DIR, ['.js', '.css', '.html']);
  criticalFiles.forEach(file => {
    const content = fs.readFileSync(file);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    const relativePath = path.relative(BUILD_DIR, file);
    deployInfo.checksums[relativePath] = checksum;
  });
  
  fs.writeFileSync(
    path.join(BUILD_DIR, 'deploy-info.json'),
    JSON.stringify(deployInfo, null, 2)
  );
  
  console.log('✅ Deployment info generated');
}

// Utility functions
function getAllFiles(dir, extensions) {
  const files = [];
  const exts = Array.isArray(extensions) ? extensions : [extensions];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (exts.includes(ext)) {
          files.push(fullPath);
        }
      }
    });
  }
  
  traverse(dir);
  return files;
}

function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    return 'unknown';
  }
}

// Main build process
async function build() {
  const startTime = Date.now();
  
  try {
    // Check if required modules are installed
    try {
      require('terser');
      require('clean-css');
    } catch (e) {
      console.log('📦 Installing build dependencies...');
      execSync('npm install --no-save terser clean-css', { stdio: 'inherit' });
    }
    
    await minifyJavaScript();
    minifyCSS();
    optimizeImages();
    generateProductionHTML();
    copyServerFiles();
    generateDeploymentInfo();
    
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✨ Production build completed in ${buildTime}s`);
    console.log(`📁 Output directory: ${BUILD_DIR}`);
    
    // Build summary
    const distSize = getDirectorySize(BUILD_DIR);
    console.log(`\n📊 Build Summary:`);
    console.log(`   Total size: ${(distSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Client assets: ${fs.readdirSync(path.join(BUILD_DIR, 'client')).length} files`);
    console.log(`   Server files: ${fs.readdirSync(path.join(BUILD_DIR, 'server')).length} files`);
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

function getDirectorySize(dir) {
  let size = 0;
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else {
        size += stat.size;
      }
    });
  }
  
  traverse(dir);
  return size;
}

// Run build
build();