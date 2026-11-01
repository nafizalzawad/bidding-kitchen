import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_GZIP_KB = 180;
const MAX_GZIP_BYTES = MAX_GZIP_KB * 1024;

const distAssetsDir = path.resolve(__dirname, '../apps/web/dist/assets');

if (!fs.existsSync(distAssetsDir)) {
  console.error(`[ERROR] Assets directory not found at: ${distAssetsDir}`);
  console.error('Please build apps/web first: pnpm --filter @bidding-kitchen/web build');
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir);
const jsFiles = files.filter((f) => f.endsWith('.js'));

if (jsFiles.length === 0) {
  console.error(`[ERROR] No JS bundles found in ${distAssetsDir}`);
  process.exit(1);
}

console.log('\n======================================================');
console.log('   Bidding Kitchen Web Bundle Performance Budget');
console.log('======================================================');

let totalRawBytes = 0;
let totalGzipBytes = 0;

for (const file of jsFiles) {
  const filePath = path.join(distAssetsDir, file);
  const content = fs.readFileSync(filePath);
  const rawBytes = content.length;
  const gzipBytes = zlib.gzipSync(content).length;

  totalRawBytes += rawBytes;
  totalGzipBytes += gzipBytes;

  const rawKb = (rawBytes / 1024).toFixed(2);
  const gzipKb = (gzipBytes / 1024).toFixed(2);

  console.log(`- ${file.padEnd(35)} Raw: ${rawKb.padStart(7)} KB │ Gzip: ${gzipKb.padStart(7)} KB`);
}

const totalRawKb = (totalRawBytes / 1024).toFixed(2);
const totalGzipKb = (totalGzipBytes / 1024).toFixed(2);

console.log('------------------------------------------------------');
console.log(`Total JS Raw Size:    ${totalRawKb} KB`);
console.log(`Total JS Gzip Size:   ${totalGzipKb} KB / Budget: ${MAX_GZIP_KB}.00 KB`);
console.log('======================================================\n');

if (totalGzipBytes > MAX_GZIP_BYTES) {
  console.error(`❌ [BUDGET EXCEEDED] Total gzipped JS (${totalGzipKb} KB) exceeds ${MAX_GZIP_KB} KB limit!`);
  process.exit(1);
} else {
  console.log(`✅ [PERF PASS] Total gzipped JS (${totalGzipKb} KB) is within ${MAX_GZIP_KB} KB budget!`);
  process.exit(0);
}
