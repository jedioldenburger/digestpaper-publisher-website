/**
 * Head-meta injector + JSON-LD graph + sitemap fallback
 * - Marker-based injectie (idempotent)
 * - Plaatst block direct na <head> als markers ontbreken
 * - 'language' => automatisch gemapt naar lang (html) + locale (OG/JSON-LD)
 * - Ondersteunt jsonldOnPage/injectJsonLd, twitter.card, og:image:alt, keywords[]|string
 * - Sitemap gebruikt priority/changefreq of valt terug op defaults
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");
const ROBOTS_PATH = path.join(PUBLIC_DIR, "robots.txt");

// Data
const pages = JSON.parse(fs.readFileSync(path.join(__dirname, "pages.json"), "utf-8"));

// Site-constanten
const SITE_NAME = "DigestPaper Media";
const SITE_BASE = "https://publisher.digestpaper.com/";
const SITE_LOGO = "/assets/logo.png";
const SITE_TWITTER = "@DigestPaper";

// ---------- utils ----------
function htmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureTrailingSlash(u) {
  try {
    const url = new URL(u);
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  } catch {
    return u.endsWith("/") ? u : u + "/";
  }
}

function absUrl(relOrAbs) {
  if (!relOrAbs) return "";
  try {
    // al absolute?
    new URL(relOrAbs);
    return relOrAbs;
  } catch {
    return new URL(relOrAbs, SITE_BASE).toString();
  }
}

function normalizeLanguage(meta) {
  // Accept: language | locale | lang
  const raw = meta.language || meta.locale || meta.lang || "nl-NL";
  const parts = String(raw).replace("_", "-").split("-");
  const lang = (parts[0] || "nl").toLowerCase();

  // Als er geen regio is, maak er LANG-REGIO van (nl -> nl-NL, en -> en-US)
  let locale = `${lang}-${lang.toUpperCase()}`;
  if (parts[1]) {
    locale = `${lang}-${parts[1].toUpperCase()}`;
  } else if (lang === "en") {
    locale = "en-US";
  }

  return { lang, locale };
}

function toKeywords(v) {
  if (Array.isArray(v)) return v.join(", ");
  return v || "";
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}

function relFromPublic(metaPath) {
  // Voorkom dat een leading slash het base pad overschrijft
  return metaPath.startsWith("/") ? metaPath.slice(1) : metaPath;
}

// ---------- head builder ----------
function buildHead(meta, html) {
  const { lang, locale } = normalizeLanguage(meta);

  const title = htmlEscape(meta.title);
  const desc = htmlEscape(meta.description);
  const keywords = htmlEscape(toKeywords(meta.keywords));
  const canonical = htmlEscape(ensureTrailingSlash(meta.canonical));
  const robots = htmlEscape(meta.robots || "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  const themeColor = htmlEscape(meta.themeColor || "#0f172a");
  const referrer = htmlEscape(meta.referrer || "strict-origin-when-cross-origin");
  const ogImage = htmlEscape(meta.ogImage || "/assets/og-image.png");
  const ogImageAlt = htmlEscape(meta.ogImageAlt || meta.title || SITE_NAME);
  const twitterCard = htmlEscape(meta.twitter?.card || "summary_large_image");
  const twitterSite = htmlEscape(meta.twitter?.site || SITE_TWITTER);
  const twitterCreator = htmlEscape(meta.twitter?.creator || SITE_TWITTER);

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const viewportLine = hasViewport ? "" : `<meta name="viewport" content="width=device-width, initial-scale=1">`;

  const block = `
<!-- BEGIN HEAD POLICY -->
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="keywords" content="${keywords}">
<meta name="robots" content="${robots}">
<meta name="referrer" content="${referrer}">
<meta name="theme-color" content="${themeColor}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<meta name="content-language" content="${locale}">

<!-- Geo/DC -->
<meta name="geo.placename" content="${htmlEscape(meta.geo?.placename || "")}">
<meta name="geo.position" content="${htmlEscape(meta.geo?.position || "")}">
<meta name="geo.region" content="${htmlEscape(meta.geo?.region || "")}">
<meta name="ICBM" content="${htmlEscape(meta.geo?.position || "")}">
<meta name="DC.title" content="${title}">
<meta name="DC.description" content="${desc}">
<meta name="DC.language" content="${locale}">
<meta name="DC.publisher" content="${SITE_NAME}">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:locale" content="${locale.replace("-", "_")}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:secure_url" content="${ogImage}">
<meta property="og:image:alt" content="${ogImageAlt}">

<!-- Twitter -->
<meta name="twitter:card" content="${twitterCard}">
<meta name="twitter:site" content="${twitterSite}">
<meta name="twitter:creator" content="${twitterCreator}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:image:alt" content="${ogImageAlt}">
${viewportLine}
<!-- END HEAD POLICY -->`.trim();

  return { block, lang, locale };
}

// ---------- JSON-LD ----------
function buildGraph(pages) {
  const orgId = SITE_BASE + "#org";
  const siteId = SITE_BASE + "#website";

  const org = {
    "@type": "Organization",
    "@id": orgId,
    "name": SITE_NAME,
    "url": SITE_BASE,
    "logo": absUrl(SITE_LOGO)
  };

  const website = {
    "@type": "WebSite",
    "@id": siteId,
    "url": SITE_BASE,
    "name": SITE_NAME + " Publisher",
    "publisher": { "@id": orgId },
    "inLanguage": "nl-NL",
    "potentialAction": {
      "@type": "SearchAction",
      "target": SITE_BASE + "search?q={query}",
      "query-input": "required name=query"
    }
  };

  const nodes = pages
    .filter(p => p.inGraph !== false) // alleen meenemen als inGraph !== false
    .map(p => {
      const { locale } = normalizeLanguage(p);
      return {
        "@type": "WebPage",
        "@id": ensureTrailingSlash(p.canonical) + "#webpage",
        "url": ensureTrailingSlash(p.canonical),
        "name": p.title,
        "description": p.description,
        "isPartOf": { "@id": siteId },
        "inLanguage": locale
      };
    });

  return {
    "@context": "https://schema.org",
    "@graph": [org, website, ...nodes]
  };
}

function injectBetweenMarkers(html, beginMarker, endMarker, replacement) {
  if (html.includes(beginMarker)) {
    return html.replace(new RegExp(`${beginMarker}([\\s\\S]*?)${endMarker}`), replacement);
  }
  // Geen markers → direct na <head>
  return html.replace(/<head([^>]*)>/i, `<head$1>\n${replacement}`);
}

function ensureHtmlLang(html, lang) {
  if (!lang) return html;
  if (/<html[^>]*\blang=/i.test(html)) {
    return html.replace(/<html([^>]*)\blang=(['"]).*?\2([^>]*)>/i, `<html$1lang="${lang}"$3>`);
  }
  return html.replace(/<html([^>]*)>/i, `<html$1 lang="${lang}">`);
}

// ---------- main per page ----------
function processPage(meta) {
  const rel = relFromPublic(meta.path);
  const filePath = path.join(PUBLIC_DIR, rel);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Bestand niet gevonden, overslaan: ${meta.path}`);
    return;
  }
  let html = readFileSafe(filePath);
  if (html == null) {
    console.warn(`⚠️ Kon niet lezen: ${filePath}`);
    return;
  }

  // lang attribuut op <html>
  const { block, lang } = buildHead(meta, html);
  html = ensureHtmlLang(html, lang || "nl");

  // HEAD POLICY injectie
  html = injectBetweenMarkers(
    html,
    "<!-- BEGIN HEAD POLICY -->",
    "<!-- END HEAD POLICY -->",
    block
  );

  // JSON-LD @graph injectie (alle nodes) – compatibel met jsonldOnPage of injectJsonLd
  const wantsJsonLd = meta.jsonldOnPage === true || meta.injectJsonLd === true || meta.path === "/index.html";
  if (wantsJsonLd) {
    const graph = buildGraph(pages);
    const jsonLd = `
<!-- BEGIN JSON-LD PUBLISHER -->
<script type="application/ld+json">
${JSON.stringify(graph, null, 2)}
</script>
<!-- END JSON-LD PUBLISHER -->`.trim();

    if (html.includes("<!-- BEGIN JSON-LD PUBLISHER -->")) {
      html = html.replace(
        /<!-- BEGIN JSON-LD PUBLISHER -->([\s\S]*?)<!-- END JSON-LD PUBLISHER -->/,
        jsonLd
      );
    } else if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${jsonLd}\n</head>`);
    } else {
      html += `\n${jsonLd}\n`;
    }
  }

  fs.writeFileSync(filePath, html, "utf-8");
  console.log(`✅ Injected meta for ${meta.path}`);
}

// ---------- sitemap & robots ----------
function buildSitemap(items) {
  const urlEntries = items.map((p) => {
    const rel = relFromPublic(p.path);
    const absPath = path.join(PUBLIC_DIR, rel);
    let lastmod = new Date().toISOString();
    try {
      const stat = fs.statSync(absPath);
      lastmod = stat.mtime.toISOString();
    } catch {}
    const loc = ensureTrailingSlash(p.canonical);
    const priority = typeof p.priority === "number" ? p.priority.toFixed(1) : (p.path === "/index.html" ? "1.0" : "0.8");
    const changefreq = p.changefreq || (p.path === "/index.html" ? "weekly" : "monthly");
    return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`.trim();
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
  fs.writeFileSync(SITEMAP_PATH, xml, "utf-8");
  console.log(`🗺️ Sitemap updated: ${path.relative(ROOT, SITEMAP_PATH)}`);
}

function ensureRobots() {
  const robots = `User-agent: *
Allow: /
Sitemap: ${new URL("sitemap.xml", SITE_BASE).toString()}
`;
  if (!fs.existsSync(ROBOTS_PATH)) {
    fs.writeFileSync(ROBOTS_PATH, robots, "utf-8");
    console.log(`🤖 robots.txt created: ${path.relative(ROOT, ROBOTS_PATH)}`);
  }
}

// ---------- run ----------
pages.forEach(processPage);
buildSitemap(pages);
ensureRobots();