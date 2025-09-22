#!/usr/bin/env node
import fs from "fs";

const REQUIRED = {
  NewsArticle: ["headline", "datePublished", "dateModified", "image"],
  Organization: ["name", "url", "logo"],
  BreadcrumbList: ["itemListElement"],
};

function extractJsonLd(html) {
  const out = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    try {
      const json = JSON.parse(raw);
      out.push(json);
    } catch {
      console.error("Invalid JSON-LD block");
      process.exitCode = 1;
    }
  }
  return out;
}

function* iterateThings(node) {
  if (Array.isArray(node)) {
    for (const n of node) yield* iterateThings(n);
    return;
  }
  if (node && typeof node === "object") {
    if (node["@type"]) yield node;
    for (const v of Object.values(node)) yield* iterateThings(v);
  }
}

function hasRequiredProps(thing, type) {
  const must = REQUIRED[type] || [];
  return must.every((k) => Object.prototype.hasOwnProperty.call(thing, k));
}

let fail = false;
const file = "public/index.html";
const html = fs.readFileSync(file, "utf8");
const blocks = extractJsonLd(html);
if (blocks.length === 0) {
  console.error(`${file}: missing JSON-LD`);
  fail = true;
} else {
  for (const b of blocks) {
    for (const t of iterateThings(b)) {
      if (REQUIRED[t["@type"]] && !hasRequiredProps(t, t["@type"])) {
        console.error(`${file}: ${t["@type"]} missing required keys`);
        fail = true;
      }
    }
  }
}
if (fail) process.exit(1);
