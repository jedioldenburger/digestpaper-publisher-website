document.addEventListener("DOMContentLoaded", function () {
  var h1 = document.getElementById("site-title");
  if (!h1) return;

  var lang = (document.documentElement.getAttribute("lang") || "en")
    .slice(0, 2)
    .toLowerCase();

  var raw = h1.dataset[lang] || h1.dataset.en;
  if (!raw) return;

  var parts = raw.split("|");
  var brand = (parts[0] || "").trim();
  var tagline = (parts[1] || "").trim();

  h1.innerHTML = tagline
    ? brand + '<br><span class="tagline">' + tagline + "</span>"
    : brand;
});
