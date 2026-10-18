const PREDUTY_PAGE = 'https://ksn2.faa.gov/AJO/PredutyWX/TCOB/SitePages/ZOB.aspx';

function isGatewayHop(url) {
  return !url || url === 'about:blank' || url.includes('/tacgw/init');
}

function waitUntilSettled(tabId) {
  const deadline = Date.now() + 20000;
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete' && !isGatewayHop(tab.url || '')) {
          clearInterval(timer);
          resolve(tab);
        } else if (Date.now() > deadline) {
          clearInterval(timer);
          reject(new Error('The pre-duty page took too long to load.'));
        }
      } catch (e) {
        clearInterval(timer);
        reject(new Error('The pre-duty page closed before it finished loading.'));
      }
    }, 250);
  });
}

function predutyFetchInPage() {
  const LIST = '2797cca5-641b-410c-a956-dd3b32db05bc';
  const root = location.origin + '/AJO/PredutyWX/TCOB';
  function nyKey(d) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(d);
    } catch (e) {
      const z = new Date(d.getTime() - 4 * 3600000);
      return z.getUTCFullYear() + '-' + String(z.getUTCMonth() + 1).padStart(2, '0') + '-' + String(z.getUTCDate()).padStart(2, '0');
    }
  }
  function parseSpDate(v) {
    if (!v) return null;
    const m = String(v).match(/Date\((\d+)/);
    if (m) return new Date(Number(m[1]));
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  function areaOf(raw) {
    const s = String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (s === 'TMU') return 'TMU';
    const m = s.match(/^AREA\s*([1-8])$/);
    return m ? ('AREA ' + m[1]) : '';
  }
  function addCode(bag, area, raw) {
    String(raw || '').toUpperCase().split(/[^A-Z]+/).forEach((code) => {
      if (code.length !== 2 || !area) return;
      const key = area + '\t' + code;
      if (!bag[key]) bag[key] = true;
    });
  }
  function fromDom() {
    const box = document.getElementById('WebPartWPQ2');
    if (!box) return [];
    let area = '';
    const lines = [];
    box.querySelectorAll('tr').forEach((tr) => {
      const gb = tr.querySelector('.ms-gb,.ms-gb2');
      if (gb) {
        const t = gb.textContent.replace(/\s+/g, ' ').trim();
        const m = t.match(/AREA\s*[1-8]|TMU/i);
        area = m ? areaOf(m[0]) : '';
        return;
      }
      if (!area) return;
      tr.querySelectorAll('td').forEach((td) => {
        const cell = td.textContent.trim();
        if (/^[A-Za-z]{2}$/.test(cell)) lines.push(area + '\t' + cell.toUpperCase());
      });
    });
    return lines;
  }
  function pack(lines) {
    const uniq = [];
    const seen = {};
    lines.forEach((line) => {
      if (!seen[line]) { seen[line] = true; uniq.push(line); }
    });
    if (!uniq.length) return { ok: false, error: 'No pre-duty initials found for today.' };
    return { ok: true, text: '===PREDUTY WX===\n' + uniq.join('\n') };
  }

  const today = nyKey(new Date());
  const start = new Date(Date.now() - 36 * 3600000).toISOString().replace(/\.\d+Z$/, '');
  const url = root + "/_api/web/lists(guid'" + LIST + "')/items?$select=AREA,INITIALS,INITIALS2,DATE_x002f_TIME&$orderby=DATE_x002f_TIME desc&$top=500&$filter=DATE_x002f_TIME ge datetime'" + start + "'";
  return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json;odata=verbose' } })
    .then((r) => {
      if (!r.ok) throw new Error('list ' + r.status);
      return r.json();
    })
    .then((data) => {
      const rows = (data.d && data.d.results) || [];
      const bag = {};
      rows.forEach((item) => {
        const when = parseSpDate(item.DATE_x002f_TIME);
        if (when && nyKey(when) !== today) return;
        const area = areaOf(item.AREA);
        addCode(bag, area, item.INITIALS);
        addCode(bag, area, item.INITIALS2);
      });
      const lines = Object.keys(bag);
      return pack(lines.length ? lines : fromDom());
    })
    .catch(() => pack(fromDom()));
}

async function fetchPreduty() {
  const existing = await chrome.tabs.query({ url: 'https://ksn2.faa.gov/AJO/PredutyWX/*' });
  let tabId = existing[0] && existing[0].id;
  let opened = false;
  if (!tabId) {
    const tab = await chrome.tabs.create({ url: PREDUTY_PAGE, active: false });
    tabId = tab.id;
    opened = true;
  }
  try {
    await waitUntilSettled(tabId);
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: predutyFetchInPage
    });
    const result = results && results[0] && results[0].result;
    if (!result || !result.ok) {
      return { ok: false, error: (result && result.error) || 'Could not read the ZOB pre-duty list.' };
    }
    return result;
  } catch (e) {
    const msg = e && e.message;
    const friendly = msg && /took too long|closed before/.test(msg) ? msg : 'Could not read the ZOB pre-duty list.';
    return { ok: false, error: friendly };
  } finally {
    if (opened) {
      try { await chrome.tabs.remove(tabId); } catch (e) {}
    }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'fetch-preduty') return;
  fetchPreduty()
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: err && err.message ? err.message : 'Could not read the ZOB pre-duty list.' }));
  return true;
});
