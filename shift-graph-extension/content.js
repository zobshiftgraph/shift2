// Content script — runs on WMT Scheduler pages
// Extracts worksheet view data and returns it to the popup

const SHIFT_LEGEND = {'2030-10':[20,30,30,30],'0500-9':[5,0,14,0],'1200-9':[12,0,21,0],'1400-9':[14,0,23,0],'1600':[16,0,24,0],'0000':[0,0,32,0],'2230':[22,30,30,30],'0600':[6,0,14,0],'0600-10':[6,0,16,0],'0600-9':[6,0,15,0],'0700':[7,0,15,0],'0700-10':[7,0,17,0],'0700-9':[7,0,16,0],'0800':[8,0,16,0],'1100-10':[11,0,21,0],'1200-10':[12,0,22,0],'1300':[13,0,21,0],'1300-10':[13,0,23,0],'1400':[14,0,22,0],'1500':[15,0,23,0],'0900':[9,0,17,0],'0700F':[7,0,15,0],'0800-10':[8,0,18,0],'0800-9':[8,0,17,0],'0000F':[0,0,32,0],'2230F':[22,30,30,30],'0530-7':[5,30,12,30],'0600F':[6,0,14,0],'0800F':[8,0,16,0],'1000-7':[10,0,17,0],'1200':[12,0,20,0],'1300-7':[13,0,20,0],'1300-9':[13,0,22,0],'1300F':[13,0,21,0],'1400F':[14,0,22,0],'1500F':[15,0,23,0],'1600F':[16,0,24,0],'1430':[14,30,22,30],'0730':[7,30,15,30],'0830':[8,30,16,30],'0900-10':[9,0,19,0],'1000':[10,0,18,0],'1100-9':[11,0,20,0],'1400-7':[14,0,21,0],'0600-7':[6,0,13,0],'0700-7':[7,0,14,0],'1400-10':[14,0,24,0],'0800-7':[8,0,15,0],'1500-9':[15,0,24,0],'2300F':[23,0,31,0],'2300':[23,0,31,0],'0630':[6,30,14,30],'2200-9':[22,0,31,0],'2300-9':[23,0,32,0],'0900-7':[9,0,16,0],'1600-7':[16,0,23,0],'1700-9':[17,0,26,0],'2200-10':[22,0,32,0],'0900-9':[9,0,17,0],'1200-7':[12,0,19,0],'2230-9':[22,30,31,30],'0730-7':[7,30,14,30],'1500-7':[15,0,22,0],'1000-10':[10,0,20,0],'1000-9':[10,0,19,0],'1100':[11,0,19,0],'1330':[13,30,21,30],'0630-7':[6,30,13,30],'2230-7':[22,30,29,30],'1100-7':[11,0,18,0],'1700-7':[17,0,24,0],'1615':[16,15,24,15],'1615-7':[16,15,23,15],'1700':[17,0,25,0],'2130':[21,30,29,30],'0530':[5,30,13,30],'1100F':[11,0,19,0],'2200':[22,0,30,0],'2100-10':[21,0,31,0],'0630-9':[6,30,15,30],'1200F':[12,0,20,0],'0500-10':[5,0,15,0],'0530-9':[5,30,14,30],'0530-10':[5,30,15,30],'1130':[11,30,19,30],'1530':[15,30,23,30],'2330-7':[23,30,30,30],'2130-9':[21,30,30,30],'1600-9':[16,0,25,0],'2300-7':[23,0,30,0],'1215-10':[12,15,22,15],'0000-7':[0,0,31,0],'1430-7':[14,30,21,30],'0600-10F':[6,0,16,0],'0900-10F':[9,0,19,0],'0400':[4,0,12,0],'1200-10F':[12,0,22,0],'0900F':[9,0,17,0],'2230-10':[22,30,32,30],'0930-7':[9,30,16,30],'0930':[9,30,17,30],'0630-10':[6,30,16,30],'1330-10':[13,30,23,30],'1300-10F':[13,0,23,0],'0000-9':[0,0,33,0],'0800-10F':[8,0,18,0],'1100-10F':[11,0,21,0],'0430-10':[4,30,14,30],'1330-9':[13,30,22,30],'0700-10F':[7,0,17,0],'1130-10':[11,30,21,30],'1430-9':[14,30,23,30],'0600-7F':[6,0,13,0],'1630':[16,30,24,30],'2345':[23,45,31,45],'0930-10':[9,30,19,30],'2100-10F':[21,0,31,0],'0545-6':[5,45,11,45],'0830-10':[8,30,18,30],'2345F':[23,45,31,45],'1400-10F':[14,0,24,0],'0500-6':[5,0,11,0],'2245':[22,45,30,45],'2245-9':[22,45,31,45],'2245F':[22,45,30,45],'0545-7':[5,45,12,45],'0700ADMIN':[7,0,15,30],'0500':[5,0,13,0],'0545':[5,45,13,45],'2100':[21,0,29,0]};

