const statusEl = document.getElementById('status');
const btnSend  = document.getElementById('btnSend');
const hintEl   = document.getElementById('hint');
const logEl    = document.getElementById('log');

function setStatus(msg, cls) { statusEl.textContent = msg; statusEl.className = 'status ' + (cls || ''); }
function log(msg) { if (logEl) logEl.textContent += msg + '\n'; }

function findShiftGraphTab(tabs) {
  return tabs.find(t => {
    const url   = (t.url   || '').toLowerCase();
    const title = (t.title || '').toLowerCase();
    return url.includes('shift-visualizer') ||
           url.includes('shift-graph') ||
           title.includes('shift graph') ||
           title.includes('shift visualizer');
  });
}

function extractWorksheet() {
  function textOf(el) {
    if (!el) return '';
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'table') {
      return [...el.querySelectorAll('tr')].map(row => (row.innerText || row.textContent || '').replace(/\s+/g, ' ').trim()).filter(line => line && !/^notes:?$/i.test(line)).join('\n\n');
    }
    const raw = (tag === 'textarea' || tag === 'input') ? (el.value || '') : (el.innerText || el.textContent || '');
    return String(raw || '').replace(/\u00a0/g, ' ').trim();
  }
  function notesText(doc) {
    const ids = ['lblNotes','txtNotes','Notes','divNotes','taNotes','DailyNotes','lblDailyNotes','txtDailyNotes','worksheetNotes','lblWorksheetNotes','ShiftNotes','lblShiftNotes','txtShiftNotes','pnlNotes','txtAreaNotes','Comments','lblComments','txtComments','lblDailyLog','txtDailyLog'];
    for (const id of ids) {
      const t = textOf(doc.getElementById(id));
      if (t && t.length < 8000) return t;
    }
    const nodes = doc.querySelectorAll('h1,h2,h3,h4,legend,th,label,span,div,td,caption');
    for (const node of nodes) {
      const label = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
      if (label.length > 40) continue;
      if (!/^notes:?$/i.test(label) && !/^shift notes:?$/i.test(label) && !/^daily notes:?$/i.test(label)) continue;
      let box = node.nextElementSibling;
      if (!box && node.parentElement) box = node.parentElement.nextElementSibling;
      if (!box) continue;
      const area = box.querySelector ? box.querySelector('textarea,input[type="text"]') : null;
      const text = textOf(area || box);
      if (text && text.length < 8000 && !/^notes:?$/i.test(text)) return text;
    }
    return '';
  }
  const dateEl = document.getElementById('lblSelectedDate');
  if (!dateEl) return { error: 'Not on Worksheet View' };
  const shiftTable = document.getElementById('ScheduledShifts');
  if (!shiftTable) return { error: 'No shift table' };
  const dateText = dateEl.textContent.trim();
  let out = '===DATE===\n' + dateText + '\n===SCHEDULE_START===\n';
  const rows = [...shiftTable.querySelectorAll('tr')];
  const col = { sup: 1, cpc: 2, dev: 3, detail: -1 };
  let headerKnown = false;
  if (rows.length) {
    const heads = rows[0].querySelectorAll('th,td');
    for (let h = 0; h < heads.length; h++) {
      const label = (heads[h].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!label) continue;
      if (label === 'detail' || label.indexOf('detail') === 0) { col.detail = h; headerKnown = true; }
      else if (label === 'dev' || label.indexOf('develop') === 0 || label === 'trainee' || label.indexOf('trainee') === 0) { col.dev = h; headerKnown = true; }
      else if (label === 'cpc') { col.cpc = h; headerKnown = true; }
      else if (label === 'sup' || label === 'cic' || label.indexOf('supervis') === 0) { col.sup = h; headerKnown = true; }
    }
  }
  if (!headerKnown) {
    for (let r = 1; r < rows.length; r++) {
      if (rows[r].querySelectorAll('td').length > 4) { col.detail = 4; break; }
    }
  }
  function cellNames(cell, wrap) {
    if (!cell) return [];
    const links = cell.querySelectorAll('a');
    const bits = links.length ? [...links].map(a => a.textContent || '') : [cell.textContent || ''];
    const names = [];
    bits.forEach(bit => {
      String(bit).trim().split(/[\s,]+/).forEach(part => {
        const t = part.replace(/[()<>\[\]{}]/g, '').replace(/\s+/g, '');
        if (/^[A-Za-z]{1,3}$/.test(t)) names.push(wrap(t.toUpperCase()));
      });
    });
    return names;
  }
  rows.forEach((row, i) => {
    if (i === 0) return;
    const tds = row.querySelectorAll('td');
    if (tds.length < 3) return;
    const rawCode = (tds[0].textContent || '').trim();
    if (!rawCode) return;
    const names = []
      .concat(cellNames(tds[col.sup], t => '(' + t + ')'))
      .concat(cellNames(tds[col.cpc], t => t))
      .concat(col.dev >= 0 && tds[col.dev] ? cellNames(tds[col.dev], t => '<' + t + '>') : [])
      .concat(col.detail >= 0 && tds[col.detail] ? cellNames(tds[col.detail], t => '{' + t + '}') : []);
    if (names.length) out += rawCode + '\n' + names.join(' ') + '\n';
  });
  const notes = notesText(document);
  if (notes) out += '===NOTES_START===\n' + notes + '\n===NOTES_END===\n';
  ['tblShiftChange','tblXTECTE','tblSupRequests'].forEach(id => {
    out += 'CPC\tTYPE\tFROM\tTO\tWITH\tSTATUS\tINI\tREQUEST DATE\n';
    const tbl = document.getElementById(id);
    if (!tbl) return;
    tbl.querySelectorAll('tr').forEach((row, i) => {
      if (i === 0) return;
      const tds = row.querySelectorAll('td');
      if (tds.length < 6) return;
      out += [0,1,2,3,4,5,6,7].map(n => tds[n] ? tds[n].textContent.trim() : '').join('\t') + '\n';
    });
  });
  return { data: out, date: dateText };
}

