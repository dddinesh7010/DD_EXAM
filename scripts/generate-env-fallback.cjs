const fs = require('fs');
const path = require('path');

const envExamplePath = path.join(__dirname, '../.env.example');
let envContent = '';

if (fs.existsSync(envExamplePath)) {
  envContent = fs.readFileSync(envExamplePath, 'utf8');
}

const vars = {};
const lines = envContent.split(/\r?\n/);
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    continue;
  }
  const parts = trimmed.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
}

const tsContent = `// Generated automatically during build. Do not edit or commit.
export const fallbackEnv: Record<string, string> = ${JSON.stringify(vars, null, 2)};
`;

const outputPath = path.join(__dirname, '../src/db/env-fallback.ts');
fs.writeFileSync(outputPath, tsContent, 'utf8');
console.log(`[Build] Generated environment fallback file at ${outputPath}`);
