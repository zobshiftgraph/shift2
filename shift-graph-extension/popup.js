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
  const dateEl = document.getElementById('lblSelectedDate');
  if (!dateEl) return { error: 'Not on Worksheet View' };
  const dateText = dateEl.textContent.trim();
  let out = '===DATE===\n' + dateText + '\n===SCHEDULE_START===\n';
  const shiftTable = document.getElementById('ScheduledShifts');
  if (!shiftTable) return { error: 'No shift table' };
  shiftTable.querySelectorAll('tr').forEach((row, i) => {
    if (i === 0) return;
    const tds = row.querySelectorAll('td');
    if (tds.length < 3) return;
    const rawCode = tds[0].textContent.trim();
    if (!rawCode) return;
    const names = [];
    tds[1].querySelectorAll('a').forEach(a => { const t=a.textContent.trim().replace(/\s+/g,''); if(t) names.push('('+t+')'); });
    tds[2].querySelectorAll('a').forEach(a => { const t=a.textContent.trim().replace(/\s+/g,''); if(t) names.push(t); });
    if (tds[3]) tds[3].querySelectorAll('a').forEach(a => { const t=a.textContent.trim().replace(/\s+/g,''); if(t) names.push('<'+t+'>'); });
    if (names.length) out += rawCode + '\n' + names.join(' ') + '\n';
  });
  out += '===REQUESTS_START===\n';
  ['tblShiftChange','tblXTECTE','tblSupRequests'].forEach((id, idx) => {
    out += 'CPC\tTYPE\tFROM\tTO\tWITH\tSTATUS\tINI\tREQUEST DATE\n';
    const tbl = document.getElementById(id);
    if (!tbl) return;
    tbl.querySelectorAll('tr').forEach((row, i) => {
      if (i === 0) return;
      const tds = row.querySelectorAll('td');
      if (tds.length < 6) return;
      out += [0,1,2,3,4,5,6,7].map(i => tds[i] ? tds[i].textContent.trim() : '').join('\t') + '\n';
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

