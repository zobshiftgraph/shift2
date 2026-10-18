(function () {
  const href = (location.href || '').toLowerCase();
  const title = (document.title || '').toLowerCase();
  const isGraph = title === 'shift graph'
    || href.includes('shift-visualizer')
    || (href.includes('index.html') && (href.includes('shiftgraph') || href.includes('/shift2/')));
  if (!isGraph) return;

  document.documentElement.dataset.sgConnector = '1';

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'sg-connector-ping') {
      window.postMessage({ type: 'sg-connector-pong', requestId: event.data.requestId }, '*');
      return;
    }
    if (event.data.type !== 'sg-fetch-preduty') return;
    const requestId = event.data.requestId;
    chrome.runtime.sendMessage({ type: 'fetch-preduty' }, (resp) => {
      const err = chrome.runtime.lastError;
      window.postMessage({
        type: 'sg-preduty-result',
        requestId,
        ok: !!(resp && resp.ok),
        text: resp && resp.text,
        error: (resp && resp.error) || (err && err.message) || ''
      }, '*');
    });
  });
})();
