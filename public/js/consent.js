(function () {
  // Consent disabled - automatically grant all permissions
  const key = "dp_consent_v1";

  // Auto-grant consent for analytics if gtag is available
  if (typeof gtag === "function") {
    gtag("consent", "update", {
      ad_user_data: "granted",
      ad_personalization: "granted",
      ad_storage: "granted",
      analytics_storage: "granted",
      functionality_storage: "granted",
      personalization_storage: "granted",
    });
    gtag("event", "page_view");
  }

  // Store consent as granted
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: "granted" }));
  } catch (e) {
    console.warn("localStorage not available for consent:", e.message);
  }

  console.log("[Consent] Auto-granted all permissions (consent bar disabled)");
})();
