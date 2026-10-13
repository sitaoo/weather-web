// Fetches external geo reference data and builds compact runtime tables.
// Run from repo root: node data-raw/scripts/fetch-geo-data.js
// Sources:
//   - OurAirports airports.csv (Public Domain, nightly): IATA + scheduled-service airports
//   - slightlee/regions-data JSON (MIT, 国家地名信息库): admin divisions level 1-3
// Outputs (written twice: data-raw/ reference + data/ runtime copy):
//   - airports.json: [iata, name, municipality, iso_country, lat, lon][]
//   - admin-divisions_zh-cn.json: { updated, rows: [[code, name, parentCode, level]] }
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data-raw');
const RUNTIME = path.join(ROOT, 'data');

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const REGIONS_URL = 'https://raw.githubusercontent.com/slightlee/regions-data/main/data/processed/regions_20260304_173812.json';

function parseCSV(text) {
  const rows = [];
  let cur = [''], q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur[cur.length - 1] += '"'; i++; }
        else q = false;
      } else cur[cur.length - 1] += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') cur.push('');
    else if (ch === '\n') { rows.push(cur); cur = ['']; }
    else if (ch !== '\r') cur[cur.length - 1] += ch;
  }
  return rows;
}

async function main() {
  fs.mkdirSync(RUNTIME, { recursive: true });

  // 1. airports
  console.log('downloading airports.csv ...');
  const csv = await (await fetch(AIRPORTS_URL)).text();
  const rows = parseCSV(csv);
  const head = rows[0];
  const col = (n) => head.indexOf(n);
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < head.length) continue;
    const iata = (r[col('iata_code')] || '').trim().toUpperCase();
    if (!iata) continue;
    if (r[col('scheduled_service')] !== 'yes') continue;
    const type = r[col('type')];
    if (type !== 'large_airport' && type !== 'medium_airport' && type !== 'small_airport') continue;
    const lat = parseFloat(r[col('latitude_deg')]);
    const lon = parseFloat(r[col('longitude_deg')]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push([iata, r[col('name')].trim(), r[col('municipality')].trim(), r[col('iso_country')].trim(),
      Math.round(lat * 1000) / 1000, Math.round(lon * 1000) / 1000]);
  }
  // dedupe by IATA (keep first), sort for stable diffs
  const seen = new Map();
  for (const r of out) if (!seen.has(r[0])) seen.set(r[0], r);
  const airports = [...seen.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const airportsPayload = JSON.stringify({ source: 'OurAirports (Public Domain)', updated: new Date().toISOString().slice(0, 10), rows: airports });
  fs.writeFileSync(path.join(OUT, 'airports.json'), airportsPayload + '\n');
  fs.writeFileSync(path.join(RUNTIME, 'airports.db.js'),
    '// Generated from data-raw/airports.json — do not hand-edit; re-run fetch-geo-data.js.\n' +
    '// Loaded via <script> (not fetch) so it also works on file://.\n' +
    'window.__AIRPORTS_DB = ' + airportsPayload + ';\n');
  console.log('airports:', airports.length, 'rows,', (airportsPayload.length / 1024).toFixed(0) + 'KB');

  // 2. admin divisions level 1-3
  console.log('downloading regions json ...');
  const regions = await (await fetch(REGIONS_URL)).json();
  const rows2 = [];
  for (const r of regions.data || []) {
    if (r.level < 1 || r.level > 3) continue;
    if (!r.code || !r.name) continue;
    rows2.push([String(r.code), r.name, r.parent_code ? String(r.parent_code) : '', r.level]);
  }
  rows2.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const adminPayload = JSON.stringify({
    source: 'slightlee/regions-data (MIT, 国家地名信息库)', updated: new Date().toISOString().slice(0, 10),
    note: 'levels 1-3 only (province/prefecture/county); names only, no coordinates',
    rows: rows2
  });
  fs.writeFileSync(path.join(OUT, 'admin-divisions_zh-cn.json'), adminPayload + '\n');
  fs.writeFileSync(path.join(RUNTIME, 'admin-divisions_zh-cn.db.js'),
    '// Generated from data-raw/admin-divisions_zh-cn.json — do not hand-edit; re-run fetch-geo-data.js.\n' +
    '// Loaded via <script> (not fetch) so it also works on file://.\n' +
    'window.__ADMIN_DB = ' + adminPayload + ';\n');
  console.log('admin rows:', rows2.length, (adminPayload.length / 1024).toFixed(0) + 'KB');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
