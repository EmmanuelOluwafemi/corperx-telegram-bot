const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Display the working directory
console.log('Current working directory:', process.cwd());

try {
  // Clean dist folder if it exists
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    console.log('Cleaning dist folder...');
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  // Run TypeScript compilation
  console.log('Running TypeScript compiler...');
  execSync('npx tsc', { stdio: 'inherit' });

  // Check if compilation was successful
  const indexJsPath = path.join(process.cwd(), 'dist', 'index.js');
  if (fs.existsSync(indexJsPath)) {
    console.log('Build successful! dist/index.js was created.');
    // List files in dist directory
    const files = fs.readdirSync(distPath);
    console.log('Files in dist directory:', files);
  } else {
    console.error('Build failed! dist/index.js was not created.');
    process.exit(1);
  }
} catch (error) {
  console.error('Build error:', error.message);
  process.exit(1);
} 