// Check page
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs[0];
  if (!tab || !tab.url) { setStatus('No active tab.', 'warn'); return; }
  if (!tab.url.includes('wmtscheduler')) { setStatus('Not on WMT Scheduler.', 'warn'); return; }

  // Use tab title/URL to detect page type instead of injecting script
  const url = tab.url.toLowerCase();
  const isWorksheet = url.includes('worksheetview') || url.includes('worksheet');

  if (isWorksheet) {
    setStatus('✓ Worksheet View', 'ok');
    hintEl.textContent = "Click to send this day's schedule to Shift Graph.";
    btnSend.disabled = false;
  } else {
    setStatus('Go to Worksheet View\n(a specific day).', 'warn');
  }
});

btnSend.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const wmtTab = tabs[0];
    btnSend.disabled = true;
    btnSend.textContent = '⏳ Reading…';
    log('Extracting from page...');

    chrome.scripting.executeScript({
      target: { tabId: wmtTab.id },
      world: 'MAIN',
      func: extractWorksheet
    }, results => {
      if (chrome.runtime.lastError) {
        setStatus('Error reading page', 'err');
        log('Error: ' + chrome.runtime.lastError.message);
        btnSend.disabled = false; btnSend.textContent = '📋 Send to Shift Graph'; return;
      }

      const resp = results?.[0]?.result;
      if (!resp || resp.error) {
        setStatus('Could not read: ' + (resp?.error || 'unknown'), 'err');
        btnSend.disabled = false; btnSend.textContent = '📋 Send to Shift Graph'; return;
      }

      log('Got ' + resp.data.length + ' chars for ' + resp.date);

      chrome.tabs.query({}, allTabs => {
        const sgTab = findShiftGraphTab(allTabs);
        if (!sgTab) {
          log('No Shift Graph tab found. Titles: ' + allTabs.map(t=>t.title||'?').slice(0,10).join(', '));
          setStatus('Shift Graph tab not found!\nOpen shift-visualizer.html first.', 'err');
          btnSend.disabled = false; btnSend.textContent = '📋 Send to Shift Graph'; return;
        }

        log('Sending to: ' + (sgTab.title || sgTab.url));

        chrome.scripting.executeScript({
          target: { tabId: sgTab.id },
          world: 'MAIN',
          func: (data) => {
            if (typeof importFromText === 'function') {
              try { importFromText(data); return 'ok'; }
              catch(e) { return 'error:' + e.message; }
            }
            window.dispatchEvent(new CustomEvent('sgImport', { detail: data }));
            return 'event';
          },
          args: [resp.data]
        }, results2 => {
          if (chrome.runtime.lastError) {
            setStatus('Send failed', 'err'); log(chrome.runtime.lastError.message);
            btnSend.disabled = false; btnSend.textContent = '📋 Send to Shift Graph'; return;
          }
          const r = results2?.[0]?.result || '?';
          log('Result: ' + r);
          setStatus(r === 'ok' ? '✓ Sent to Shift Graph!' : '⚠ ' + r, r === 'ok' ? 'ok' : 'warn');
          btnSend.textContent = r === 'ok' ? '✓ Done!' : '📋 Send to Shift Graph';
          if (r === 'ok') chrome.tabs.update(sgTab.id, { active: true });
        });
      });
    });
  });
});

// Prevent popup from closing when tab switches
document.addEventListener("visibilitychange", e => e.stopImmediatePropagation(), true);

