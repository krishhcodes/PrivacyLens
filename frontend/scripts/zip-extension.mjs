// Packs ../extension into public/consentscope-extension.zip so the website's Extension page can offer it
// as a download. Runs before every build, so the zip always matches the extension in the repo.
// Also copies ../scanner/scan.py next to it, for importing every past permission at once.
// Plain Node (no zip tool needed on the build server).
import { deflateRawSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'extension');
const out = join(here, '..', 'public', 'consentscope-extension.zip');
const folder = 'consentscope-extension/'; // unzips to one folder you pick in "Load unpacked"

const scanner = join(here, '..', '..', 'scanner', 'scan.py');
if (existsSync(scanner)) {
  mkdirSync(join(here, '..', 'public'), { recursive: true });
  copyFileSync(scanner, join(here, '..', 'public', 'consentscope-scan.py'));
  console.log('zip-extension: scanner -> public/consentscope-scan.py');
}

if (!existsSync(src)) {
  console.warn(`zip-extension: ${src} not found, skipping the extension download.`);
  process.exit(0);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const files = [];
const walk = dir => {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name !== '.DS_Store') files.push(p);
  }
};
walk(src);

const locals = [];
const centrals = [];
let offset = 0;
for (const p of files) {
  const name = Buffer.from(folder + relative(src, p).split('\\').join('/'));
  const data = readFileSync(p);
  const packed = deflateRawSync(data);
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);           // version needed
  local.writeUInt16LE(0x0800, 6);       // UTF-8 names
  local.writeUInt16LE(8, 8);            // deflate
  local.writeUInt16LE(0, 10);           // time
  local.writeUInt16LE(0x21, 12);        // date: 1980-01-01, keeps the zip identical between builds
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(packed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  locals.push(local, name, packed);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0x21, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(packed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, name);

  offset += local.length + name.length + packed.length;
}

const centralSize = centrals.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([...locals, ...centrals, end]));
console.log(`zip-extension: ${files.length} files -> public/consentscope-extension.zip`);
