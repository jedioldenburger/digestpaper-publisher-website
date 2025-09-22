// Performance monitoring to trace forced reflows
(function() {
  'use strict';

  // Only run in development or when explicitly enabled
  const shouldMonitor = location.hostname === 'localhost' ||
                       location.search.includes('perf=true') ||
                       sessionStorage.getItem('perfMonitor') === 'true';

  if (!shouldMonitor) return;

  console.log('[PerfMonitor] 🔍 Monitoring forced reflows...');

  // Track layout-triggering property access
  const layoutProperties = [
    'offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft',
    'clientWidth', 'clientHeight', 'clientTop', 'clientLeft',
    'scrollWidth', 'scrollHeight', 'scrollTop', 'scrollLeft',
    'getComputedStyle', 'getBoundingClientRect'
  ];

  // Store original methods
  const originals = {};

  // Wrap Element.prototype methods
  layoutProperties.slice(0, -2).forEach(prop => {
    if (prop in Element.prototype) {
      Object.defineProperty(Element.prototype, prop, {
        get() {
          const stack = new Error().stack;
          const caller = stack.split('\n')[2]?.trim();
          console.warn(`[PerfMonitor] 🚨 Forced reflow: ${prop} accessed`, {
            element: this,
            caller: caller,
            stack: stack.split('\n').slice(1, 4)
          });
          return originals[prop].call(this);
        },
        configurable: true
      });
    }
  });

  // Wrap global functions
  originals.getComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function(element, pseudoElt) {
    const stack = new Error().stack;
    const caller = stack.split('\n')[2]?.trim();
    console.warn('[PerfMonitor] 🚨 Forced reflow: getComputedStyle called', {
      element: element,
      caller: caller,
      stack: stack.split('\n').slice(1, 4)
    });
    return originals.getComputedStyle.call(this, element, pseudoElt);
  };

  // Monitor style changes that could trigger reflows
  const originalStyleSetter = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'cssText')?.set;
  if (originalStyleSetter) {
    Object.defineProperty(CSSStyleDeclaration.prototype, 'cssText', {
      set(value) {
        const stack = new Error().stack;
        const caller = stack.split('\n')[2]?.trim();
        console.info('[PerfMonitor] 💄 Style change: cssText', {
          value: value,
          caller: caller
        });
        return originalStyleSetter.call(this, value);
      },
      configurable: true
    });
  }

  // Performance observer for layout events
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'measure' || entry.name.includes('layout')) {
            console.log('[PerfMonitor] 📏 Layout event:', entry);
          }
        });
      });
      observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    } catch (e) {
      console.log('[PerfMonitor] PerformanceObserver not fully supported');
    }
  }

  // Add toggle function
  window.togglePerfMonitor = function() {
    const current = sessionStorage.getItem('perfMonitor') === 'true';
    sessionStorage.setItem('perfMonitor', !current);
    location.reload();
  };

  console.log('[PerfMonitor] ✅ Monitoring active. Use togglePerfMonitor() to disable.');
})();
