(function() {
  const SCRIPT_NAME = 'analytica.js';
  const PULSE_INTERVAL = 30000; // 30 seconds for routine active heartbeats
  const IDLE_THRESHOLD = 30000; // 30 seconds of no interaction = idle
  const SESSION_INACTIVITY_LIMIT = 30 * 60 * 1000;

  // Configuration
  const script = document.currentScript;
  const apiEndpoint = script ? script.getAttribute('data-endpoint') : '';
  if (!apiEndpoint) return console.error('[Analytica] Missing data-endpoint.');

  // State
  let lastActivity = Date.now();
  let startTime = Date.now();
  let accumulatedTime = 0; // ms
  let currentUrl = window.location.pathname + window.location.search;
  let lastPageViewUrl = '';

  const storage = {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => { try { localStorage.setItem(key, value); } catch (e) {} }
  };

  function getSessionId() {
    let sid = sessionStorage.getItem('_asid');
    const lastSeen = storage.get('_alast_seen');
    const now = Date.now();
    if (sid && lastSeen && (now - parseInt(lastSeen) > SESSION_INACTIVITY_LIMIT)) sid = null;
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('_asid', sid);
    }
    storage.set('_alast_seen', now.toString());
    return sid;
  }

  function getTrackingId() {
    const urlParams = new URLSearchParams(window.location.search);
    let tid = urlParams.get('tid');
    if (tid) storage.set('_atid', tid); else tid = storage.get('_atid');
    return tid;
  }

  /** Central Dispatcher */
  function sendEvent(eventType, metadata = {}, useBeacon = false) {
    const tid = getTrackingId();
    if (!tid) return;

    if (eventType === 'PAGE_VIEW') {
      if (currentUrl === lastPageViewUrl) return; // Deduplicate
      lastPageViewUrl = currentUrl;
    }

    const payload = JSON.stringify({
      trackingId: tid,
      sessionId: getSessionId(),
      events: [{
        eventType,
        timestamp: Date.now(),
        metadata: {
          url: currentUrl,
          referrer: document.referrer,
          ...metadata
        }
      }]
    });

    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(`${apiEndpoint}/events`, payload);
    } else {
      fetch(`${apiEndpoint}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  }

  /** Engagement Logic */
  function getActiveDuration() {
    const now = Date.now();
    const isIdle = (now - lastActivity) > IDLE_THRESHOLD;
    const isHidden = document.visibilityState === 'hidden';

    if (!isIdle && !isHidden) {
      accumulatedTime += (now - startTime);
    }
    startTime = now;
    
    const durationSec = Math.round(accumulatedTime / 1000);
    accumulatedTime = accumulatedTime % 1000; // Keep the remainder
    return durationSec;
  }

  function flushEngagement(type = 'PULSE') {
    const duration = getActiveDuration();
    if (duration > 0 || type === 'PAGE_VIEW') {
      sendEvent(type, { duration }, type === 'EXIT');
    }
  }

  // Activity Listeners
  ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(ev => {
    window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true });
  });

  // Pulse & Exit
  setInterval(() => flushEngagement('PULSE'), PULSE_INTERVAL);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEngagement('PULSE');
    else startTime = Date.now(); // Reset start on return
  });
  window.addEventListener('pagehide', () => flushEngagement('EXIT'));

  /** SPA Support (History Intercept) */
  const handleNav = () => {
    flushEngagement('PULSE'); // Send time for previous page
    currentUrl = window.location.pathname + window.location.search;
    sendEvent('PAGE_VIEW');
  };

  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    handleNav();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    handleNav();
  };

  window.addEventListener('popstate', handleNav);

  // Initial Boot
  document.addEventListener('DOMContentLoaded', () => {
    // Sync current URL once before first event
    currentUrl = window.location.pathname + window.location.search;
    sendEvent('PAGE_VIEW');
  });

  window.analytica = { 
    track: (type, meta) => sendEvent(type, meta) 
  };

})();
