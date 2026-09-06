const fs = require('fs');
const path = require('path');

const targets = ['adgate', 'admantum', 'torox', 'monlix', 'adscendmedia', 'ayet', 'wannads', 'cpalead'];

function search(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.git', 'scripts'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      search(fullPath);
    } else if (entry.isFile() && /\.(tsx|ts|js|jsx|json)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      targets.forEach(t => {
        if (content.toLowerCase().includes(t)) {
          console.log(`[FOUND: ${t}] in ${fullPath}`);
        }
      });
      if (content.includes('lib/providers') && !fullPath.includes('lib\\providers.ts') && !fullPath.includes('lib/providers.ts')) {
        console.log(`[IMPORT lib/providers] in ${fullPath}`);
      }
    }
  }
}

console.log('--- Starting Codebase Audit ---');
search('.');
console.log('--- Finished Audit ---');
