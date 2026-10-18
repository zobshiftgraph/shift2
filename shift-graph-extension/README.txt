SHIFT GRAPH CONNECTOR — INSTALL INSTRUCTIONS
=============================================

1. Open Edge and go to: edge://extensions/
2. Turn ON "Developer mode" (toggle in bottom-left)
3. Click "Load unpacked"
4. Select this folder (shift-graph-extension)
5. Open the extension's details and turn ON "Allow access to file URLs"
   (needed so the Pre-Duty WX button on the local graph page can reach the connector)
6. The Shift Graph icon will appear in your toolbar

After an update, click Reload on this extension, then refresh the Shift Graph page.

HOW TO USE — SCHEDULE
---------------------
1. Log into wmtscheduler.faa.gov
2. Navigate to a day's Worksheet View
3. Click the Shift Graph toolbar icon
4. Click "Send to Shift Graph"
5. Open (or switch to) your Shift Graph HTML file
   — it will automatically load the new data

HOW TO USE — PRE-DUTY WX
------------------------
1. Open Shift Graph and pick an area
2. Click "Pre-Duty WX"
3. The connector reads today's ZOB pre-duty list in a background tab and marks those bars
   On the intranet that tab does not ask you to sign in

NOTES
-----
- The extension only reads data, never writes anything to WMT or the pre-duty site
- Data is stored locally in your browser (chrome.storage.local)
- Shift Graph checks for new schedule data every time it loads or gains focus
- You can send multiple days one at a time
