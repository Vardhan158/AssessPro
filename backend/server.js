// Entry-point compatibility wrapper for deployment platforms (Render, Heroku, Vercel)
const fs = require('fs');
const path = require('path');

const compiledServerPath = path.join(__dirname, 'dist', 'server.js');

if (!fs.existsSync(compiledServerPath)) {
  console.log('Compiling TypeScript code for production deployment...');
  const { execSync } = require('child_process');
  execSync('npx tsc', { stdio: 'inherit' });
}

require('./dist/server.js');