function extractWorksheetData() {
  const dateEl = document.getElementById('lblSelectedDate');
  if (!dateEl) return null;

  const dateText = dateEl.textContent.trim();
  let out = '===DATE===\n' + dateText + '\n===SCHEDULE_START===\n';

  const shiftTable = document.getElementById('ScheduledShifts');
  if (!shiftTable) return null;

  const rows = shiftTable.querySelectorAll('tr');
  for (let i = 1; i < rows.length; i++) {
    const tds = rows[i].querySelectorAll('td');
    if (tds.length < 3) continue;
    const rawCode = tds[0].textContent.trim();
    if (!rawCode) continue;
    const names = [];
    tds[1].querySelectorAll('a').forEach(a => {
      const t = a.textContent.trim().replace(/\s+/g, '');
      if (t) names.push('(' + t + ')');
    });
    tds[2].querySelectorAll('a').forEach(a => {
      const t = a.textContent.trim().replace(/\s+/g, '');
      if (t) names.push(t);
    });
    if (tds[3]) {
      tds[3].querySelectorAll('a').forEach(a => {
        const t = a.textContent.trim().replace(/\s+/g, '');
        if (t) names.push('<' + t + '>');
      });
    }
    if (names.length) out += rawCode + '\n' + names.join(' ') + '\n';
  }

  out += '===REQUESTS_START===\n';
  out += 'CPC\tTYPE\tFROM\tTO\tWITH\tSTATUS\tINI\tREQUEST DATE\n';

  function parseReqTable(tblId) {
    const tbl = document.getElementById(tblId);
    if (!tbl) return;
    tbl.querySelectorAll('tr').forEach((row, idx) => {
      if (idx === 0) return;
      const tds = row.querySelectorAll('td');
      if (tds.length < 6) return;
      out += [0,1,2,3,4,5,6,7].map(i => (tds[i] ? tds[i].textContent.trim() : '')).join('\t') + '\n';
    });
  }

  parseReqTable('tblShiftChange');
  out += 'CPC\tTYPE\tFROM\tTO\tWITH\tSTATUS\tINI\tREQUEST DATE\n';
  parseReqTable('tblXTECTE');
  out += 'CPC\tTYPE\tFROM\tTO\tWITH\tSTATUS\tINI\tREQUEST DATE\n';
  parseReqTable('tblSupRequests');

  return { type: 'worksheet', data: out, date: dateText };
}

function checkPage() {
  if (document.getElementById('lblSelectedDate')) {
    return { page: 'worksheet', date: document.getElementById('lblSelectedDate').textContent.trim() };
  }
  return { page: 'unknown' };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === 'check') {
    respond(checkPage());
  } else if (msg.action === 'extract') {
    const result = extractWorksheetData();
    respond(result || { error: 'Could not extract data' });
  }
  return true;
});
