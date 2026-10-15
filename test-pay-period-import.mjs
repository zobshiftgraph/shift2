/**
 * Smoke test: pay-period TSV import helpers in shiftgraph.html
 */
import fs from 'fs';
import { JSDOM } from 'jsdom';

const page = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const scriptMatch = page.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/i);
if (!scriptMatch) throw new Error('No script block found');

const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <button id="pasteBtn">Paste</button>
  <button id="ppBtn">PP</button>
  <input id="dateFilter" />
  <div id="timelineContainer"></div>
  <div id="requestsWrap"></div>
  <div id="requestsBody"></div>
  <div id="reqBadge"></div>
  <div id="chartSubtitle"></div>
  <div id="emptyState"></div>
</body></html>`);
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.DOMParser = window.DOMParser;
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

let script = scriptMatch[1];
script = script.replace(/\(function init\(\)[\s\S]*$/, '');
script += `
;window.importPayPeriodWMT=importPayPeriodWMT;
window.isPayPeriodWMTData=isPayPeriodWMTData;
window.schedulesByDate=schedulesByDate;
`;
window.eval(script);

const tsv = fs.readFileSync(new URL('../shift-analyzer/test-real-pp192026.mjs', import.meta.url), 'utf8');
const tsvMatch = tsv.match(/const tsv = `([\s\S]*?)`;/);
if (!tsvMatch) throw new Error('Could not load sample TSV');

const sample = tsvMatch[1];
if (!window.isPayPeriodWMTData(sample)) throw new Error('Sample TSV not detected as pay period data');

const count = window.importPayPeriodWMT(sample);
const dates = Object.keys(window.schedulesByDate).sort();
console.log('Imported shifts:', count);
console.log('Dates with data:', dates.length, dates[0], 'â€¦', dates.at(-1));
if (count < 100) throw new Error(`Expected many shifts, got ${count}`);
if (dates.length < 10) throw new Error(`Expected ~14 dates, got ${dates.length}`);
console.log('OK');

