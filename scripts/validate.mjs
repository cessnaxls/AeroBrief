import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'server.mjs','package.json','package-lock.json','render.yaml','README.md','SAFETY.md','VALIDATION.md',
  'public/index.html','public/styles.css','public/app.js','public/sw.js','public/manifest.webmanifest',
  'public/icons/icon-192.png','public/icons/icon-512.png'
];

const failures = [];
for (const file of required) {
  try { await access(path.join(root,file)); } catch { failures.push(`Missing required file: ${file}`); }
}

for (const file of ['server.mjs','public/app.js','public/sw.js']) {
  const result = spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
  if (result.status !== 0) failures.push(`${file} syntax error: ${result.stderr.trim()}`);
}

const html = await readFile(path.join(root,'public/index.html'),'utf8');
const app = await readFile(path.join(root,'public/app.js'),'utf8');
const manifestText = await readFile(path.join(root,'public/manifest.webmanifest'),'utf8');
let manifest;
try { manifest = JSON.parse(manifestText); } catch (error) { failures.push(`Manifest JSON invalid: ${error.message}`); }
if (manifest && (!manifest.name || manifest.display !== 'standalone' || !Array.isArray(manifest.icons))) failures.push('Manifest is missing required PWA fields.');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const duplicateIds = ids.filter((id,index)=>ids.indexOf(id)!==index);
if (duplicateIds.length) failures.push(`Duplicate HTML IDs: ${[...new Set(duplicateIds)].join(', ')}`);
const idSet = new Set(ids);
const staticRefs = [...app.matchAll(/\$\(['"]#([^'"]+)['"]\)/g)].map(match=>match[1]);
const dynamicIds = new Set(['corrGrass','corrWet','corrSoft','corrHeadwind','corrTailwind','toldSetupVerified','toldSetupSource','toldObstacleHeight','toldToLabel1','toldToLabel2','toldToLabel3','toldLdLabel1','toldLdLabel2','toldDefaultToConfig','toldDefaultLdConfig','toldWindUse','toldDefaultToSafety','toldDefaultLdSafety']);
const missingRefs = [...new Set(staticRefs.filter(id=>!idSet.has(id) && !dynamicIds.has(id)))];
if (missingRefs.length) failures.push(`Static DOM IDs referenced but absent: ${missingRefs.join(', ')}`);

for (const requiredId of ['activeAircraft','origin','destination','buildBriefButton','weatherGrid','loadRows','wbChart','performanceResults','aircraftList','safetyModal']) {
  if (!idSet.has(requiredId)) failures.push(`Missing key interface element #${requiredId}`);
}

if (/\b(?:is|are|fully) FAA[ -]?approved\b/i.test(html)) {
  failures.push('Potential unsupported positive FAA-approved claim detected.');
}

if (failures.length) {
  console.error(`Validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Validation passed: ${required.length} files, ${ids.length} unique HTML IDs, ${staticRefs.length} static DOM references.`);
