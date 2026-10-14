// Entrypoint for Cloud Run and GitHub Actions verification
require('dotenv').config();
const path = require('path');
const fs = require('fs');

async function main() {
  // 1. Run migrations if script exists
  const migrationRunner = path.resolve(__dirname, 'server/scripts/run-migrations.cjs');
  if (fs.existsSync(migrationRunner)) {
    try {
      const { execSync } = require('child_process');
      execSync(`node "${migrationRunner}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error('[Startup] Migration runner notice:', err.message);
    }
  }

  // 2. Launch production Express server
  const distServer = path.resolve(__dirname, 'server/dist/index.js');
  if (fs.existsSync(distServer)) {
    require(distServer);
  } else {
    console.log('[Startup] server/dist/index.js not found. Running development server or syntax validation.');
  }
}

// Only execute when run directly (not during syntax check)
if (require.main === module) {
  main();
}
