# Forced Reflow Debugging Guide

## 🔍 Tracing Unattributed Forced Reflows

The website now includes performance monitoring to help trace the source of unattributed forced reflows.

### Enable Performance Monitoring

1. **Open the website**: https://publisher-digestpaper-com.web.app
2. **Enable monitoring**: Add `?perf=true` to the URL or run in browser console:
   ```javascript
   sessionStorage.setItem('perfMonitor', 'true');
   location.reload();
   ```
3. **Check console**: Look for `[PerfMonitor] 🚨 Forced reflow` warnings

### Optimizations Applied

✅ **Inline Script Optimizations:**
- **Timestamp Update**: Wrapped DOM updates in `requestAnimationFrame()`
- **JSON-LD Builder**: Deferred DOM queries to prevent layout thrashing
- **Dropdown Menus**: Batched attribute changes in RAF callbacks

✅ **Main App.js Optimizations:**
- **Ticker Animations**: Combined style changes with `Object.assign()`
- **Authentication UI**: Batched display property changes
- **Modal Forms**: Grouped visibility toggles

### Expected Impact

- **Previous**: 200ms → 132ms (34% improvement)
- **Now**: Should reduce unattributed reflows significantly
- **Target**: <50ms total forced reflow time

### Debugging Commands

```javascript
// Enable/disable monitoring
togglePerfMonitor()

// Check current status
window.checkConnectivity()

// Manual monitoring
sessionStorage.setItem('perfMonitor', 'true')
```

### What to Look For

The performance monitor will log:
- 🚨 **Forced reflows**: Property access that triggers layout
- 💄 **Style changes**: CSS modifications that could cause reflows
- 📏 **Layout events**: Performance timeline entries

This helps identify exactly which code is causing the remaining "[unattributed]" forced reflows!