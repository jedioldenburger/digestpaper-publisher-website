(function(){
  // Safe localStorage wrapper
  function safeLocalStorage() {
    try {
      return {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        available: true
      };
    } catch (e) {
      console.warn('localStorage not available for consent:', e.message);
      return {
        getItem: () => null,
        setItem: () => {},
        available: false
      };
    }
  }

  const storage = safeLocalStorage();
  
  // Minimal consent stub – vervang met je echte UI
  const key = "dp_consent_v1";
  const stored = storage.getItem(key);
  
  if (!stored) {
    // default: denied (al gezet in index)
    const banner = document.createElement("div");
    banner.style.cssText = "position:fixed;inset:auto 1rem 1rem 1rem;z-index:9999;background:#0b1220;color:#e5e7eb;border:1px solid rgba(56,189,248,.25);padding:.75rem;border-radius:.75rem";
    banner.innerHTML = `
      <strong>Cookies & Privacy</strong><br>
      We gebruiken alleen functionele cookies. Sta je analytics toe?
      <div style="margin-top:.5rem;display:flex;gap:.5rem;">
        <button id="c-accept" style="padding:.4rem .65rem;border-radius:.5rem;background:#0f766e;color:#eafff7;border:0">Accepteren</button>
        <button id="c-decline" style="padding:.4rem .65rem;border-radius:.5rem;background:#1f2937;color:#e5e7eb;border:1px solid #334155">Weigeren</button>
        <a href="/privacy" style="margin-left:auto;color:#38bdf8">Privacybeleid</a>
      </div>`;
    document.body.appendChild(banner);
    
    document.getElementById("c-accept").onclick = function(){
      if (typeof gtag === 'function') {
        gtag('consent','update',{
          ad_user_data:'granted',
          ad_personalization:'granted',
          ad_storage:'granted',
          analytics_storage:'granted',
          functionality_storage:'granted',
          personalization_storage:'granted'
        });
        gtag('event','page_view');
      }
      storage.setItem(key, JSON.stringify({t:Date.now(),v:"granted"}));
      banner.remove();
    };
    
    document.getElementById("c-decline").onclick = function(){
      storage.setItem(key, JSON.stringify({t:Date.now(),v:"denied"}));
      banner.remove();
    };
  }
})();
