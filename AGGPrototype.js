(function() {
  // 1. Block external script injections
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    if (tagName === 'script') {
      element.setAttribute('src', ''); // Prevent external src from being loaded
    }
    return element;
  };

  // 2. Override visibilityState and hidden properties
  Object.defineProperty(document, 'visibilityState', {
    get: () => 'visible',
  });
  Object.defineProperty(document, 'hidden', {
    get: () => false,
  });

  // 3. Prevent focus/blur event detection
  window.addEventListener('blur', (event) => {
    event.preventDefault();
    window.focus();  // Keep the tab focused
  });
  window.addEventListener('focus', (event) => {
    event.preventDefault();
    window.focus();  // Prevent losing focus
  });

  // 4. Prevent tab closure
  window.onbeforeunload = function() {
    return "Are you sure you want to leave this page?";
  };

  // 5. Block external iframe injections
  const originalAppendChild = Element.prototype.appendChild;
  Element.prototype.appendChild = function(child) {
    if (child.tagName === 'IFRAME' && !child.src.includes(location.origin)) {
      console.warn('Blocked external iframe:', child.src);
      return null;
    }
    return originalAppendChild.call(this, child);
  };

  // 6. Block WebSocket connections to external sources
  const originalWebSocket = WebSocket;
  WebSocket = function(url, protocols) {
    if (!url.includes(location.origin)) {
      console.warn('Blocked WebSocket connection:', url);
      return null; // Block external connections
    }
    return new originalWebSocket(url, protocols);
  };

  // 7. Inject a Content-Security-Policy (CSP)
  const meta = document.createElement('meta');
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = "default-src 'self'; script-src 'self'; style-src 'self';";
  document.head.appendChild(meta);

  // 8. Clear the console to block developer tools access
  setInterval(() => {
    if (window.console) {
      console.clear();
      console.log('Console access restricted.');
    }
  }, 500);

  // 9. Block chrome detection (to prevent GoGuardian detection)
  window.chrome = null;  // Disable the `chrome` object

  // 10. Hide navigator properties
  Object.defineProperty(navigator, 'platform', {
    value: 'Unknown',
    writable: false,
  });

  // 11. Block background monitoring using setInterval
  const originalSetInterval = window.setInterval;
  window.setInterval = function(callback, delay, ...args) {
    if (callback.toString().includes('GoGuardian')) {
      console.warn('Blocked GoGuardian setInterval call');
      return;  // Prevent GoGuardian's interval from being set
    }
    return originalSetInterval(callback, delay, ...args);
  };

  // 12. Remove suspicious DOM elements like injected iframes
  setInterval(() => {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      if (!iframe.src.includes(location.origin)) {
        iframe.remove();
        console.warn('Removed suspicious iframe:', iframe.src);
      }
    });
  }, 1000);

  // 13. Prevent mouse and keyboard event tracking
  document.addEventListener('mousemove', function(event) {
    event.preventDefault();
  }, true);

  document.addEventListener('keydown', function(event) {
    event.preventDefault();
  }, true);

})();
