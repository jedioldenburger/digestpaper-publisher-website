#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
advanced_rewriter_plus.py
-------------------------
Advanced article rewriter + static exporter for DigestPaper.com

What it does (per rewritten article):
- Writes canonical HTML page:   /nieuws/{slug}/index.html
- Writes AMP HTML page:         /nieuws/{slug}/amp/index.html
- Writes forum alias page:      /forum/{slug}/index.html   (noindex, canonical → /nieuws/{slug}#discuss)
- Writes JSON API snapshot:     /nieuws/{slug}/api/index.json
- Includes inline "Discussie" seed on the article page (anchor #discuss)
- Emits JSON-LD for NewsArticle, Breadcrumbs, Organization, WebSite(SearchAction)
- Adds advanced SEO meta (robots, googlebot, hreflang, news_keywords, OG/Twitter)
- (Optional) Writes a Google News sitemap for the processed batch

Requirements:
    pip install firebase-admin openai beautifulsoup4 nltk

Environment:
    GROQ_API_KEY (preferred) or GROC_API_KEY — your Groq API key (OpenAI-compatible endpoint)

Usage examples:
    python advanced_rewriter_plus.py
    python advanced_rewriter_plus.py --limit 5 --sleep 2 --style Normal --language Dutch
    python advanced_rewriter_plus.py --output-base "/path/to/public"
"""

from __future__ import annotations

import os
import re
import json
import time
import argparse
import unicodedata
import sys
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple, Optional, List
from urllib.parse import quote_plus

# Firestore
import firebase_admin
from firebase_admin import credentials, firestore

# OpenAI client (Groq-compatible endpoint)
try:
    from openai import OpenAI
except Exception:
    OpenAI = None  # type: ignore

# ---------------------------
# Config / Defaults
# ---------------------------

BASE_URL = "https://digestpaper.com"
FORUM_BASE_URL = f"{BASE_URL}/forum"
SOURCE_COLLECTION = "articles_full"
DEST_COLLECTION = "articles_rewritten_digestpaper"

DEFAULT_STYLE = "Normal"                # Technical, Normal, Easy, Populair, News Reader
DEFAULT_LANGUAGE = "Dutch"              # Dutch, English, German
MODEL_NAME = "llama-3.1-70b-versatile"    # Groq model id

# Always write static/AMP/forum alias/API
WRITE_STATIC_ALWAYS = True

OUTPUT_BASE_DIR_DEFAULT = "/Users/_akira/CSAD/websites-new-2025/publisher-digestpaper-com/public"

# Batch controls
DEFAULT_LIMIT = None  # Process all articles
DEFAULT_SLEEP = 3

# Create Google News sitemap for this batch
WRITE_NEWS_SITEMAP_DEFAULT = True
SITEMAP_DIR_REL = "sitemaps"  # under output base

SERVICE_ACCOUNT_CANDIDATES = [
    "./serviceAccountKey.json",
    "../serviceAccountKey.json",
    os.path.expanduser("~/serviceAccountKey.json"),
    os.path.expanduser("~/.config/firebase/serviceAccountKey.json"),
    os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json"),
]

# Inline discussion on the article page (/nieuws/{slug}#discuss)
INLINE_DISCUSSION = True

# ---------------------------
# URL Generation Helpers
# ---------------------------

def make_urls(slug: str) -> dict:
    """Generate consistent URL structure for articles"""
    canonical = f"{BASE_URL}/nieuws/{slug}"
    amp = f"{canonical}/amp"
    discussion = f"{BASE_URL}/forum/{slug}"
    api = f"{canonical}/api/index.json"
    return {
        "canonical": canonical,
        "amp": amp,
        "discussion": discussion,
        "api": api,
    }

def make_share_urls(title: str, canonical: str) -> dict:
    """Generate social sharing URLs"""
    t = quote_plus(title)
    u = quote_plus(canonical)
    return {
        "email": f"mailto:?subject={t}&body={t}%0A%0A{u}",
        "facebook": f"https://www.facebook.com/sharer/sharer.php?u={u}",
        "twitter": f"https://twitter.com/intent/tweet?text={t}&url={u}",
        "linkedin": f"https://www.linkedin.com/shareArticle?mini=true&url={u}&title={t}",
        "whatsapp": f"https://wa.me/?text={t}%20{u}",
    }

# ---------------------------
# Globals (client/state)
# ---------------------------

_ai_client = None
_ai_model = None
_client_type = "openai"  # Groq via OpenAI-compatible endpoint

# ---------------------------
# Utilities
# ---------------------------

# Dutch timezone (CET/CEST: +01:00 in winter, +02:00 in summer)
DUTCH_TZ = timezone(timedelta(hours=1))  # CET (winter)
DUTCH_TZ_DST = timezone(timedelta(hours=2))  # CEST (summer)


def get_dutch_timezone() -> timezone:
    """Returns the appropriate Dutch timezone (CET or CEST) based on current date."""
    # Simplified DST calculation: March last Sunday to October last Sunday
    # For production, consider using pytz or zoneinfo for accurate DST handling
    now = datetime.now()
    if now.month > 3 and now.month < 10:
        return DUTCH_TZ_DST  # Summer time (CEST)
    elif now.month == 3:
        # Last Sunday of March
        last_sunday = 31
        while datetime(now.year, 3, last_sunday).weekday() != 6:
            last_sunday -= 1
        if now.day >= last_sunday:
            return DUTCH_TZ_DST
    elif now.month == 10:
        # Last Sunday of October
        last_sunday = 31
        while datetime(now.year, 10, last_sunday).weekday() != 6:
            last_sunday -= 1
        if now.day < last_sunday:
            return DUTCH_TZ_DST
    return DUTCH_TZ


def get_dutch_now() -> datetime:
    """Returns current datetime in Dutch timezone (CET/CEST)."""
    return datetime.now(get_dutch_timezone())


def ensure_tz_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=get_dutch_timezone())
    return dt


def iso_timestamp(dt: datetime) -> str:
    tz_aware = ensure_tz_aware(dt)
    return tz_aware.replace(microsecond=0).isoformat()


def strip_diacritics(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def slugify(s: str, max_len: int = 80) -> str:
    s = strip_diacritics(s or "")
    s = s.replace("'", "")
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s[:max_len].rstrip("-") or "artikel"

def html_escape(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def sanitize_ugc_links_server_side(html_content: str, base_url: str = BASE_URL) -> str:
    """
    Server-side UGC link sanitization - adds rel="ugc nofollow noopener noreferrer"
    to external links in user-generated content.

    Use this when rendering comments/reactions server-side to ensure proper SEO
    and security attributes are applied before serving HTML to clients.

    Args:
        html_content: HTML content with potential external links
        base_url: Your site's base URL (internal links won't be modified)

    Returns:
        Sanitized HTML with proper rel attributes on external links
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html_content, 'html.parser')

    # Find all external HTTP/HTTPS links
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')

        # Check if it's an external HTTP/HTTPS link
        if href.startswith(('http://', 'https://')) and not href.startswith(base_url):
            # Add UGC attributes for external links
            existing_rel = link.get('rel', [])
            if isinstance(existing_rel, str):
                existing_rel = existing_rel.split()

            # Add required attributes if not already present
            ugc_attrs = ['ugc', 'nofollow', 'noopener', 'noreferrer']
            for attr in ugc_attrs:
                if attr not in existing_rel:
                    existing_rel.append(attr)

            link['rel'] = ' '.join(existing_rel)
            link['target'] = '_blank'  # Open external links in new tab

    return str(soup)

def normalize_paragraphs(body_html: str) -> str:
    # 1) dubbele <br> → paragraafscheiding
    body_html = re.sub(r'(\s*<br\s*/?>\s*){2,}', '</p>\n<p>', body_html, flags=re.I)
    # 2) losse <br> die overblijven: meestal soft breaks → laat staan, of strip:
    # body_html = re.sub(r'<br\s*/?>\s*', ' ', body_html, flags=re.I)

    # 3) voorkom lege paragrafen
    body_html = re.sub(r'<p>\s*</p>', '', body_html)
    return body_html

# gebruik:
# payload["body_html"] = normalize_paragraphs(payload["body_html"])
def build_urls(slug: str) -> Dict[str, str]:
    """Legacy wrapper - use make_urls() for new code"""
    urls = make_urls(slug)
    # Add legacy fields for compatibility
    forum_alias = f"{FORUM_BASE_URL}/{slug}"
    urls["forum"] = forum_alias
    # Update discussion to point to forum URL instead of #discuss anchor
    urls["discussion"] = forum_alias
    return urls

def build_share_urls(title: str, url: str) -> Dict[str, str]:
    """Legacy wrapper - use make_share_urls() for new code"""
    return make_share_urls(title, url)

# ---------------------------
# JSON-LD builders
# ---------------------------

def build_org_ld() -> Dict[str, Any]:
    return {
        "@type": "Organization",
        "@id": f"{BASE_URL}/#org",
        "name": "DigestPaper.com",
        "url": BASE_URL,
        "logo": {
            "@type": "ImageObject",
            "url": f"{BASE_URL}/favicon/favicon-192x192.png",
            "width": 192,
            "height": 192,
        },
        "sameAs": [
            "https://www.linkedin.com/in/cybersecurityad",
            "https://x.com/digestpaper"
        ],
    }

def build_website_ld() -> Dict[str, Any]:
    return {
        "@type": "WebSite",
        "@id": f"{BASE_URL}/#website",
        "url": BASE_URL,
        "name": "DigestPaper.com",
        "publisher": {"@id": f"{BASE_URL}/#org"},
        "potentialAction": {
            "@type": "SearchAction",
            "target": f"{BASE_URL}/search?q={{search_term_string}}",
            "query-input": "required name=search_term_string",
        },
    }

def build_newsarticle_ld(article: Dict[str, Any]) -> Dict[str, Any]:
    title = article.get("title") or ""
    headline = title[:110].rstrip()

    # Generate a proper description using AI or smart fallback
    fallback_desc = (re.sub(r"<[^>]+>", " ", article.get("summary") or "") or "").strip()[:160]
    desc = generate_ai_description(title, article.get("full_text", ""), fallback_desc)

    tags = article.get("tags") or []
    category = article.get("category") or "Nieuws"
    urls = article.get("urls", {})
    canonical = urls.get("canonical") or BASE_URL
    link = article.get("link", "")

    # Image(s)
    image_url = article.get("image_url") or f"{BASE_URL}/social/picture-article-digestpaper.png"
    images = [image_url]

    # Timestamp
    published_dt = article.get("timestamp")
    if isinstance(published_dt, datetime):
        published_iso = iso_timestamp(published_dt)
    else:
        published_iso = iso_timestamp(get_dutch_now())

    # Calculate word count (server-side)
    full_text = article.get("full_text", "")
    word_count = len(full_text.split()) if full_text else 100  # Fallback estimate

    # WebPage node
    ld_webpage = {
        "@type": "WebPage",
        "@id": f"{canonical}/#webpage",
        "url": canonical,
        "name": headline,
        "isPartOf": {"@id": f"{BASE_URL}/#website"},
        "inLanguage": "nl-NL",
        "primaryImageOfPage": {
            "@type": "ImageObject",
            "url": image_url,
            "width": 1200,
            "height": 630
        },
        "breadcrumb": {"@id": f"{canonical}/#breadcrumbs"}
    }

    # Enhanced NewsArticle
    ld_article = {
        "@type": "NewsArticle",
        "@id": f"{canonical}/#news",
        "url": canonical,
        "mainEntityOfPage": {"@id": f"{canonical}/#webpage"},
        "headline": headline,
        "description": desc,
        "articleSection": category,
        "keywords": ", ".join(tags) if tags else None,
        "inLanguage": "nl-NL",
        "isAccessibleForFree": True,
        "datePublished": published_iso,
        "dateModified": published_iso,
        "image": [{
            "@type": "ImageObject",
            "url": image_url,
            "width": 1200,
            "height": 630
        }],
        "publisher": {
            "@type": "Organization",
            "@id": f"{BASE_URL}/#org",
            "name": "DigestPaper.com",
            "logo": {
                "@type": "ImageObject",
                "url": f"{BASE_URL}/favicon/favicon-192x192.png",
                "width": 192,
                "height": 192
            }
        },
        "author": {"@id": f"{BASE_URL}/#org"},
        "discussionUrl": urls.get("discussion"),
        "timeRequired": "PT2M",
        "wordCount": word_count,
        "thumbnailUrl": image_url,
        "interactionStatistic": [{
            "@type": "InteractionCounter",
            "interactionType": {"@type": "CommentAction"},
            "userInteractionCount": 0
        }],
        # Help TTS/Assistant surfaces (limited support)
        "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1.article-title", "div.article-content p"],
        },
    }

    if link:
        ld_article["isBasedOn"] = link

    # Breadcrumbs
    breadcrumbs = {
        "@type": "BreadcrumbList",
        "@id": f"{canonical}/#breadcrumbs",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE_URL}/"},
            {"@type": "ListItem", "position": 2, "name": "Nieuws", "item": f"{BASE_URL}/nieuws"},
            {"@type": "ListItem", "position": 3, "name": headline, "item": canonical},
        ],
    }

    return {
        "@context": "https://schema.org",
        "@graph": [build_org_ld(), build_website_ld(), ld_webpage, ld_article, breadcrumbs],
    }

def build_forum_ld_seed(urls: Dict[str, str], title: str, published_dt: datetime, comment_count: Optional[int] = None) -> Dict[str, Any]:
    headline = title[:110].rstrip()
    published_iso = iso_timestamp(published_dt)
    forum_ld = {
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        "url": urls.get("discussion"),
        "mainEntityOfPage": urls.get("discussion"),
        "isPartOf": {"@type": "CollectionPage", "@id": f"{BASE_URL}/#forum"},
        "headline": headline,
        "about": {"@id": f"{urls.get('canonical')}#news"},
        "author": {"@type": "Organization", "name": "DigestPaper.com", "url": BASE_URL},
        "datePublished": published_iso,
        "inLanguage": "nl-NL",
    }
    if comment_count is not None:
        forum_ld["commentCount"] = comment_count
        forum_ld["interactionStatistic"] = [{
            "@type": "InteractionCounter",
            "interactionType": {"@type": "CommentAction"},
            "userInteractionCount": comment_count
        }]
    return forum_ld

# ---------------------------
# Firebase
# ---------------------------

def ensure_firebase(project_id: str):  # -> firestore.Client
    path = next((p for p in SERVICE_ACCOUNT_CANDIDATES if p and os.path.exists(p)), None)
    if not path:
        raise RuntimeError(
            "Firebase service account key not found. Set FIREBASE_SERVICE_ACCOUNT_PATH "
            "or place serviceAccountKey.json in the project directory."
        )
    if not firebase_admin._apps:
        cred = credentials.Certificate(path)
        firebase_admin.initialize_app(cred, {"projectId": project_id})
    return firestore.client()

# ---------------------------
# AI helpers (Groq via OpenAI client)
# ---------------------------

def get_ai_client() -> Tuple[Any, Optional[str], Optional[str]]:
    global _ai_client, _ai_model, _client_type
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROC_API_KEY") or ""
    if OpenAI is None:
        print("❌ openai package not installed. Run: pip install openai")
        return None, None, None
    if not api_key:
        print("⚠️ GROQ_API_KEY not set. Running in 'no-AI' fallback mode (original text will be used).")
        return None, None, None
    try:
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        return client, MODEL_NAME, "openai"
    except Exception as e:
        print(f"❌ Failed to initialize Groq client: {e}")
        return None, None, None

def get_style_prompt(style: str, language: str) -> str:
    base_prompts = {
        "Technical": {
            "Dutch": "Herschrijf de tekst in het Nederlands in een technische, formele stijl. Gebruik professionele terminologie en gedetailleerde uitleg. Behoud alle belangrijke informatie maar presenteer het professioneel.",
            "English": "Rewrite the text in English in a technical, formal style. Use professional terminology and detailed explanations. Maintain all important information but present it professionally.",
            "German": "Schreiben Sie den Text auf Deutsch in einem technischen, formalen Stil. Verwenden Sie professionelle Terminologie und detaillierte Erklärungen. Behalten Sie alle wichtigen Informationen bei, aber präsentieren Sie sie professionell.",
        },
        "Normal": {
            "Dutch": "Herschrijf de tekst in het Nederlands in een standaard nieuwsstijl. Gebruik duidelijke taal en behoud alle belangrijke informatie.",
            "English": "Rewrite the text in English in a standard news style. Use clear language and maintain all important information.",
            "German": "Schreiben Sie den Text auf Deutsch in einem Standard-Nachrichtenstil. Verwenden Sie klare Sprache und behalten Sie alle wichtigen Informationen bei.",
        },
        "Easy": {
            "Dutch": "Herschrijf de tekst in het Nederlands in een eenvoudige, begrijpelijke stijl. Gebruik korte zinnen en eenvoudige woorden.",
            "English": "Rewrite the text in English in a simple, understandable style. Use short sentences and simple words.",
            "German": "Schreiben Sie den Text auf Deutsch in einem einfachen, verständlichen Stil. Verwenden Sie kurze Sätze und einfache Wörter.",
        },
        "Populair": {
            "Dutch": "Herschrijf de tekst in het Nederlands in een populaire, aantrekkelijke stijl. Gebruik levendige taal en maak het boeiend.",
            "English": "Rewrite the text in English in a popular, attractive style. Use vivid language and make it engaging.",
            "German": "Schreiben Sie den Text auf Deutsch in einem populären, attraktiven Stil. Verwenden Sie lebendige Sprache.",
        },
        "News Reader": {
            "Dutch": "Herschrijf de tekst in het Nederlands in de stijl van een professionele nieuwslezer. Gebruik formele maar toegankelijke taal.",
            "English": "Rewrite the text in English in the style of a professional news reader. Use formal but accessible language.",
            "German": "Schreiben Sie den Text auf Deutsch im Stil eines Nachrichtensprechers.",
        },
    }
    return base_prompts.get(style, {}).get(language, base_prompts["Normal"]["Dutch"])

def generate_text(prompt: str, style: str, language: str, max_tokens: int = 700) -> str:
    if _ai_client is None or _ai_model is None:
        return ""
    try:
        system_prompt = get_style_prompt(style, language)
        resp = _ai_client.chat.completions.create(  # type: ignore
            model=_ai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
            temperature=1.0,
        )
        content = resp.choices[0].message.content if resp and resp.choices else ""
        return (content or "").strip()
    except Exception as e:
        print(f"Error generating text: {e}")
        return ""

def get_category(full_text: str, language: str) -> str:
    if _ai_client is None or _ai_model is None:
        return "Nieuws"
    try:
        system_content = (
            "Classificeer de categorie van de volgende Nederlandse tekst met één woord. "
            "Kies uit: Politiek, Sport, Economie, Gezondheid, Technologie, Cultuur, "
            "Onderwijs, Milieu, Internationaal, of Nieuws."
        )
        resp = _ai_client.chat.completions.create(  # type: ignore
            model=_ai_model,
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": full_text[:1000]},
            ],
            max_tokens=10,
        )
        content = resp.choices[0].message.content if resp and resp.choices else ""
        category = (content or "Nieuws").strip().split()[0]
        return category or "Nieuws"
    except Exception as e:
        print(f"Error getting category: {e}")
        return "Nieuws"

def get_tags(full_text: str, language: str) -> List[str]:
    if _ai_client is None or _ai_model is None:
        return ["Nederland", "Nieuws", "Actueel"]
    try:
        system_content = (
            "Genereer precies drie Nederlandse tags gescheiden door komma's. "
            "Voorbeeld: 'Politiek, Nederland, Verkiezingen'."
        )
        resp = _ai_client.chat.completions.create(  # type: ignore
            model=_ai_model,
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": full_text[:400]},
            ],
            max_tokens=30,
        )
        content = resp.choices[0].message.content if resp and resp.choices else ""
        if content and "," in content:
            tags = [t.strip() for t in content.split(",")]
            tags = [t for t in tags if t][:3]
            return tags if len(tags) == 3 else ["Nederland", "Nieuws", "Actueel"]
        return ["Nederland", "Nieuws", "Actueel"]
    except Exception as e:
        print(f"Error getting tags: {e}")
        return ["Nederland", "Nieuws", "Actueel"]

# ---------------------------
# Formatting helpers
# ---------------------------

def format_full_text_with_html(text: str) -> str:
    if not text:
        return "<p>Geen inhoud beschikbaar.</p>"
    # Trust existing HTML if present
    if "<p" in text or "<h3" in text:
        return text
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    html_parts = []
    for i, line in enumerate(lines):
        if len(line) < 80 and i > 0:
            html_parts.append(f"<h3>{html_escape(line)}</h3>")
        else:
            html_parts.append(f"<p>{html_escape(line)}</p>")
    return "\n".join(html_parts)

def generate_summary(full_text: str, char_limit: int = 160) -> str:
    plain = re.sub(r"<[^>]+>", " ", full_text or "").strip()
    if len(plain) <= char_limit:
        return plain
    cut = plain[:char_limit]
    if cut.endswith(" ") and plain[char_limit:]:
        return cut.rstrip() + "..."
    return cut.rsplit(" ", 1)[0] + "..."

def generate_ai_description(title: str, full_text: str, fallback_summary: str) -> str:
    """Generate a proper single-line description using AI, with fallback to improved summary."""
    if _ai_client is None or _ai_model is None:
        # No AI available, create a better summary manually
        return create_smart_summary(title, full_text, fallback_summary)

    try:
        # Clean the text for AI processing
        clean_text = re.sub(r"<[^>]+>", " ", full_text or "").strip()
        if not clean_text:
            return fallback_summary

        # Use the first 800 characters for context
        context = clean_text[:800]

        prompt = f"""Schrijf een korte, informatieve samenvatting van maximaal 150 tekens voor dit nieuwsartikel.
Maak het één complete zin zonder afkortingen of "...". Focus op de hoofdpunten.

Titel: {title}
Tekst: {context}

Antwoord alleen met de samenvatting, geen extra tekst."""

        resp = _ai_client.chat.completions.create(
            model=_ai_model,
            messages=[
                {"role": "system", "content": "Je bent een professionele Nederlandse journalist die korte, heldere samenvattingen schrijft."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=50,
            temperature=0.3,
        )

        ai_desc = resp.choices[0].message.content if resp and resp.choices else ""
        ai_desc = (ai_desc or "").strip()

        # Validate the AI description
        if ai_desc and len(ai_desc) <= 160 and not ai_desc.endswith(".."):
            return ai_desc

        # If AI description is too long or ends with .., fall back
        return create_smart_summary(title, full_text, fallback_summary)

    except Exception as e:
        print(f"Error generating AI description: {e}")
        return create_smart_summary(title, full_text, fallback_summary)

def create_smart_summary(title: str, full_text: str, fallback_summary: str) -> str:
    """Create a smarter summary without AI by finding complete sentences."""
    plain = re.sub(r"<[^>]+>", " ", full_text or "").strip()

    # Remove newlines and normalize whitespace
    plain = re.sub(r'\s+', ' ', plain)

    if len(plain) <= 160:
        return plain

    # Try to find the first complete sentence that fits
    sentences = re.split(r'[.!?]+', plain)
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) > 20 and len(sentence) <= 150:  # Reasonable length
            return sentence + "."

    # If no good sentence found, try to cut at a logical point
    cut_at = 145  # Leave room for period
    text_cut = plain[:cut_at]

    # Try to cut at end of word
    last_space = text_cut.rfind(' ')
    if last_space > 100:  # Make sure we don't cut too short
        return text_cut[:last_space] + "."

    # Last resort: use original logic but without ...
    return plain[:145].rsplit(" ", 1)[0] + "."

def get_first_sentence_description(full_text: str, max_length: int = 160) -> str:
    """Extract the first complete sentence for meta descriptions, ensuring it's not cut off."""
    plain = re.sub(r"<[^>]+>", " ", full_text or "").strip()

    # Remove newlines and normalize whitespace
    plain = re.sub(r'\s+', ' ', plain)

    if not plain:
        return "Laatste politienieuws uit Nederland."

    # Split into sentences
    sentences = re.split(r'[.!?]+', plain)

    for sentence in sentences:
        sentence = sentence.strip()
        if sentence and len(sentence) >= 20:  # Must be substantial
            if len(sentence) <= max_length:
                return sentence + "."
            else:
                # If first sentence is too long, try to cut at a logical point but keep it complete
                if len(sentence) <= max_length + 50:  # Allow a bit more for natural breaks
                    words = sentence.split()
                    current_length = 0
                    result_words = []

                    for word in words:
                        if current_length + len(word) + 1 > max_length - 1:  # Leave room for period
                            break
                        result_words.append(word)
                        current_length += len(word) + 1

                    if result_words:
                        return " ".join(result_words) + "."

    # Fallback: use first reasonable chunk with complete words
    if len(plain) <= max_length:
        return plain + ("." if not plain.endswith(('.', '!', '?')) else "")

    # Cut at word boundary
    cut_text = plain[:max_length - 1]
    last_space = cut_text.rfind(' ')
    if last_space > max_length // 2:  # Ensure we don't cut too short
        return cut_text[:last_space] + "."

    return "Laatste politienieuws uit Nederland."

# ---------------------------
# Firestore helpers
# ---------------------------

def check_duplicate_article(db, collection_name: str, link: str, title: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    try:
        collection_ref = db.collection(collection_name)
        if link:
            link_docs = collection_ref.where("link", "==", link).limit(1).get()
            if len(link_docs) > 0:
                return True, "link"
        if title:
            title_docs = collection_ref.where("title", "==", title).limit(1).get()
            if len(title_docs) > 0:
                return True, "title"
        return False, None
    except Exception as e:
        print(f"Error checking duplicates: {e}")
        return False, None

# ---------------------------
# Rewriter core
# ---------------------------

def rewrite_article(article: Dict[str, Any], style: str, language: str) -> Dict[str, Any]:
    original_title = (article.get("title") or "").strip()
    original_body = article.get("body") or article.get("full_text") or ""

    print(f"🔄 Rewriting: {original_title[:80]}")

    # 1) Body rewrite in chunks
    chunk_size = 1200
    rewritten_body = ""
    for i in range(0, len(original_body), chunk_size):
        chunk = original_body[i : i + chunk_size]
        prompt = (
            f"Herschrijf dit nieuwsartikel in het Nederlands in {style.lower()} stijl. "
            f"Gebruik HTML met <h3> sectiekoppen en <p> paragrafen. Voeg <br><br> in tussen blokken. "
            f"Schrijf helder, feitelijk en vlot."
        )
        out = generate_text(f"{prompt}\n\n{chunk}", style=style, language=language, max_tokens=1000)
        rewritten_body += (out or "") + " "
    rewritten_body = rewritten_body.strip() or original_body

    # 2) HTML tidy
    formatted_body = normalize_paragraphs(format_full_text_with_html(rewritten_body))

    # 3) Title
    tprompt = (
        "Genereer een krachtige Nederlandstalige nieuws-titel (max 110 tekens) voor onderstaande tekst:\n\n"
        f"{rewritten_body[:600]}"
    )
    rewritten_title = generate_text(tprompt, style=style, language=language, max_tokens=80).strip() or original_title
    rewritten_title = rewritten_title[:160]

    # 4) Summary
    summary = generate_summary(formatted_body, char_limit=160)

    # 5) Category & tags
    category = get_category(formatted_body, language=language) or "Nieuws"
    tags = get_tags(formatted_body, language=language) or ["Nederland", "Nieuws", "Actueel"]

    # 6) Slug + URLs
    title_slug = slugify(rewritten_title)
    now = get_dutch_now()
    ts_iso = iso_timestamp(now)
    urls = build_urls(title_slug)

    # 7) Share links & JSON-LD
    share = build_share_urls(rewritten_title, urls["canonical"])

    payload = {
        "title": rewritten_title,
        "original_title": original_title,
        "link": article.get("link", ""),
        "summary": summary,
        "full_text": formatted_body,
        "timestamp": now,
        "timestamp_iso": ts_iso,
        "slug": title_slug,
        "category": category,
        "tags": tags,
        "language": language,
        "style": style,
        "processed": True,
        "image_url": article.get("image_url") or None,
        "published": ts_iso,
        "urls": urls,
        "share": share,
    }
    payload["jsonld"] = build_newsarticle_ld(payload)
    return payload

# ---------------------------
# HTML templates
# ---------------------------

def article_html_template(article: Dict[str, Any]) -> str:
    title = article.get("title") or "DigestPaper.com"
    esc_title = html_escape(title)

    # Use first complete sentence for meta descriptions
    full_text = article.get("full_text", "")
    summary = article.get("summary", "")
    desc_text = full_text if full_text else summary
    desc = html_escape(get_first_sentence_description(desc_text))

    urls = article.get("urls", {})
    canonical = urls.get("canonical", BASE_URL)
    amp_url = urls.get("amp", "")
    api_url = urls.get("api", "")
    forum_alias = urls.get("forum", "#")

    og_image = article.get("image_url") or f"{BASE_URL}/social/picture-article-digestpaper.png"
    twitter_image = f"{BASE_URL}/social/twitter-1024x512.png"

    jsonld = json.dumps(article.get("jsonld", {}), ensure_ascii=False, indent=2)

    body_html = article.get("full_text") or ""
    category = article.get("category", "Nieuws")
    tags = article.get("tags", [])
    keywords = ", ".join(tags) if tags else "politie, nederland, nieuws"

    published_dt = article.get("timestamp")
    # Dutch month names
    dutch_months = {
        1: "januari", 2: "februari", 3: "maart", 4: "april", 5: "mei", 6: "juni",
        7: "juli", 8: "augustus", 9: "september", 10: "oktober", 11: "november", 12: "december"
    }

    if isinstance(published_dt, datetime):
        # Ensure Dutch timezone
        dt_dutch = ensure_tz_aware(published_dt)
        published_readable = f"{dt_dutch.day} {dutch_months[dt_dutch.month]} {dt_dutch.year} om {dt_dutch.strftime('%H:%M')}"
        published_iso = iso_timestamp(dt_dutch)
        datetime_attr = published_iso  # Use ISO format with timezone for datetime attribute
    else:
        dt_now = get_dutch_now()
        published_readable = "Recent"
        published_iso = iso_timestamp(dt_now)
        datetime_attr = published_iso

    word_count = len(re.sub(r"<[^>]+>", " ", body_html).split())
    reading_time = max(1, word_count // 200)

    tags_html = (
        "".join([f'<span class="article-tag">{html_escape(tag)}</span>' for tag in tags])
        if tags else '<span class="article-tag">Nederland</span><span class="article-tag">Nieuws</span><span class="article-tag">Actueel</span>'
    )

    # Advanced robots directives (SEO)
    robots = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"

    client_comment_counter_module = """

<script type="module">

// Firebase imports
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getFirestore, collection, query, where, getCountFromServer } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

// Firebase config
const firebaseConfig = {

  apiKey: "AIzaSyDCRYKrWUvtOtDAY4TThjlm7AxkzHG-62s",
  authDomain: "blockchainkix-com-fy.firebaseapp.com",
  databaseURL: "https://blockchainkix-com-fy-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "blockchainkix-com-fy",
  storageBucket: "blockchainkix-com-fy.firebasestorage.app",
  messagingSenderId: "148890561425",
  appId: "1:148890561425:web:7cba0e7477141e3a880830"
};

// Note: Replace with actual config
// Initialize Firebase only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Get slug

function getCanonicalHref() {
    return document.querySelector('link[rel="canonical"]')?.href || location.href;
}

function getArticleSlug() {{
    const href = getCanonicalHref();
    const m = href.match(/\\/article\\/([^\\/#?]+)/i);
    return m ? decodeURIComponent(m[1]) : '';
}}

const CANONICAL = getCanonicalHref();
const SLUG = getArticleSlug();

// Fetch comment count
async function fetchCommentCount(slug) {

    try {

        const baseQ = query(

            collection(db, "comments"),

            where("articleSlug", "==", slug),

            where("status", "==", "public"),

            where("deleted", "==", false)

        );

        const snap = await getCountFromServer(baseQ);

        return snap.data().count || 0;

    } catch (e) {

        console.warn('commentCount error:', e);

        return 0;

    }

}

// Update JSON-LD

function updateJsonLd(count) {

    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];

    for (const s of scripts) {

        let data;

        try { data = JSON.parse(s.textContent || '{}'); } catch { continue; }

        if (data?.['@type'] === 'DiscussionForumPosting') {

            data.commentCount = count;

            data.interactionStatistic = [{

                "@type": "InteractionCounter",

                "interactionType": { "@type": "CommentAction" },

                "userInteractionCount": count

            }];

            s.textContent = JSON.stringify(data, null, 2);

        }

    }

}

// Update UI

function updateUi(count) {

    const discussDiv = document.getElementById('discuss');

    if (discussDiv) {

        const p = discussDiv.querySelector('p');

        if (p) {

            p.textContent = count === 0 ? 'Nog geen reacties geplaatst.' : `${count} reactie${count === 1 ? '' : 's'} op dit artikel.`;

        }

    }

}

// Run

(async () => {

    if (!SLUG) return;

    const count = await fetchCommentCount(SLUG);

    updateJsonLd(count);

    updateUi(count);

})();

</script>

"""

    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

  <title>{esc_title} | DigestPaper.com</title>
  <meta property="og:locale" content="nl_NL">

  <!-- Performance preconnects -->
  <link rel="preconnect" href="https://cdn.ampproject.org">
  <link rel="dns-prefetch" href="https://cdn.ampproject.org">
  <link rel="preconnect" href="https://region1.google-analytics.com">
  <link rel="dns-prefetch" href="https://region1.google-analytics.com">

  <!-- Canonical + alternates -->
  <link rel="canonical" href="{canonical}">
  <link rel="amphtml" href="{amp_url}">
  <link rel="alternate" href="{canonical}" hreflang="nl-NL">
  <link rel="alternate" href="{canonical}" hreflang="x-default">

  <!-- PWA / Icons -->
  <link rel="manifest" href="/site.webmanifest">
  <link rel="icon" href="/favicon/favicon.ico">
  <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon/favicon-48x48.png">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon/favicon-96x96.png">
  <link rel="icon" type="image/png" sizes="128x128" href="/favicon/favicon-128x128.png">
  <link rel="icon" type="image/png" sizes="180x180" href="/favicon/favicon-180x180.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon/favicon-192x192.png">
  <link rel="icon" type="image/png" sizes="256x256" href="/favicon/favicon-256x256.png">
  <link rel="icon" type="image/png" sizes="384x384" href="/favicon/favicon-384x384.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/favicon/favicon-512x512.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
  <link rel="mask-icon" href="/favicon/safari-pinned-tab.svg" color="#0f172a">
  <meta name="theme-color" content="#0f172a">
  <meta name="msapplication-TileColor" content="#0f172a">
  <meta name="msapplication-TileImage" content="/favicon/favicon-144x144.png">
  <meta name="msapplication-config" content="/browserconfig.xml">

  <!-- SEO Meta -->
  <meta name="description" content="{desc}">
  <meta name="keywords" content="{html_escape(keywords)}">
  <meta name="news_keywords" content="{html_escape(keywords)}">
  <meta name="author" content="DigestPaper.com">
  <meta name="robots" content="{robots}">
  <meta name="googlebot" content="{robots}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="DigestPaper.com">
  <meta property="og:title" content="{esc_title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{og_image}">
  <meta property="og:image:secure_url" content="{og_image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="DigestPaper.com - {esc_title}">
  <meta property="og:see_also" content="{forum_alias}">
  <meta property="og:updated_time" content="{published_iso}">
  <meta property="article:published_time" content="{published_iso}">
  <meta property="article:modified_time" content="{published_iso}">
  <meta property="article:section" content="{html_escape(category)}">
  <meta property="article:author" content="DigestPaper.com">
  {"".join([f'<meta property="article:tag" content="{html_escape(t)}">' for t in tags])}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@digestpaper_nl">
  <meta name="twitter:creator" content="@digestpaper_nl">
  <meta name="twitter:title" content="{esc_title}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{og_image}">
  <meta name="twitter:image:alt" content="DigestPaper.com - {esc_title}">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"></noscript>

  <!-- Referrer policy -->
  <meta name="referrer" content="strict-origin-when-cross-origin">

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">


  <!-- JSON-LD (Org, Site, News, Forum, Breadcrumbs) -->
  <script type="application/ld+json">{jsonld}</script>

  <!-- Consent (default) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{ dataLayer.push(arguments); }}
    gtag('consent','default',{{
      ad_user_data:'granted',
      ad_personalization:'granted',
      ad_storage:'granted',
      analytics_storage:'granted',
      functionality_storage:'granted',
      personalization_storage:'granted',
      security_storage:'granted'
    }});
  </script>
  <!-- GA -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-BKYZZK6D07"></script>
  <script src="/js/consent.js" defer></script>
  <script>
    gtag('js', new Date());
    gtag('config', 'G-BKYZZK6D07', {{
      send_page_view: true,
      anonymize_ip: false,
      allow_google_signals: true,
      allow_ad_personalization_signals: true
    }});
  </script>

  <!-- Styles -->
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <!-- Skip link for a11y -->
  <a class="skip-link" href="#main">Direct naar inhoud</a>

  <!-- Global Header / Nav -->
  <header class="site-header" role="banner">
    <div class="logo-container">
      <img src="https://digestpaper.com/favicon/favicon-192x192.png" alt="DigestPaper.com logo" width="48" height="48" loading="eager">
      <a href="/" title="DigestPaper.com - Home - Laatste nieuws en nieuwsanalysis Nederland">DigestPaper.com</a>
    </div>
    <nav class="nav-links" id="navLinks" role="navigation" aria-label="Hoofdnavigatie">
      <a href="/" class="active" aria-current="page" title="Naar de homepagina"><i class="fas fa-home" aria-hidden="true"></i> Home</a>
      <a href="/search" title="Zoek in politieberichten"><i class="fas fa-search" aria-hidden="true"></i> Zoeken</a>
      <a href="/categories" title="Bekijk alle categorieën"><i class="fas fa-list" aria-hidden="true"></i> Categorieën</a>
      <a href="/forum" title="Bekijk het forum"><i class="fas fa-comments"></i> Forum</a>
      <a href="/opsporingen" title="Actuele opsporingen"><i class="fas fa-exclamation-triangle" aria-hidden="true"></i> Opsporingen</a>
      <a href="/contact" title="Neem contact met ons op"><i class="fas fa-envelope" aria-hidden="true"></i> Contact</a>
      <a href="/admin" title="Admin Panel"><i class="fas fa-cog" aria-hidden="true"></i> Admin</a>
      <button id="darkModeToggle" class="dark-mode-toggle" aria-label="Donkere modus schakelen">
        <i class="fas fa-moon" aria-hidden="true" id="darkModeIcon"></i>
        <span id="darkModeText">Licht</span>
      </button>
    </nav>
    <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Menu openen" aria-expanded="false" aria-controls="navLinks">
      <i class="fas fa-bars" aria-hidden="true"></i>
    </button>
  </header>

  <main id="main" class="article-container" role="main">
    <div class="article-header">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a> / <a href="/nieuws">Nieuws</a> / <span aria-current="page">{esc_title}</span>
      </nav>

      <h1 class="article-title">{esc_title}</h1>

      <div class="article-meta article-meta-centered">
        <div class="article-date">
          <time datetime="{datetime_attr}">{published_readable}</time>
        </div>
        <div class="reading-time"><span>{reading_time} min leestijd</span></div>
        <div class="article-categories"><span class="article-category">{html_escape(category)}</span></div>
      </div>
    </div>

    <div class="article-hero sr-only" aria-hidden="true">
      <img src="{og_image}" alt="newsArticle {esc_title}" width="1200" height="630" loading="lazy" decoding="async">
    </div>

    <article class="article-content" itemprop="articleBody">
      {body_html}
    </article>

    <div class="article-tags">
      {tags_html}
    </div>

    <!-- Forum Discussion Widget -->
    <section id="forum-discussion" aria-labelledby="forum-discussion-title" class="forum-discussion-section">
      <!-- Forum discussion widget will be loaded here by JavaScript -->
    </section>

    <div class="article-footer">
      <a href="/" class="back-link">← Terug naar overzicht</a>
    </div>
  </main>

  <!-- Global Footer -->
  <footer class="site-footer" role="contentinfo">
    <div class="footer-container">
      <div class="footer-section">
        <h2>Over DigestPaper.com</h2>
        <p>DigestPaper.com biedt het laatste politienieuws uit Nederland. Wij bundelen berichten van politiekorpsen door het hele land om u te informeren over veiligheid, misdaad en opsporingsactiviteiten in uw buurt.</p>
        <div class="footer-social">
          <a href="#" title="Volg ons op Facebook" aria-label="Facebook" rel="nofollow noopener noreferrer"><i class="fab fa-facebook-f" aria-hidden="true"></i></a>
          <a href="#" title="Volg ons op Twitter" aria-label="Twitter" rel="nofollow noopener noreferrer"><i class="fab fa-twitter" aria-hidden="true"></i></a>
          <a href="#" title="Volg ons op Instagram" aria-label="Instagram" rel="nofollow noopener noreferrer"><i class="fab fa-instagram" aria-hidden="true"></i></a>
          <a href="#" title="Volg ons op LinkedIn" aria-label="LinkedIn" rel="nofollow noopener noreferrer"><i class="fab fa-linkedin-in" aria-hidden="true"></i></a>
        </div>
      </div>
      <div class="footer-section">
        <h2>Navigatie</h2>
        <ul class="footer-links">
          <li><a href="/" title="Naar de homepagina">Home</a></li>
          <li><a href="/categories" title="Bekijk alle categorieën">Categorieën</a></li>
          <li><a href="/forum" title="Bekijk het forum">Forum</a></li>
          <li><a href="/opsporingen" title="Actuele opsporingen">Opsporingen</a></li>
          <li><a href="/vermissingen" title="Vermiste personen">Vermissingen</a></li>
          <li><a href="/tips" title="Tips over veiligheid">Veiligheidstips</a></li>
          <li><a href="/contact" title="Neem contact met ons op">Contact</a></li>
          <li><a href="/admin" title="Admin Panel">Admin</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h2>Juridisch</h2>
        <ul class="footer-links">
          <li><a href="/privacy-policy" title="Lees ons privacybeleid">Privacybeleid</a></li>
          <li><a href="/cookie-policy" title="Lees ons cookiebeleid">Cookiebeleid</a></li>
          <li><a href="/terms-of-service" title="Lees onze gebruiksvoorwaarden">Gebruiksvoorwaarden</a></li>
          <li><a href="/forum-rules" title="Lees onze forumregels">Forumregels</a></li>
          <li><a href="/disclaimer" title="Lees onze disclaimer">Disclaimer</a></li>
          <li><a href="/accessibility" title="Toegankelijkheidsverklaring">Toegankelijkheid</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 DigestPaper.com - Alle rechten voorbehouden |
      <a href="https://digestpaper.com" rel="noopener" title="Officiële website">Geen officiële website van de Nederlandse Politie</a> |
      <a href="https://www.politie.nl" rel="noopener noreferrer nofollow" title="Officiële Politie Website">Bezoek de officiële website</a>
      </p>
    </div>
  </footer>

  <!-- App JS -->
  <script type="module" src="/js/app.js"></script>
  <script src="/js/forum-discussion-widget.js"></script>

  <!-- Firestore comment counter + JSON-LD updater -->
  <script type="module">
    import {{ initializeApp, getApps }} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
    import {{ getFirestore, collection, query, where, getCountFromServer }} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

    // TODO: vervang door je echte config
    const firebaseConfig = {{
        apiKey: "AIzaSyDCRYKrWUvtOtDAY4TThjlm7AxkzHG-62s",
        authDomain: "blockchainkix-com-fy.firebaseapp.com",
        databaseURL: "https://blockchainkix-com-fy-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "blockchainkix-com-fy",
        storageBucket: "blockchainkix-com-fy.firebasestorage.app",
        messagingSenderId: "148890561425",
        appId: "1:148890561425:web:7cba0e7477141e3a880830"
    }};

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db  = getFirestore(app);

    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const match = canonical.match(/\\/article\\/([^\\/#?]+)/i);
    const SLUG = match ? decodeURIComponent(match[1]) : '';

    async function fetchCommentCount(slug){{
      try{{
        const baseQ = query(
          collection(db, "comments"),
          where("articleSlug","==", slug),
          where("status","==","public"),
          where("deleted","==", false)
        );
        const snap = await getCountFromServer(baseQ);
        return snap.data().count || 0;
      }}catch(e){{
        console.warn('commentCount error:', e);
        return 0;
      }}
    }}

    function updateJsonLd(count){{
      const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
      for(const s of scripts){{
        let data;
        try {{ data = JSON.parse(s.textContent || '{{}}'); }} catch {{ continue; }}
        // Handle @graph or single node
        if(data['@graph'] && Array.isArray(data['@graph'])){{
          for(const node of data['@graph']){{
            if(node['@type'] === 'DiscussionForumPosting'){{
              node.commentCount = count;
              node.interactionStatistic = [{{
                "@type":"InteractionCounter",
                "interactionType":{{"@type":"CommentAction"}},
                "userInteractionCount": count
              }}];
            }}
          }}
          s.textContent = JSON.stringify(data, null, 2);
        }} else if (data['@type'] === 'DiscussionForumPosting'){{
          data.commentCount = count;
          data.interactionStatistic = [{{
            "@type":"InteractionCounter",
            "interactionType":{{"@type":"CommentAction"}},
            "userInteractionCount": count
          }}];
          s.textContent = JSON.stringify(data, null, 2);
        }}
      }}
    }}

    function updateUi(count){{
      const discuss = document.getElementById('discuss');
      const p = discuss?.querySelector('.discussion-count');
      if(p){{
        p.textContent = count === 0
          ? 'Nog geen reacties geplaatst.'
          : `${{count}} reactie${{count === 1 ? '' : 's'}} op dit artikel.`;
      }}
    }}

    // UGC link sanitization function (consistent with forum pages)
    function sanitizeUGCLinks(container) {{
      const links = container.querySelectorAll('a[href^="http"]');
      links.forEach(link => {{
        const url = link.getAttribute('href');
        if (!url.startsWith('{BASE_URL}')) {{
          // External link - add UGC attributes
          link.setAttribute('rel', 'ugc nofollow noopener noreferrer');
          link.setAttribute('target', '_blank');
        }}
      }});
    }}

    (async () => {{
      if(!SLUG) return;
      const count = await fetchCommentCount(SLUG);
      updateJsonLd(count);
      updateUi(count);

      // Sanitize any existing UGC content in the discussion section
      const discussSection = document.getElementById('discuss');
      if (discussSection) {{
        sanitizeUGCLinks(discussSection);
      }}
    }})();
  </script>
</body>
</html>"""

def article_amp_html_template(article: Dict[str, Any]) -> str:
    """Generate a valid AMP HTML page for the article"""
    title = article.get("title") or "DigestPaper.com"
    esc_title = html_escape(title)

    # Meta descriptions - complete descriptions for SEO consistency
    full_text = article.get("full_text", "")
    summary = article.get("summary", "")
    desc_text = full_text if full_text else summary
    desc = html_escape(get_first_sentence_description(desc_text))

    # URLs and metadata
    urls = article.get("urls", {})
    canonical = urls.get("canonical", BASE_URL)
    forum_url = urls.get("forum", f"{BASE_URL}/forum/{article.get('slug', 'artikel')}")
    amp_url = f"{canonical}/amp"

    # Images
    og_image = article.get("image_url") or f"{BASE_URL}/social/picture-article-digestpaper.png"

    # Categories and tags
    category = article.get("category", "Nieuws")
    tags = article.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    # Timestamps
    published_dt = article.get("timestamp")
    if isinstance(published_dt, datetime):
        published_iso = iso_timestamp(published_dt)
    else:
        published_iso = iso_timestamp(get_dutch_now())

    # Word count for structured data
    word_count = len(full_text.split()) if full_text else 100

    # Clean body content for AMP (remove any non-AMP elements)
    body_html = (full_text or "").replace("<br><br>", "<br>")
    # Remove any script tags or other non-AMP elements
    import re
    body_html = re.sub(r'<script[^>]*>.*?</script>', '', body_html, flags=re.DOTALL)
    body_html = re.sub(r'onclick="[^"]*"', '', body_html)
    body_html = re.sub(r'<img([^>]*?)>', lambda m: f'<amp-img{m.group(1)} layout="responsive"></amp-img>', body_html)

    # Original article link (if exists)
    source_link = article.get("link", "")

    # JSON-LD for AMP (must match canonical page exactly)
    jsonld_data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": f"{BASE_URL}#org",
                "name": "DigestPaper.com",
                "url": BASE_URL,
                "logo": {
                    "@type": "ImageObject",
                    "url": f"{BASE_URL}/favicon/favicon-192x192.png",
                    "width": 192,
                    "height": 192
                },
                "sameAs": [
                    "https://x.com/digestpaper"
                ]
            },
            {
                "@type": "WebSite",
                "@id": f"{BASE_URL}#website",
                "url": BASE_URL,
                "name": "DigestPaper.com",
                "publisher": {"@id": f"{BASE_URL}#org"},
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": f"{BASE_URL}/search?q={{search_term_string}}",
                    "query-input": "required name=search_term_string"
                }
            },
            {
                "@type": "WebPage",
                "@id": f"{canonical}#webpage",
                "url": amp_url,
                "name": f"{esc_title} (AMP)",
                "isPartOf": {"@id": f"{BASE_URL}#website"},
                "inLanguage": "nl-NL",
                "primaryImageOfPage": {
                    "@type": "ImageObject",
                    "url": og_image,
                    "width": 1200,
                    "height": 630
                }
            },
            {
                "@type": "NewsArticle",
                "@id": f"{canonical}#news",
                "url": canonical,
                "mainEntityOfPage": {"@id": f"{canonical}#webpage"},
                "headline": esc_title,
                "description": desc,
                "articleSection": category,
                "keywords": ", ".join(tags) if tags else "Nederland, Nieuws, Actueel",
                "inLanguage": "nl-NL",
                "isAccessibleForFree": True,
                "datePublished": published_iso,
                "dateModified": published_iso,
                "image": [{
                    "@type": "ImageObject",
                    "url": og_image,
                    "width": 1200,
                    "height": 630
                }],
                "publisher": {
                    "@type": "Organization",
                    "@id": f"{BASE_URL}#org",
                    "name": "DigestPaper.com",
                    "logo": {
                        "@type": "ImageObject",
                        "url": f"{BASE_URL}/favicon/favicon-192x192.png",
                        "width": 192,
                        "height": 192
                    }
                },
                "author": {"@id": f"{BASE_URL}#org"},
                "wordCount": word_count,
                "timeRequired": "PT2M",
                "thumbnailUrl": og_image,
                "interactionStatistic": [{
                    "@type": "InteractionCounter",
                    "interactionType": {"@type": "CommentAction"},
                    "userInteractionCount": 0
                }]
            }
        ]
    }

    if source_link:
        jsonld_data["@graph"][2]["isBasedOn"] = source_link

    jsonld = json.dumps(jsonld_data, ensure_ascii=False)

    return f"""<!doctype html>
<html ⚡ lang="nl">
<head>
  <meta charset="utf-8">
  <title>{esc_title} | DigestPaper.com</title>
  <link rel="canonical" href="{canonical}">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <meta name="description" content="{desc}">
  <meta name="robots" content="index, follow">

  <!-- Performance preconnects -->
  <link rel="preconnect" href="https://cdn.ampproject.org">
  <link rel="dns-prefetch" href="https://cdn.ampproject.org">
  <link rel="preconnect" href="https://region1.google-analytics.com">
  <link rel="dns-prefetch" href="https://region1.google-analytics.com">

  <!-- AMP runtime -->
  <script async src="https://cdn.ampproject.org/v0.js"></script>

  <!-- AMP components -->
  <script async custom-element="amp-sidebar" src="https://cdn.ampproject.org/v0/amp-sidebar-0.1.js"></script>
  <script async custom-element="amp-analytics" src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"></script>

  <!-- AMP boilerplate -->
  <style amp-boilerplate>
    body{{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;
         -moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;
         -ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;
         animation:-amp-start 8s steps(1,end) 0s 1 normal both}}
    @-webkit-keyframes -amp-start{{from{{visibility:hidden}}to{{visibility:visible}}}}
    @-moz-keyframes -amp-start{{from{{visibility:hidden}}to{{visibility:visible}}}}
    @-ms-keyframes -amp-start{{from{{visibility:hidden}}to{{visibility:visible}}}}
    @-o-keyframes -amp-start{{from{{visibility:hidden}}to{{visibility:visible}}}}
    @keyframes -amp-start{{from{{visibility:hidden}}to{{visibility:visible}}}}
  </style>
  <noscript><style amp-boilerplate>
    body{{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}}
  </style></noscript>

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="DigestPaper.com">
  <meta property="og:title" content="{esc_title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{og_image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="DigestPaper.com - {esc_title}">
  <meta property="og:locale" content="nl_NL">
  <meta property="article:published_time" content="{published_iso}">
  <meta property="article:modified_time" content="{published_iso}">
  <meta property="article:section" content="{html_escape(category)}">
  <meta property="article:author" content="DigestPaper.com">
  {"".join([f'<meta property="article:tag" content="{html_escape(t)}">' for t in tags])}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@digestpaper_nl">
  <meta name="twitter:creator" content="@digestpaper_nl">
  <meta name="twitter:title" content="{esc_title}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{og_image}">
  <meta name="twitter:image:alt" content="DigestPaper.com - {esc_title}">

  <!-- JSON-LD -->
  <script type="application/ld+json">{jsonld}</script>

  <!-- PWA / Icons (minimal for AMP) -->
  <link rel="icon" href="/favicon/favicon.ico">
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon/favicon-192x192.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
  <meta name="theme-color" content="#0f172a">

  <!-- AMP custom styles -->
  <style amp-custom>
    /* Reset and base styles */
    * {{ box-sizing: border-box; }}
    body {{
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }}

    /* Header styles */
    .amp-header {{
      background: #0f172a;
      color: white;
      padding: 1rem;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }}

    .amp-header-content {{
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .amp-logo {{
      font-size: 1.25rem;
      font-weight: 600;
      color: white;
      text-decoration: none;
    }}

    .menu-button {{
      background: none;
      border: 1px solid #374151;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
    }}

    /* Sidebar styles */
    amp-sidebar {{
      width: 280px;
      background: white;
    }}

    .sidebar-header {{
      background: #0f172a;
      color: white;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .close-button {{
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
    }}

    .sidebar-nav {{
      padding: 1rem 0;
    }}

    .sidebar-nav a {{
      display: block;
      padding: 0.75rem 1rem;
      color: #374151;
      text-decoration: none;
      border-bottom: 1px solid #e5e7eb;
    }}

    .sidebar-nav a:hover {{
      background: #f9fafb;
    }}

    /* Main content */
    .amp-container {{
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }}

    .amp-article-header {{
      margin-bottom: 2rem;
    }}

    .amp-article-title {{
      font-size: 2rem;
      font-weight: 700;
      color: #1e3a8a;
      line-height: 1.2;
      margin: 0 0 1rem 0;
    }}

    .amp-article-meta {{
      color: #6b7280;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }}

    .amp-article-tags {{
      margin: 1rem 0;
    }}

    .amp-tag {{
      display: inline-block;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      padding: 0.25rem 0.75rem;
      margin: 0.25rem 0.25rem 0.25rem 0;
      font-size: 0.75rem;
      color: #374151;
    }}

    .amp-article-content {{
      line-height: 1.8;
      color: #374151;
    }}

    .amp-article-content p {{
      margin: 1rem 0;
    }}

    .amp-article-content h2 {{
      color: #1e3a8a;
      font-size: 1.5rem;
      margin: 2rem 0 1rem 0;
    }}

    .amp-article-content h3 {{
      color: #1e3a8a;
      font-size: 1.25rem;
      margin: 1.5rem 0 0.5rem 0;
    }}

    /* Discussion section */
    .amp-discussion {{
      border-top: 2px solid #e5e7eb;
      margin-top: 3rem;
      padding-top: 2rem;
    }}

    .amp-discussion h2 {{
      color: #1e3a8a;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }}

    .amp-btn {{
      display: inline-block;
      background: #1e3a8a;
      color: white;
      padding: 0.75rem 1.5rem;
      text-decoration: none;
      border-radius: 0.375rem;
      font-weight: 500;
      margin-top: 1rem;
    }}

    .amp-btn:hover {{
      background: #1e40af;
    }}

    /* Footer */
    .amp-footer {{
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 2rem 1rem;
      margin-top: 4rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
    }}

    /* Skip link accessibility */
    .skip-link {{
      position: absolute;
      top: -40px;
      left: 11px;
      z-index: 1000;
      background: #000;
      color: #fff;
      padding: 8px;
      border-radius: 4px;
      text-decoration: none;
    }}

    .skip-link:focus {{
      top: 11px;
    }}

    /* Responsive images */
    amp-img {{
      margin: 1.5rem 0;
    }}
  </style>
</head>
<body>
  <!-- Skip link for accessibility -->
  <a class="skip-link" href="#main">Direct naar inhoud</a>

  <!-- Header with menu -->
  <header class="amp-header">
    <div class="amp-header-content">
      <a href="/" class="amp-logo">DigestPaper.com</a>
      <button on="tap:site-menu.toggle" class="menu-button" aria-label="Menu openen">
        Menu
      </button>
    </div>
  </header>

  <!-- Sidebar menu -->
  <amp-sidebar id="site-menu" layout="nodisplay" side="left">
    <div class="sidebar-header">
      <span>Navigatie</span>
      <button on="tap:site-menu.close" class="close-button" aria-label="Menu sluiten">
        ×
      </button>
    </div>
    <nav class="sidebar-nav" role="navigation" aria-label="Hoofdnavigatie">
      <a href="/">Home</a>
      <a href="/search">Zoeken</a>
      <a href="/categories">Categorieën</a>
      <a href="/forum">Forum</a>
      <a href="/opsporingen">Opsporingen</a>
      <a href="/contact">Contact</a>
    </nav>
  </amp-sidebar>

  <!-- Main content -->
  <main id="main" class="amp-container" role="main">
    <article class="amp-article" itemscope itemtype="https://schema.org/NewsArticle">
      <header class="amp-article-header">
        <h1 class="amp-article-title" itemprop="headline">{esc_title}</h1>
        <div class="amp-article-meta">
          <span itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
            <span itemprop="name">DigestPaper.com</span>
          </span>
          <meta itemprop="datePublished" content="{published_iso}">
          <meta itemprop="dateModified" content="{published_iso}">
        </div>
        {"<div class='amp-article-tags'>" + "".join([f"<span class='amp-tag'>{html_escape(tag)}</span>" for tag in tags]) + "</div>" if tags else ""}
      </header>

      <!-- Hero image -->
      <amp-img
        src="{og_image}"
        width="1200"
        height="630"
        layout="responsive"
        alt="{esc_title}"
        itemprop="image">
      </amp-img>

      <!-- Article content -->
      <div class="amp-article-content" itemprop="articleBody">
        {body_html}
      </div>

      <!-- Discussion section -->
      <section class="amp-discussion">
        <h2>Discussie</h2>
        <p>Start een discussie over dit artikel. Nog geen reacties geplaatst.</p>
        <a href="{forum_url}" class="amp-btn">Open volledige forumweergave</a>
      </section>
    </article>
  </main>

  <!-- Footer -->
  <footer class="amp-footer">
    <p>&copy; 2025 DigestPaper.com - Nederlandse politie nieuws en veiligheidsforum</p>
  </footer>

  <!-- AMP Analytics -->
  <amp-analytics type="gtag" data-credentials="include">
    <script type="application/json">
    {{
      "vars": {{
        "gtag_id": "G-BKYZZK6D07",
        "config": {{
          "G-BKYZZK6D07": {{
            "anonymize_ip": true,
            "allow_google_signals": true
          }}
        }}
      }},
      "transport": {{
        "image": {{ "suppressWarnings": true }},
        "beacon": true,
        "xhrpost": true
      }},
      "triggers": {{
        "page_view": {{
          "on": "visible",
          "request": "pageview"
        }}
      }}
    }}
    </script>
  </amp-analytics>
</body>
</html>"""

# ---------------------------
# Writers
# ---------------------------

def write_json_api(article: Dict[str, Any], out_dir: str) -> str:
    api_dir = os.path.join(out_dir, "api")
    os.makedirs(api_dir, exist_ok=True)
    api_path = os.path.join(api_dir, "index.json")
    safe = dict(article)
    # Convert datetime to iso
    if isinstance(safe.get("timestamp"), datetime):
        safe["timestamp"] = iso_timestamp(safe["timestamp"])
    with open(api_path, "w", encoding="utf-8") as f:
        json.dump(safe, f, ensure_ascii=False, indent=2)
    return api_path

def write_static_article(article: Dict[str, Any], output_base: str) -> Dict[str, str]:
    slug = article.get("slug", "artikel")
    out_dir = os.path.join(output_base, "nieuws", slug)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "index.html")

    # Use enhanced article template with better cross-linking
    enhanced_html = article_html_template_enhanced(article)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(enhanced_html)

    # AMP
    amp_dir = os.path.join(out_dir, "amp")
    os.makedirs(amp_dir, exist_ok=True)
    amp_path = os.path.join(amp_dir, "index.html")
    with open(amp_path, "w", encoding="utf-8") as f:
        f.write(article_amp_html_template(article))

    # Enhanced forum page as SEO asset (not just redirect)
    forum_path = generate_forum_html(article, output_base)

    # Generate RSS feed for this thread
    rss_path = generate_forum_rss(article, slug, output_base)

    # JSON API snapshot
    api_path = write_json_api(article, out_dir)

    print(f"✅ Article HTML: {out_path}")
    print(f"✅ AMP HTML:     {amp_path}")
    print(f"✅ Forum SEO:    {forum_path}")
    print(f"✅ Forum RSS:    {rss_path}")
    print(f"✅ API JSON:     {api_path}")
    print(f"🌐 Article URL:  {BASE_URL}/nieuws/{slug}/")
    print(f"🌐 Forum URL:    {BASE_URL}/forum/{slug}/")
    return {"html": out_path, "amp": amp_path, "forum": forum_path, "rss": rss_path, "api": api_path}

def article_html_template_enhanced(article: Dict[str, Any]) -> str:
    """Enhanced article template using dynamic header/footer templates"""
    title = article.get("title", "")
    desc = article.get("description", "")
    urls = article.get("urls", {})
    canonical = urls.get("canonical", "")
    timestamp = article.get("timestamp")
    category = article.get("category", "Nieuws")
    tags = article.get("tags", [])

    # Prepare metadata for header
    header_metadata = {
        "title": f"{title} | DigestPaper.com",
        "description": desc[:160] if desc else f"{title} - Lees meer op DigestPaper.com",
        "keywords": f"{', '.join(tags[:5])}, politie, nieuws, {category.lower()}" if tags else f"politie, nieuws, {category.lower()}",
        "canonical_url": canonical,
        "og_type": "article",
        "og_title": title,
        "og_description": desc[:160] if desc else title,
        "og_url": canonical,
        "og_image": article.get("image_url", "https://digestpaper.com/favicon/og-1200x630.jpg"),
        "twitter_title": title,
        "twitter_description": desc[:160] if desc else title,
        "twitter_image": article.get("image_url", "https://digestpaper.com/favicon/twitter-1200x630.jpg"),
        "structured_data": generate_article_structured_data(article),
        "extra_css": '''<link rel="stylesheet" href="/css/style.css">''',
        "extra_js": '''<script type="module" src="/js/app.js"></script>
<script src="/js/category-enhancer.js"></script>
<script src="/js/svg-icon-enhancer.js"></script>
<script src="/js/article-enhanced.js" defer></script>'''
    }

    # Generate header
    header_html = generate_header_html(header_metadata)

    # Main article content
    content_html = generate_article_content(article)

    # Generate footer
    footer_html = generate_footer_html()

    return header_html + content_html + footer_html

def generate_article_content(article: Dict[str, Any]) -> str:
    """Generate the main article content section"""
    title = article.get("title", "")
    body_html = article.get("body_html", "")
    summary = article.get("summary", "")
    timestamp = article.get("timestamp")
    category = article.get("category", "Nieuws")
    tags = article.get("tags", [])
    urls = article.get("urls", {})

    # Format timestamp
    if timestamp:
        if isinstance(timestamp, datetime):
            formatted_time = timestamp.strftime("%d %B %Y om %H:%M")
        else:
            formatted_time = str(timestamp)
    else:
        formatted_time = "Onbekend"

    # Enhanced forum discussion widget
    forum_url = urls.get("forum", "#")
    forum_widget = f"""
    <!-- Enhanced Forum Discussion Widget -->
    <section id="forum-discussion" aria-labelledby="forum-discussion-title" class="forum-discussion-section">
      <h2 id="forum-discussion-title">
        <i class="fas fa-comments" aria-hidden="true"></i>
        Discussie over dit artikel
      </h2>

      <div class="discussion-controls">
        <span id="comment-count">0 reacties</span>
        <a href="{forum_url}" class="btn btn-primary" title="Ga naar de volledige forumpagina">
          <i class="fas fa-external-link-alt" aria-hidden="true"></i>
          Open volledige discussie
        </a>
      </div>

      <div id="preview-comments" class="comments-preview">
        <p class="loading-text">Reacties worden geladen...</p>
      </div>

      <div class="discussion-footer">
        <a href="{forum_url}" class="btn btn-secondary">Reageer op dit artikel</a>
      </div>
    </section>
    """

    # Main content
    content = f"""
  <main id="main" class="main-content article-page">
    <article class="article" itemscope itemtype="https://schema.org/NewsArticle">
      <header class="article-header">
        <div class="article-meta">
          <span class="article-category">{category}</span>
          <time class="article-date" datetime="{iso_timestamp(timestamp) if timestamp else ''}" itemprop="datePublished">
            {formatted_time}
          </time>
        </div>

        <h1 class="article-title" itemprop="headline">{html_escape(title)}</h1>

        {f'<p class="article-summary" itemprop="description">{html_escape(summary)}</p>' if summary else ''}

        <div class="article-tags">
          {' '.join([f'<span class="tag">#{tag}</span>' for tag in tags[:5]])}
        </div>
      </header>

      <div class="article-content" itemprop="articleBody">
        {body_html}
      </div>

      <footer class="article-footer">
        <div class="article-sharing">
          <h3>Deel dit artikel</h3>
          <div class="sharing-buttons">
            <a href="https://twitter.com/intent/tweet?text={title}&url={urls.get('canonical', '')}"
               class="share-btn twitter" target="_blank" rel="noopener">
              <i class="fab fa-twitter"></i> Twitter
            </a>
            <a href="https://www.facebook.com/sharer/sharer.php?u={urls.get('canonical', '')}"
               class="share-btn facebook" target="_blank" rel="noopener">
              <i class="fab fa-facebook"></i> Facebook
            </a>
            <a href="https://wa.me/?text={title} {urls.get('canonical', '')}"
               class="share-btn whatsapp" target="_blank" rel="noopener">
              <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
          </div>
        </div>

        {forum_widget}
      </footer>
    </article>
  </main>
    """

    return content

def generate_article_structured_data(article: Dict[str, Any]) -> str:
    """Generate JSON-LD structured data for articles"""
    try:
        # Build the structured data
        structured_data = {
            "@context": "https://schema.org",
            "@graph": [
                build_newsarticle_ld(article),
                build_org_ld(),
                build_website_ld()
            ]
        }

        return f"""
<script type="application/ld+json">
{json.dumps(structured_data, indent=2, ensure_ascii=False)}
</script>"""
    except Exception as e:
        print(f"⚠️ Error generating structured data: {e}")
        return ""

# ---------------------------
# Enhanced Q&A Extraction for SEO
# ---------------------------

def extract_qa_from_article(article: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Extract potential Q&A pairs from article content for FAQPage structured data.
    Uses AI to generate relevant questions and answers based on the article content.
    """
    title = article.get("title", "")
    full_text = article.get("full_text", "")
    category = article.get("category", "Nieuws")

    if not full_text or _ai_client is None:
        # Fallback to generic Q&A based on category
        return generate_fallback_qa(title, category)

    try:
        # Clean text for AI processing
        clean_text = re.sub(r"<[^>]+>", " ", full_text).strip()
        context = clean_text[:1000]  # Use first 1000 chars for context

        prompt = f"""Genereer 3-4 relevante vragen en antwoorden over dit politienieuws artikel voor een FAQ sectie.
Vragen moeten logisch zijn voor lezers die meer willen weten. Antwoorden kort en feitelijk.
Format: Q: vraag\nA: antwoord\n\nTitel: {title}\nTekst: {context}"""

        response = generate_text(prompt, style="Normal", language="Dutch", max_tokens=400)

        if response:
            qa_pairs = parse_qa_response(response)
            if len(qa_pairs) >= 2:  # Minimum viable FAQ
                return qa_pairs
    except Exception as e:
        print(f"Error generating Q&A: {e}")

    # Fallback to category-based Q&A
    return generate_fallback_qa(title, category)

def parse_qa_response(response: str) -> List[Dict[str, str]]:
    """Parse AI response into Q&A pairs"""
    qa_pairs = []
    lines = response.split('\n')
    current_q = ""
    current_a = ""

    for line in lines:
        line = line.strip()
        if line.startswith('Q:') or line.startswith('Vraag:'):
            if current_q and current_a:
                qa_pairs.append({"question": current_q, "answer": current_a})
            current_q = line[2:].strip() if line.startswith('Q:') else line[6:].strip()
            current_a = ""
        elif line.startswith('A:') or line.startswith('Antwoord:'):
            current_a = line[2:].strip() if line.startswith('A:') else line[9:].strip()
        elif current_a and line and not line.startswith('Q:') and not line.startswith('Vraag:'):
            current_a += " " + line

    # Add the last pair
    if current_q and current_a:
        qa_pairs.append({"question": current_q, "answer": current_a})

    return qa_pairs[:4]  # Max 4 Q&A pairs

def generate_fallback_qa(title: str, category: str) -> List[Dict[str, str]]:
    """Generate fallback Q&A based on title and category"""
    qa_pairs = [
        {
            "question": "Wat gebeurde er precies?",
            "answer": f"Volgens het politiebericht: {title}. Meer details staan in het volledige artikel."
        },
        {
            "question": "Wanneer vond dit incident plaats?",
            "answer": "De exacte tijd en datum van het incident staan vermeld in het nieuwsartikel."
        }
    ]

    # Category-specific questions
    if "opspooring" in category.lower() or "gezocht" in title.lower():
        qa_pairs.append({
            "question": "Hoe kan ik tips doorgeven aan de politie?",
            "answer": "Tips kunt u doorgeven via 0800-6070 (gratis) of anoniem via Meld Misdaad Anoniem 0800-7000."
        })
    elif "verkeer" in category.lower() or "ongeluk" in title.lower():
        qa_pairs.append({
            "question": "Was er sprake van gewonden?",
            "answer": "Informatie over eventuele gewonden staat vermeld in het politiebericht."
        })
    else:
        qa_pairs.append({
            "question": "Wat doet de politie in deze zaak?",
            "answer": "De politie onderzoekt de zaak. Updates worden gepubliceerd via officiële politiekanalen."
        })

    return qa_pairs

# ---------------------------
# Long-tail Keyword Extraction
# ---------------------------

def extract_longtail_keywords(article: Dict[str, Any]) -> List[str]:
    """
    Extract long-tail keywords from article content for meta tags.
    Includes location names, specific terms, and variations.
    """
    title = article.get("title", "")
    full_text = article.get("full_text", "")
    existing_tags = article.get("tags", [])

    # Combine text sources
    text_content = f"{title} {full_text}".lower()

    # Dutch location keywords
    locations = re.findall(r'\b(amsterdam|rotterdam|den haag|utrecht|eindhoven|tilburg|groningen|almere|breda|nijmegen|enschede|haarlem|arnhem|zaanstad|amersfoort|apeldoorn|maastricht|dordrecht|leiden|zoetermeer|\w+dam|\w+burg|\w+hoven|\w+stad)\b', text_content)

    # Police/crime specific terms
    police_terms = re.findall(r'\b(politie|agent|arrestatie|aanhouding|onderzoek|verdachte|incident|melding|controle|surveillance|patrouille|handhaving|veiligheid)\b', text_content)

    # Crime types
    crime_terms = re.findall(r'\b(diefstal|inbraak|geweld|bedreiging|fraude|vandalisme|overlast|drugshandel|witwassen|oplichting|stalking|huiselijk geweld)\b', text_content)

    # Time/location modifiers
    modifiers = re.findall(r'\b(centrum|station|winkelcentrum|woning|straat|plein|park|school|ziekenhuis|kantoor)\b', text_content)

    # Combine and deduplicate
    longtail_keywords = existing_tags.copy() if existing_tags else ["nederland", "politie", "nieuws"]

    for keyword_list in [locations, police_terms, crime_terms, modifiers]:
        for keyword in keyword_list:
            if keyword not in longtail_keywords and len(keyword) > 3:
                longtail_keywords.append(keyword)

    # Limit to reasonable number for meta tags
    return longtail_keywords[:15]

# ---------------------------
# Related Discussions Widget
# ---------------------------

def generate_related_discussions(article: Dict[str, Any], all_articles: List[Dict[str, Any]] = None) -> List[Dict[str, str]]:
    """
    Generate related forum discussions based on category, tags, and content similarity.
    Returns a list of related article/forum pairs for cross-linking.
    """
    if not all_articles:
        # In real implementation, this would query the database
        # For now, return empty list as placeholder
        return []

    current_category = article.get("category", "")
    current_tags = set(article.get("tags", []))
    current_slug = article.get("slug", "")

    related = []

    for other_article in all_articles:
        if other_article.get("slug") == current_slug:
            continue

        other_category = other_article.get("category", "")
        other_tags = set(other_article.get("tags", []))

        # Calculate relevance score
        score = 0
        if other_category == current_category:
            score += 3

        # Tag overlap
        tag_overlap = len(current_tags.intersection(other_tags))
        score += tag_overlap * 2

        if score > 2:  # Minimum relevance threshold
            related.append({
                "title": other_article.get("title", ""),
                "slug": other_article.get("slug", ""),
                "forum_url": f"{BASE_URL}/forum/{other_article.get('slug', '')}",
                "category": other_category
            })

    # Sort by relevance and return top 5
    return related[:5]

# ---------------------------
# Enhanced Forum HTML Generation with SEO Assets
# ---------------------------

def generate_forum_html(article: Dict[str, Any], output_base: str) -> str:
    """
    Generate enhanced forum HTML page using dynamic templates with:
    - Distinct meta titles/descriptions
    - Q&A extraction for FAQPage structured data
    - Related discussions widget
    - Long-tail keyword optimization
    - Prerendered comment placeholders
    """
    title = article.get("title") or "Forum Discussion"
    slug = article.get("slug", "forum-discussie")
    canonical_url = article["urls"]["canonical"]
    forum_url = f"{BASE_URL}/forum/{slug}"

    # Create forum directory and file path
    forum_dir = os.path.join(output_base, "forum", slug)
    os.makedirs(forum_dir, exist_ok=True)
    forum_path = os.path.join(forum_dir, "index.html")

    # Generate distinct SEO meta content
    summary = article.get("summary", "")
    forum_title = f"Discussie: {title}"
    forum_description = f"Reacties en meningen over: {title}. Neem deel aan de discussie over dit politienieuws op DigestPaper.com."

    # Ensure description is complete and under 160 chars
    if len(forum_description) > 160:
        forum_description = f"Discussie over: {title[:100]}..."

    # Extract Q&A for FAQPage structured data
    qa_pairs = extract_qa_from_article(article)

    # Generate long-tail keywords
    longtail_keywords = extract_longtail_keywords(article)
    keywords_str = ", ".join(longtail_keywords)

    # Related discussions (placeholder for now)
    related_discussions = generate_related_discussions(article)

    # Prepare metadata for header
    header_metadata = {
        "title": f"{forum_title} | DigestPaper.com",
        "description": forum_description,
        "keywords": f"forum, discussie, {keywords_str}, politie, veiligheid" if keywords_str else "forum, discussie, politie, veiligheid",
        "canonical_url": forum_url,
        "og_type": "webpage",
        "og_title": forum_title,
        "og_description": forum_description,
        "og_url": forum_url,
        "og_image": "https://digestpaper.com/favicon/og-1200x630.jpg",
        "twitter_title": forum_title,
        "twitter_description": forum_description,
        "twitter_image": "https://digestpaper.com/favicon/twitter-1200x630.jpg",
        "structured_data": generate_forum_structured_data(article, qa_pairs),
        "extra_css": '''<link rel="stylesheet" href="/css/style.css">''',
        "extra_js": '''<script type="module" src="/js/app.js"></script>
<script src="/js/category-enhancer.js"></script>
<script src="/js/svg-icon-enhancer.js"></script>
<script src="/js/forum-discussion-widget.js" defer></script>'''
    }

    # Generate header
    header_html = generate_header_html(header_metadata)

    # Generate forum content
    content_html = generate_forum_content(article, qa_pairs, related_discussions)

    # Generate footer
    footer_html = generate_footer_html()

    # Combine and write
    full_html = header_html + content_html + footer_html

    with open(forum_path, 'w', encoding='utf-8') as f:
        f.write(full_html)

    print(f"✅ Forum page: {forum_path}")
    return forum_path

def generate_forum_content(article: Dict[str, Any], qa_pairs: List[Dict[str, str]], related_discussions: List[Dict[str, str]]) -> str:
    """Generate the main forum content section"""
    title = article.get("title", "")
    slug = article.get("slug", "")
    canonical_url = article["urls"]["canonical"]
    forum_url = f"{BASE_URL}/forum/{slug}"

    # Forum synopsis
    synopsis = generate_forum_synopsis(article)

    # Q&A section if we have pairs
    qa_section = ""
    if qa_pairs:
        qa_html = []
        for qa in qa_pairs[:5]:  # Limit to first 5
            qa_html.append(f"""
        <div class="qa-item" itemscope itemtype="https://schema.org/Question">
          <h3 class="question" itemprop="name">{html_escape(qa['question'])}</h3>
          <div class="answer" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
            <div itemprop="text">{html_escape(qa['answer'])}</div>
          </div>
        </div>""")

        qa_section = f"""
      <section class="forum-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Veelgestelde vragen over dit onderwerp</h2>
        <div class="qa-list">
          {''.join(qa_html)}
        </div>
      </section>"""

    # Related discussions widget
    related_section = ""
    if related_discussions:
        related_html = []
        for discussion in related_discussions[:5]:
            related_html.append(f"""
        <li>
          <a href="{discussion['forum_url']}" class="related-link">
            <h4>{html_escape(discussion['title'])}</h4>
            <span class="related-meta">Discussie • {discussion.get('category', 'Nieuws')}</span>
          </a>
        </li>""")

        related_section = f"""
      <section class="related-discussions" aria-labelledby="related-title">
        <h2 id="related-title">Gerelateerde discussies</h2>
        <ul class="related-list">
          {''.join(related_html)}
        </ul>
      </section>"""

    content = f"""
  <main id="main" class="main-content forum-page">
    <article class="forum-article" itemscope itemtype="https://schema.org/DiscussionForumPosting">
      <header class="forum-header">
        <div class="breadcrumbs">
          <a href="/">Home</a> › <a href="/forum">Forum</a> › <span>{html_escape(title)}</span>
        </div>

        <h1 class="forum-title" itemprop="headline">Discussie: {html_escape(title)}</h1>

        <div class="forum-meta">
          <span class="forum-source">
            Gebaseerd op artikel: <a href="{canonical_url}" class="source-link">{html_escape(title)}</a>
          </span>
        </div>
      </header>

      <div class="forum-intro" itemprop="articleBody">
        <p class="forum-synopsis">{synopsis}</p>
        <p><a href="{canonical_url}" class="btn btn-primary">Lees het volledige artikel</a></p>
        <meta itemprop="discussionUrl" content="{forum_url}">
      </div>

      {qa_section}

      {related_section}

      <div class="forum-controls">
        <label for="sort">Sorteren:</label>
        <select id="sort">
          <option value="newest">Nieuwste eerst</option>
          <option value="oldest">Oudste eerst</option>
          <option value="top">Meeste stemmen</option>
        </select>
      </div>

      <section id="replies" aria-label="Reacties" class="forum-replies">
        <p>Nog geen reacties geplaatst. <a href="{canonical_url}#discuss">Start de discussie op de artikelpagina</a>.</p>
      </section>

      <!-- Forum Discussion Widget -->
      <section id="forum-discussion" aria-labelledby="forum-discussion-title" class="forum-discussion-section">
        <!-- Interactive discussion widget loads here -->
      </section>

      <section id="reply-form" aria-label="Plaats een reactie" class="forum-reply-form">
        <h2>Plaats een reactie</h2>
        <p><a href="{canonical_url}#discuss" class="btn btn-primary">Ga naar artikelpagina om te reageren</a></p>
      </section>
    </article>
  </main>
    """

    return content

def generate_forum_structured_data(article: Dict[str, Any], qa_pairs: List[Dict[str, str]]) -> str:
    """Generate JSON-LD structured data for forum pages"""
    try:
        title = article.get("title", "")
        slug = article.get("slug", "")
        forum_url = f"{BASE_URL}/forum/{slug}"
        timestamp = article.get("timestamp")

        # Base structured data
        structured_data = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "DiscussionForumPosting",
                    "@id": f"{forum_url}#forum",
                    "url": forum_url,
                    "headline": f"Discussie: {title}",
                    "dateCreated": iso_timestamp(timestamp) if timestamp else iso_timestamp(get_dutch_now()),
                    "dateModified": iso_timestamp(timestamp) if timestamp else iso_timestamp(get_dutch_now()),
                    "inLanguage": "nl-NL",
                    "isPartOf": { "@id": f"{BASE_URL}/#website" },
                    "mainEntity": {
                        "@type": "WebPage",
                        "@id": f"{forum_url}#webpage",
                        "url": forum_url,
                        "name": f"Discussie: {title}",
                        "isPartOf": { "@id": f"{BASE_URL}/#website" }
                    },
                    "commentCount": 0,
                    "interactionStatistic": [
                        {
                            "@type": "InteractionCounter",
                            "interactionType": { "@type": "CommentAction" },
                            "userInteractionCount": 0
                        }
                    ]
                },
                {
                    "@type": "BreadcrumbList",
                    "@id": f"{forum_url}#breadcrumb",
                    "itemListElement": [
                        { "@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE_URL}/" },
                        { "@type": "ListItem", "position": 2, "name": "Forum", "item": f"{BASE_URL}/forum" },
                        { "@type": "ListItem", "position": 3, "name": title, "item": forum_url }
                    ]
                }
            ]
        }

        # Add FAQPage if we have Q&A pairs
        if qa_pairs:
            faq_data = {
                "@type": "FAQPage",
                "@id": f"{forum_url}#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": qa['question'],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": qa['answer']
                        }
                    } for qa in qa_pairs
                ]
            }
            structured_data["@graph"].append(faq_data)

        return f"""
<script type="application/ld+json">
{json.dumps(structured_data, indent=2, ensure_ascii=False)}
</script>"""
    except Exception as e:
        print(f"⚠️ Error generating forum structured data: {e}")
        return ""
    faq_jsonld = ""
    if qa_pairs:
        faq_items = []
        for qa in qa_pairs:
            faq_items.append({
                "@type": "Question",
                "name": qa["question"],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": qa["answer"]
                }
            })

        faq_jsonld = f"""
      {{
        "@type": "FAQPage",
        "@id": "{forum_url}#faq",
        "mainEntity": {json.dumps(faq_items, ensure_ascii=False)}
      }},"""

    # Generate the enhanced forum HTML
    forum_html = f"""<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- SEO Meta - Distinct from article page -->
  <title>{html_escape(forum_title)} | DigestPaper.com</title>
  <meta name="description" content="{html_escape(forum_description)}">
  <meta name="keywords" content="{html_escape(keywords_str)}">
  <meta name="news_keywords" content="{html_escape(keywords_str)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="referrer" content="strict-origin-when-cross-origin">

  <!-- Canonical - Self-referencing (no longer redirects to article) -->
  <link rel="canonical" href="{forum_url}">
  <link rel="alternate" href="{forum_url}" hreflang="nl-NL">
  <link rel="alternate" href="{forum_url}" hreflang="x-default">

  <!-- Cross-linking to article -->
  <link rel="related" href="{canonical_url}" title="Oorspronkelijk nieuwsartikel">

  <!-- RSS feed for this thread -->
  <link rel="alternate" type="application/rss+xml" title="Reacties op deze thread" href="{BASE_URL}/forum/{slug}.xml">

  <!-- Performance preconnects -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="//www.google-analytics.com">
  <link rel="dns-prefetch" href="//www.googletagmanager.com">

  <!-- Social Media Meta - Distinct from article -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="DigestPaper.com">
  <meta property="og:title" content="{html_escape(forum_title)}">
  <meta property="og:description" content="{html_escape(forum_description)}">
  <meta property="og:url" content="{forum_url}">
  <meta property="og:image" content="{article.get('image_url', f'{BASE_URL}/social/forum-discussion-og.png')}">
  <meta property="og:image:alt" content="Forum discussie: {esc_title}">
  <meta property="og:see_also" content="{canonical_url}">
  <meta property="og:updated_time" content="{iso_modified}">
  <meta property="article:published_time" content="{iso_published}">
  <meta property="article:modified_time" content="{iso_modified}">
  <meta property="article:section" content="Forum">
  <meta property="article:tag" content="Forum">
  <meta property="article:tag" content="Discussie">
  <meta property="article:tag" content="{article.get('category', 'Nieuws')}">
  {''.join([f'<meta property="article:tag" content="{html_escape(tag)}">' for tag in longtail_keywords[:5]])}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@digestpaper_nl">
  <meta name="twitter:title" content="{html_escape(forum_title)}">
  <meta name="twitter:description" content="{html_escape(forum_description)}">
  <meta name="twitter:image" content="{article.get('image_url', f'{BASE_URL}/social/forum-discussion-twitter.png')}">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "Organization",
        "@id": "{BASE_URL}#org",
        "name": "DigestPaper.com",
        "url": "{BASE_URL}",
        "logo": {{
          "@type": "ImageObject",
          "url": "{BASE_URL}/favicon/favicon-192x192.png",
          "width": 192,
          "height": 192
        }},
        "sameAs": [
          "https://www.linkedin.com/in/cybersecurityad",
          "https://x.com/digestpaper"
        ]
      }},
      {{
        "@type": "WebSite",
        "@id": "{BASE_URL}#website",
        "url": "{BASE_URL}",
        "name": "DigestPaper.com",
        "publisher": {{ "@id": "{BASE_URL}#org" }},
        "potentialAction": {{
          "@type": "SearchAction",
          "target": "{BASE_URL}/search?q={{search_term_string}}",
          "query-input": "required name=search_term_string"
        }}
      }},
      {{
        "@type": "CollectionPage",
        "@id": "{BASE_URL}/forum#collection",
        "url": "{BASE_URL}/forum",
        "name": "Forum - DigestPaper.com",
        "description": "Discussieforum voor politienieuws en veiligheidsonderwerpen in Nederland",
        "isPartOf": {{ "@id": "{BASE_URL}#website" }}
      }},
      {{
        "@type": "WebPage",
        "@id": "{forum_url}#webpage",
        "url": "{forum_url}",
        "name": "{html_escape(forum_title)}",
        "isPartOf": {{ "@id": "{BASE_URL}#website" }},
        "breadcrumb": {{ "@id": "{forum_url}#breadcrumbs" }},
        "inLanguage": "nl-NL",
        "about": {{ "@id": "{canonical_url}#news" }},
        "primaryImageOfPage": {{
          "@type": "ImageObject",
          "url": "{article.get('image_url', f'{BASE_URL}/social/forum-discussion-image.png')}",
          "width": 1200,
          "height": 630
        }}
      }},
      {{
        "@type": "DiscussionForumPosting",
        "@id": "{forum_url}#forum",
        "url": "{forum_url}",
        "mainEntityOfPage": {{ "@id": "{forum_url}#webpage" }},
        "isPartOf": {{ "@id": "{BASE_URL}/forum#collection" }},
        "discussionUrl": "{forum_url}",
        "headline": "{html_escape(forum_title)}",
        "about": {{ "@id": "{canonical_url}#news" }},
        "author": {{ "@id": "{BASE_URL}#org" }},
        "publisher": {{ "@id": "{BASE_URL}#org" }},
        "datePublished": "{iso_published}",
        "dateModified": "{iso_modified}",
        "inLanguage": "nl-NL",
        "commentCount": 0,
        "keywords": "{html_escape(keywords_str)}",
        "interactionStatistic": [{{
          "@type": "InteractionCounter",
          "interactionType": {{ "@type": "CommentAction" }},
          "userInteractionCount": 0
        }}],
        "thumbnailUrl": "{article.get('image_url', f'{BASE_URL}/social/forum-discussion-thumb.png')}"
      }},{faq_jsonld}
      {{
        "@type": "BreadcrumbList",
        "@id": "{forum_url}#breadcrumbs",
        "itemListElement": [
          {{ "@type": "ListItem", "position": 1, "name": "Home", "item": "{BASE_URL}/" }},
          {{ "@type": "ListItem", "position": 2, "name": "Forum", "item": "{BASE_URL}/forum" }},
          {{ "@type": "ListItem", "position": 3, "name": "{esc_title}", "item": "{forum_url}" }}
        ]
      }}
    ]
  }}
  </script>

  <!-- PWA / Icons -->
  <link rel="manifest" href="/site.webmanifest">
  <link rel="icon" href="/favicon/favicon.ico">
  <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg">
  <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
  <meta name="theme-color" content="#0f172a">

  <!-- Fonts -->
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"></noscript>

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">

  <!-- Styles -->
  <link rel="stylesheet" href="/css/style.css">

  <!-- Analytics (consistent with site) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{ dataLayer.push(arguments); }}
    gtag('consent','default',{{
      ad_user_data:'granted',
      ad_personalization:'granted',
      ad_storage:'granted',
      analytics_storage:'granted',
      functionality_storage:'granted',
      personalization_storage:'granted',
      security_storage:'granted'
    }});
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-BKYZZK6D07"></script>
  <script src="/js/consent.js" defer></script>
  <script>
    gtag('js', new Date());
    gtag('config', 'G-BKYZZK6D07', {{
      send_page_view: true,
      anonymize_ip: false,
      allow_google_signals: true,
      allow_ad_personalization_signals: true
    }});
  </script>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"></noscript>
</head>
<body>
<header>
  <div class="bar">
    <div class="brand">
      <img src="/logo.png" alt="" loading="eager" decoding="async">
      <div>
        <strong>DigestPaper.com</strong>
        <div class="muted" style="font-size:.8rem">Forum (Realtime Database)</div>
      </div>
    </div>
    <div class="row">
      <span id="userLabel" class="muted">Niet ingelogd</span>
      <button id="googleBtn" class="btn">Google</button>
      <button id="guestBtn" class="btn">Gast</button>
      <button id="logoutBtn" class="btn" style="display:none">Uitloggen</button>
    </div>
  </div>
</header>

<main>
  <!-- LEFT -->
  <section>
    <div class="card">
      <div class="hdr"><h2>Topics</h2><div class="muted">Laatste 50 (meest recent)</div></div>
      <nav id="topicList" class="topic-list bd" aria-label="Topiclijst">
        <div class="empty">Nog geen topics. Maak de eerste aan!</div>
      </nav>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="hdr"><h3>Nieuw topic</h3><div class="muted">Start een discussie</div></div>
      <div class="bd">
        <form id="newThreadForm" autocomplete="off">
          <label for="threadTitle" class="muted">Titel</label>
          <input id="threadTitle" maxlength="140" required placeholder="Korte, duidelijke titel">
          <label for="firstMessage" class="muted" style="margin-top:6px">Eerste bericht</label>
          <textarea id="firstMessage" maxlength="2000" required placeholder="Waar gaat de discussie over?"></textarea>
          <button class="btn primary" type="submit">Topic plaatsen</button>
          <div id="newThreadHint" class="muted"></div>
        </form>
      </div>
    </div>
  </section>

  <!-- RIGHT -->
  <section>
    <div class="card">
      <div class="bd">
        <div class="breadcrumb"><a href="/forum">Forum</a> <span id="crumb"></span></div>
        <h2 id="activeTitle">Kies een topic</h2>
        <div class="muted" id="activeMeta"></div>
      </div>
      <div id="postList" class="posts bd"><div class="empty">Geen topic geselecteerd.</div></div>
    </div>

    <div class="card" id="replyCard" style="display:none;margin-top:16px">
      <div class="hdr"><h3>Reageren</h3></div>
      <div class="bd">
        <form id="newMessageForm" autocomplete="off">
          <textarea id="messageText" maxlength="2000" required placeholder="Schrijf je reactie…"></textarea>
          <button class="btn primary" type="submit">Plaatsen</button>
          <div id="newMsgHint" class="muted"></div>
        </form>
      </div>
    </div>
  </section>
</main>

<script type="module">
  /***** Firebase v10.13.2 (ESM) *****/
  import {{ initializeApp }} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
  import {{
    getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
    signInAnonymously, signOut, updateProfile
  }} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
  import {{
    getDatabase, ref, push, set, update, serverTimestamp, onValue,
    query, orderByChild, limitToLast, onDisconnect, get
  }} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

  const app = initializeApp({{
    apiKey: "AIzaSyDCRYKrWUvtOtDAY4TThjlm7AxkzHG-62s",
    authDomain: "blockchainkix-com-fy.firebaseapp.com",
    projectId: "blockchainkix-com-fy",
    storageBucket: "blockchainkix-com-fy.appspot.com",
    databaseURL: "https://blockchainkix-com-fy-default-rtdb.europe-west1.firebasedatabase.app"
  }});
  const auth = getAuth(app);
  const db   = getDatabase(app);

  /***** Helpers *****/
  const $ = s => document.querySelector(s);
  const topicListEl = $('#topicList');
  const newThreadForm = $('#newThreadForm');
  const newThreadHint = $('#newThreadHint');
  const newMessageForm = $('#newMessageForm');
  const newMsgHint = $('#newMsgHint');
  const replyCard = $('#replyCard');
  const activeTitle = $('#activeTitle');
  const activeMeta = $('#activeMeta');
  const crumb = $('#crumb');
  const userLabel = $('#userLabel');
  const googleBtn = $('#googleBtn');
  const guestBtn = $('#guestBtn');
  const logoutBtn = $('#logoutBtn');

  const escapeHTML = (s='') => s.replace(/[&<>"']/g, c => ({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]));
  const linkify = (text='') => escapeHTML(text).replace(/(https?:\\/\\/[^\\s<]+)/g, u => {{
    const internal = u.startsWith('https://digestpaper.com');
    const rel = internal ? 'noopener noreferrer' : 'ugc nofollow noopener noreferrer';
    return `<a href="${{u}}" target="_blank" rel="${{rel}}">${{u}}</a>`;
  }});
  const timeAgo = ts => {{
    if (!ts) return '';
    const d = new Date(ts);
    const s = Math.floor((Date.now() - d.getTime())/1000);
    const m = Math.floor(s/60), h = Math.floor(m/60), dd = Math.floor(h/24);
    if (s<60) return `${{s}}s geleden`;
    if (m<60) return `${{m}}m geleden`;
    if (h<24) return `${{h}}u geleden`;
    return `${{dd}}d geleden`;
  }};

  let currentUser = null;
  let activeThreadId = null;
  let messagesUnsub = null;

  /***** Auth *****/
  googleBtn.onclick = async () => {{
    googleBtn.disabled = true;
    try {{ await signInWithPopup(auth, new GoogleAuthProvider()); }}
    catch(e){{ alert('Inloggen mislukt: ' + (e?.message || e)); }}
    googleBtn.disabled = false;
  }};
  guestBtn.onclick = async () => {{
    guestBtn.disabled = true;
    try {{
      await signInAnonymously(auth);
      if (auth.currentUser && !auth.currentUser.displayName) {{
        await updateProfile(auth.currentUser, {{ displayName: 'Gast' }});
      }}
    }} catch(e){{ alert('Gastmodus mislukt: ' + (e?.message || e)); }}
    guestBtn.disabled = false;
  }};
  logoutBtn.onclick = () => signOut(auth);

  onAuthStateChanged(auth, async (user) => {{
    currentUser = user || null;
    if (currentUser) {{
      userLabel.textContent = currentUser.displayName ? `Ingelogd als ${{currentUser.displayName}}` : 'Ingelogd';
      googleBtn.style.display = 'none'; guestBtn.style.display = 'none'; logoutBtn.style.display = 'inline-block';
      // Presence
      const me = ref(db, `presence/${{currentUser.uid}}`);
      await set(me, {{ state: 'online', lastChanged: serverTimestamp() }});
      onDisconnect(me).set({{ state: 'offline', lastChanged: serverTimestamp() }});
      // Users profile node (private as per rules)
      const uref = ref(db, `users/${{currentUser.uid}}`);
      const snap = await get(uref);
      if (!snap.exists()) {{
        await set(uref, {{
          displayName: currentUser.displayName || 'Gast',
          photoURL: currentUser.photoURL || null,
          createdAt: Date.now(),
          lastSeen: Date.now()
        }});
      }} else {{
        await update(uref, {{ displayName: currentUser.displayName || 'Gast', photoURL: currentUser.photoURL || null, lastSeen: Date.now() }});
      }}
    }} else {{
      userLabel.textContent = 'Niet ingelogd';
      googleBtn.style.display = 'inline-block'; guestBtn.style.display = 'inline-block'; logoutBtn.style.display = 'none';
    }}
  }});

  /***** Threads *****/
  const threadsQuery = query(ref(db, 'threads'), orderByChild('updatedAt'), limitToLast(50));
  onValue(threadsQuery, (snap) => {{
    const items = [];
    snap.forEach(child => {{
      const t = child.val() || {{}};
      items.push({{ id: child.key, ...t }});
    }});
    items.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
    topicListEl.innerHTML = items.length ? items.map(renderThreadRow).join('') : `<div class="empty">Nog geen topics. Maak de eerste aan!</div>`;
    highlightActive();
  }});

  function renderThreadRow(t){{
    const countStr = t.messageCount ? `${{t.messageCount}} reacties • ` : '';
    const last = t.updatedAt ? timeAgo(t.updatedAt) : 'zojuist';
    return `
      <a class="topic" href="#/t/${{encodeURIComponent(t.id)}}" data-id="${{t.id}}">
        <div style="min-width:0">
          <div style="font-weight:500">${{escapeHTML(t.title || 'Ongetiteld')}}</div>
          <div class="muted">${{countStr}}${{last}}</div>
        </div>
        <div class="pill">Open</div>
      </a>
    `;
  }}

  newThreadForm.addEventListener('submit', async (e) => {{
    e.preventDefault();
    if (!currentUser) return alert('Log eerst in (Google of Gast).');
    const title = $('#threadTitle').value.trim();
    const first = $('#firstMessage').value.trim();
    if (!title || !first) return;

    const submitBtn = newThreadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true; newThreadHint.textContent = 'Bezig met plaatsen…';

    try {{
      // create thread (key = threadId)
      const tRef = push(ref(db, 'threads'));
      await set(tRef, {{
        title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.uid,
        // Optional counter (not enforced by rules; safe to omit)
        messageCount: 0
      }});

      // first message
      const mRef = push(ref(db, `messages/${{tRef.key}}`));
      await set(mRef, {{
        id: mRef.key,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Gast',
        text: first.slice(0,2000),
        createdAt: serverTimestamp(),
        editedAt: null
      }});

      // bump updatedAt (+ optional counter)
      await update(tRef, {{ updatedAt: serverTimestamp(), messageCount: (title ? null : null) }}); // updatedAt is what matters for list
      location.hash = `#/t/${{encodeURIComponent(tRef.key)}}`;
      newThreadForm.reset(); newThreadHint.textContent = 'Topic geplaatst ✅';
      setTimeout(()=> newThreadHint.textContent='', 1200);
    }} catch (err) {{
      alert('Plaatsen mislukt: ' + (err?.message || err));
    }} finally {{
      submitBtn.disabled = false;
    }}
  }});

  /***** Messages per thread *****/
  function openThread(threadId){{
    activeThreadId = threadId;
    // Select row
    highlightActive();

    // Read thread once for header
    onValue(ref(db, `threads/${{threadId}}`), (snap) => {{
      const t = snap.val();
      if (!t) {{
        activeTitle.textContent = 'Topic niet gevonden';
        activeMeta.textContent = '';
        $('#postList').innerHTML = `<div class="empty">Dit topic bestaat niet (meer).</div>`;
        replyCard.style.display = 'none';
        crumb.textContent = '';
        return;
      }}
      activeTitle.textContent = t.title || 'Ongetiteld';
      const mc = t.messageCount ? `${{t.messageCount}} reacties • ` : '';
      activeMeta.textContent = `${{mc}}${{t.createdAt ? '' : ''}}`;
      crumb.innerHTML = ` / <span>${{escapeHTML(t.title || '')}}</span>`;
      replyCard.style.display = 'block';
    }}, {{ onlyOnce: true }});

    // Stream latest 100 messages (ascending)
    if (messagesUnsub) messagesUnsub(); // detach previous
    const qMsgs = query(ref(db, `messages/${{threadId}}`), orderByChild('createdAt'), limitToLast(100));
    messagesUnsub = onValue(qMsgs, (snap) => {{
      const arr = [];
      snap.forEach(ch => arr.push(ch.val()));
      arr.sort((a,b) => (a.createdAt||0)-(b.createdAt||0));
      const html = arr.map(renderMessage).join('');
      $('#postList').innerHTML = html || `<div class="empty">Nog geen reacties.</div>`;
    }});
  }}

  function renderMessage(m){{
    const when = m.createdAt ? timeAgo(m.createdAt) : 'zojuist';
    return `
      <div class="post">
        <div class="meta">${{escapeHTML(m.authorName || 'Gast')}} • ${{when}}</div>
        <div class="body">${{linkify(m.text || '')}}</div>
      </div>
    `;
  }}

  newMessageForm.addEventListener('submit', async (e) => {{
    e.preventDefault();
    if (!currentUser) return alert('Log eerst in (Google of Gast).');
    if (!activeThreadId) return alert('Geen topic geselecteerd.');
    const text = $('#messageText').value.trim();
    if (!text) return;

    const btn = newMessageForm.querySelector('button[type="submit"]');
    btn.disabled = true; newMsgHint.textContent = 'Bezig met plaatsen…';
    try {{
      const mRef = push(ref(db, `messages/${{activeThreadId}}`));
      await set(mRef, {{
        id: mRef.key,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Gast',
        text: text.slice(0,2000),
        createdAt: serverTimestamp(),
        editedAt: null
      }});
      // update thread.updatedAt (and optionally increment a counter if you keep one via a Cloud Function)
      await update(ref(db, `threads/${{activeThreadId}}`), {{ updatedAt: serverTimestamp() }});
      newMessageForm.reset(); newMsgHint.textContent = 'Geplaatst ✅';
      setTimeout(()=> newMsgHint.textContent='', 1000);
    }} catch (err) {{
      alert('Plaatsen mislukt: ' + (err?.message || err));
    }} finally {{
      btn.disabled = false;
    }}
  }});

  /***** Router *****/
  function highlightActive(){{
    document.querySelectorAll('.topic').forEach(a => a.classList.remove('active'));
    if (activeThreadId) {{
      const el = document.querySelector(`.topic[data-id="${{activeThreadId}}"]`);
      if (el) el.classList.add('active');
    }}
  }}
  function handleRoute(){{
    const m = location.hash.match(/^#\\/t\\/([^\\/#?]+)/i);
    if (m) openThread(decodeURIComponent(m[1]));
    else {{ activeThreadId = null; $('#postList').innerHTML = `<div class="empty">Geen topic geselecteerd.</div>`; replyCard.style.display = 'none'; crumb.textContent=''; highlightActive(); }}
  }}
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
</script>
</body>
</html>"""

    # Write the file
    with open(forum_path, "w", encoding="utf-8") as f:
        f.write(forum_html)

    return forum_path


# ---------------------------
# Forum RSS Feed Generation
# ---------------------------

def generate_forum_rss(article: Dict[str, Any], slug: str, output_base: str) -> str:
    """
    Generate an RSS feed for forum thread comments.
    Currently creates a placeholder feed structure.
    """
    from xml.sax.saxutils import escape as xml_escape

    title = article.get("title", "Untitled")
    esc_title = xml_escape(title)
    canonical = f"{BASE_URL}/nieuws/{slug}/"
    forum_url = f"{BASE_URL}/forum/{slug}"

    # Get timestamps
    published_str = article.get("published", "")
    if published_str:
        try:
            published_dt = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
            published_rfc = published_dt.strftime("%a, %d %b %Y %H:%M:%S %z")
        except (ValueError, TypeError):
            published_rfc = datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z")
    else:
        published_rfc = datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z")

    # Create RSS content
    rss_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Reacties op: {esc_title} - DigestPaper.com</title>
    <link>{forum_url}</link>
    <description>Discussie en reacties over het nieuws: {esc_title}</description>
    <language>nl-NL</language>
    <managingEditor>redactie@digestpaper.com (DigestPaper.com)</managingEditor>
    <webMaster>webmaster@digestpaper.com (DigestPaper.com)</webMaster>
    <pubDate>{published_rfc}</pubDate>
    <lastBuildDate>{datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z")}</lastBuildDate>
    <generator>DigestPaper.com Static Generator</generator>
    <atom:link href="{BASE_URL}/forum/{slug}.xml" rel="self" type="application/rss+xml"/>

    <!-- Placeholder item for the original article -->
    <item>
      <title>Discussie gestart: {esc_title}</title>
      <link>{forum_url}</link>
      <guid isPermaLink="true">{forum_url}</guid>
      <description>Discussie over het nieuwsartikel: {esc_title}. Neem deel aan de discussie op de forumpagina.</description>
      <pubDate>{published_rfc}</pubDate>
      <category>Forum</category>
      <category>Discussie</category>
    </item>

    <!-- Future: Dynamic comments will be added here via API integration -->

  </channel>
</rss>"""

    # Write RSS file
    rss_path = os.path.join(output_base, "forum", slug, f"{slug}.xml")
    os.makedirs(os.path.dirname(rss_path), exist_ok=True)

    with open(rss_path, "w", encoding="utf-8") as f:
        f.write(rss_content)

    return rss_path

# ---------------------------
# Static Forum Page Generation
# ---------------------------

def create_simple_forum_page(article: Dict[str, Any], slug: str, output_base: str) -> str:
    """
    Generate a simple static forum page with header and footer includes.
    This creates a basic forum discussion page for each article.
    """
    title = article.get("title", "")
    esc_title = html_escape(title)
    canonical = article["urls"]["canonical"]

    # Create forum directory
    forum_dir = os.path.join(output_base, "forum", slug)
    os.makedirs(forum_dir, exist_ok=True)
    forum_path = os.path.join(forum_dir, "index.html")

    # Generate timestamps
    published_dt = article.get("timestamp")
    if isinstance(published_dt, datetime):
        iso_published = iso_timestamp(published_dt)
        iso_modified = iso_published
    else:
        iso_published = iso_timestamp(get_dutch_now())
        iso_modified = iso_published

    # Meta descriptions
    summary = article.get("summary", "")
    forum_meta_description = f"Discussie over: {esc_title}. Deel je mening en lees reacties van andere gebruikers op DigestPaper.com."
    forum_url = f"{BASE_URL}/forum/{slug}"

    # Read header and footer files
    header_content = ""
    footer_content = ""

    try:
        with open("header.html", "r", encoding="utf-8") as f:
            header_content = f.read()
    except FileNotFoundError:
        print("Warning: header.html not found, using basic header")
        header_content = """<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-header" role="banner">
  <div class="logo-container">
    <img src="https://digestpaper.com/logo.png" alt="DigestPaper.com logo" width="48" height="48" loading="eager">
    <a href="/" title="DigestPaper.com">DigestPaper.com</a>
  </div>
</header>"""

    try:
        with open("footer.html", "r", encoding="utf-8") as f:
            footer_content = f.read()
    except FileNotFoundError:
        print("Warning: footer.html not found, using basic footer")
        footer_content = """<footer class="site-footer">
  <p>&copy; 2025 DigestPaper.com. Alle rechten voorbehouden.</p>
</footer>
</body>
</html>"""

    # Update header meta tags for this specific forum page
    updated_header = header_content
    if "<title>" in updated_header:
        updated_header = updated_header.replace(
            "<title>DigestPaper.com | Nieuws, Forum & Discussies - Politie & Veiligheid</title>",
            f"<title>Discussie: {esc_title} | DigestPaper.com</title>"
        )
    if 'name="description"' in updated_header:
        updated_header = updated_header.replace(
            'content="Actueel nieuws, forum en analyses over politie en veiligheid in Nederland. Word lid en discussieer mee op DigestPaper.com."',
            f'content="{html_escape(forum_meta_description)}"'
        )
    if 'property="og:title"' in updated_header:
        updated_header = updated_header.replace(
            'content="DigestPaper.com | Nieuws, Forum & Discussies - Politie & Veiligheid"',
            f'content="Discussie: {esc_title} | DigestPaper.com"'
        )
    if 'property="og:url"' in updated_header:
        updated_header = updated_header.replace(
            'content="https://digestpaper.com/"',
            f'content="{forum_url}"'
        )
    if 'rel="canonical"' in updated_header:
        updated_header = updated_header.replace(
            'href="https://digestpaper.com/"',
            f'href="{forum_url}"'
        )

    # Generate the forum page content
    forum_content = f"""
  <main id="main" class="main-content forum-page">
    <article class="forum-article" itemscope itemtype="https://schema.org/DiscussionForumPosting">
      <header class="forum-header">
        <nav aria-label="Breadcrumbs" class="breadcrumbs">
          <ol>
            <li><a href="/">Home</a></li>
            <li><a href="/forum">Forum</a></li>
            <li aria-current="page">{esc_title}</li>
          </ol>
        </nav>

        <h1 itemprop="headline">Discussie: {esc_title}</h1>
        <div class="forum-meta">
          <span>Gestart op <time datetime="{iso_published}" itemprop="dateCreated">{published_dt.strftime('%d %B %Y') if isinstance(published_dt, datetime) else 'Onbekend'}</time></span>
          <span id="replyCount" aria-live="polite">0 reacties</span>
        </div>
      </header>

      <div class="forum-intro" itemprop="articleBody">
        <p>Discussie over het artikel: <strong>{esc_title}</strong></p>
        <p><a href="{canonical}" class="btn btn-primary">Lees het volledige artikel</a></p>
        <meta itemprop="discussionUrl" content="{forum_url}">
      </div>

      <div class="forum-controls">
        <label for="sort">Sorteren:</label>
        <select id="sort">
          <option value="newest">Nieuwste eerst</option>
          <option value="oldest">Oudste eerst</option>
          <option value="top">Meeste stemmen</option>
        </select>
      </div>

      <section id="replies" aria-label="Reacties" class="forum-replies">
        <p>Nog geen reacties geplaatst. <a href="{canonical}#discuss">Start de discussie op de artikelpagina</a>.</p>
      </section>

      <section id="reply-form" aria-label="Plaats een reactie" class="forum-reply-form">
        <h2>Plaats een reactie</h2>
        <p><a href="{canonical}#discuss" class="btn btn-primary">Ga naar artikelpagina om te reageren</a></p>
      </section>
    </article>
  </main>

  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "DiscussionForumPosting",
        "@id": "{forum_url}#forum",
        "url": "{forum_url}",
        "headline": "Discussie: {esc_title}",
        "dateCreated": "{iso_published}",
        "dateModified": "{iso_modified}",
        "inLanguage": "nl-NL",
        "isPartOf": {{ "@id": "https://digestpaper.com/#website" }},
        "mainEntity": {{
          "@type": "WebPage",
          "@id": "{forum_url}#webpage",
          "url": "{forum_url}",
          "name": "Discussie: {esc_title}",
          "isPartOf": {{ "@id": "https://digestpaper.com/#website" }}
        }},
        "commentCount": 0,
        "interactionStatistic": [
          {{
            "@type": "InteractionCounter",
            "interactionType": {{ "@type": "CommentAction" }},
            "userInteractionCount": 0
          }}
        ]
      }},
      {{
        "@type": "BreadcrumbList",
        "@id": "{forum_url}#breadcrumb",
        "itemListElement": [
          {{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://digestpaper.com/" }},
          {{ "@type": "ListItem", "position": 2, "name": "Forum", "item": "https://digestpaper.com/forum" }},
          {{ "@type": "ListItem", "position": 3, "name": "{esc_title}", "item": "{forum_url}" }}
        ]
      }}
    ]
  }}
  </script>
"""

    # Combine header + content + footer
    full_html = updated_header + forum_content + footer_content

    # Write the forum page
    with open(forum_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    return forum_path

# ---------------------------
# UGC Content Sanitization
# ---------------------------

def sanitize_ugc_content(content: str) -> str:
    """
    Sanitize user-generated content for safety and SEO.
    Adds proper rel attributes to external links.
    """
    import re

    # Pattern to find links in HTML content
    link_pattern = r'<a\s+([^>]*?)href=["\']([^"\']*?)["\']([^>]*?)>(.*?)</a>'

    def process_link(match):
        pre_attrs = match.group(1)
        url = match.group(2)
        post_attrs = match.group(3)
        link_text = match.group(4)

        # Check if it's an external link
        if url.startswith('http') and not url.startswith(BASE_URL):
            # Add UGC attributes for external links
            rel_attrs = 'rel="ugc nofollow noopener noreferrer"'
            target_attr = 'target="_blank"'

            # Clean existing rel and target attributes
            pre_attrs = re.sub(r'\s*rel=["\'][^"\']*["\']', '', pre_attrs)
            post_attrs = re.sub(r'\s*rel=["\'][^"\']*["\']', '', post_attrs)
            pre_attrs = re.sub(r'\s*target=["\'][^"\']*["\']', '', pre_attrs)
            post_attrs = re.sub(r'\s*target=["\'][^"\']*["\']', '', post_attrs)

            return f'<a {pre_attrs.strip()} href="{url}" {rel_attrs} {target_attr}{post_attrs}>{link_text}</a>'
        else:
            # Internal links - keep as is but ensure proper spacing
            return f'<a {pre_attrs.strip()} href="{url}"{post_attrs}>{link_text}</a>'

    # Apply link processing
    sanitized = re.sub(link_pattern, process_link, content, flags=re.IGNORECASE | re.DOTALL)

    return sanitized

# ---------------------------
# Google News sitemap
# ---------------------------

    # Generate timestamps
    published_dt = article.get("timestamp")
    if isinstance(published_dt, datetime):
        iso_published = iso_timestamp(published_dt)
        iso_modified = iso_published
    else:
        iso_published = iso_timestamp(get_dutch_now())
        iso_modified = iso_published

    # Meta descriptions - Complete descriptions for SEO consistency
    full_text = article.get("full_text", "")
    summary = article.get("summary", "")
    desc_text = full_text if full_text else summary

    # Get complete description with fallback to title
    if desc_text:
        base_description = get_first_sentence_description(desc_text)
        # Ensure we have enough content for a meaningful description
        if len(base_description) < 50:
            # Try to get more context from the text
            sentences = desc_text.split('. ')
            if len(sentences) > 1:
                base_description = f"{sentences[0]}. {sentences[1]}"
            else:
                base_description = desc_text[:150].strip()
    else:
        base_description = title

    # Create consistent descriptions for all meta tags
    forum_meta_description = html_escape(f"Discussie over: {base_description}")

    # Keep under 200 chars but ensure complete sentences
    if len(forum_meta_description) > 200:
        # Try to truncate at sentence boundary
        if '. ' in forum_meta_description:
            sentences = forum_meta_description.split('. ')
            truncated = sentences[0] + '.'
            if len(truncated) <= 200:
                forum_social_description = truncated
            else:
                # Fallback to word boundary
                truncated = forum_meta_description[:197].rsplit(' ', 1)[0]
                forum_social_description = f"{truncated}..."
        else:
            # Fallback to word boundary
            truncated = forum_meta_description[:197].rsplit(' ', 1)[0]
            forum_social_description = f"{truncated}..."
    else:
        forum_social_description = forum_meta_description

    # Social images
    og_image = article.get("image_url") or f"{BASE_URL}/social/picture-article-digestpaper.png"
    twitter_image = f"{BASE_URL}/social/twitter-1024x512.png"

    # Forum URL
    forum_url = f"{BASE_URL}/forum/{slug}"

    with open(forum_path, "w", encoding="utf-8") as f:
        f.write(f"""<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title>Discussie: {esc_title} | DigestPaper.com</title>
  <meta name="description" content="{forum_meta_description}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="referrer" content="strict-origin-when-cross-origin">

  <!-- Canonical URL -->
  <link rel="canonical" href="{forum_url}">

  <!-- Alternates -->
  <link rel="alternate" href="{forum_url}" hreflang="nl-NL">
  <link rel="alternate" href="{forum_url}" hreflang="x-default">
  <link rel="alternate" type="application/rss+xml" title="Reacties op deze thread" href="{BASE_URL}/forum/{slug}.xml">

  <!-- Basic Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="DigestPaper.com">
  <meta property="og:title" content="Discussie: {esc_title}">
  <meta property="og:description" content="{forum_social_description}">
  <meta property="og:url" content="{forum_url}">
  <meta property="og:image" content="{og_image}">
  <meta property="og:image:alt" content="Discussie over: {esc_title}">
  <meta property="og:image:secure_url" content="{og_image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:see_also" content="{canonical}">
  <meta property="og:updated_time" content="{iso_modified}">
  <meta property="article:published_time" content="{iso_published}">
  <meta property="article:modified_time" content="{iso_modified}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@digestpaper_nl">
  <meta name="twitter:creator" content="@digestpaper_nl">
  <meta name="twitter:title" content="Discussie: {esc_title}">
  <meta name="twitter:description" content="{forum_social_description}">
  <meta name="twitter:image" content="{og_image}">
  <meta name="twitter:image:alt" content="Discussie over: {esc_title}">

  <!-- JSON-LD (Static) -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "Organization",
        "@id": "{BASE_URL}#org",
        "name": "DigestPaper.com",
        "url": "{BASE_URL}",
        "logo": {{
          "@type": "ImageObject",
          "url": "{BASE_URL}/favicon/favicon-192x192.png",
          "width": 192,
          "height": 192
        }},
        "sameAs": [
          "https://www.linkedin.com/in/cybersecurityad",
          "https://x.com/digestpaper"
        ]
      }},
      {{
        "@type": "WebSite",
        "@id": "{BASE_URL}#website",
        "url": "{BASE_URL}",
        "name": "DigestPaper.com",
        "publisher": {{ "@id": "{BASE_URL}#org" }},
        "potentialAction": {{
          "@type": "SearchAction",
          "target": "{BASE_URL}/search?q={{search_term_string}}",
          "query-input": "required name=search_term_string"
        }}
      }},
      {{
        "@type": "CollectionPage",
        "@id": "{BASE_URL}/forum#collection",
        "url": "{BASE_URL}/forum",
        "name": "Forum - DigestPaper.com",
        "description": "Discussieforum voor politienieuws en veiligheidsonderwerpen in Nederland",
        "isPartOf": {{ "@id": "{BASE_URL}#website" }},
        "mainEntity": {{
          "@type": "ItemList",
          "name": "Forum threads",
          "description": "Discussies over politienieuws"
        }}
      }},
      {{
        "@type": "WebPage",
        "@id": "{forum_url}#webpage",
        "url": "{forum_url}",
        "name": "Discussie: {esc_title}",
        "isPartOf": {{ "@id": "{BASE_URL}#website" }},
        "breadcrumb": {{ "@id": "{forum_url}#breadcrumbs" }},
        "inLanguage": "nl-NL",
        "primaryImageOfPage": {{
          "@type": "ImageObject",
          "url": "{og_image}",
          "width": 1200,
          "height": 630
        }}
      }},
      {{
        "@type": "DiscussionForumPosting",
        "@id": "{forum_url}#forum",
        "url": "{forum_url}",
        "mainEntityOfPage": {{ "@id": "{forum_url}#webpage" }},
        "isPartOf": {{ "@id": "{BASE_URL}/forum#collection" }},
        "discussionUrl": "{forum_url}",
        "headline": "Discussie: {esc_title}",
        "about": {{ "@id": "{canonical}#news" }},
        "author": {{ "@id": "{BASE_URL}#org" }},
        "publisher": {{ "@id": "{BASE_URL}#org" }},
        "datePublished": "{iso_published}",
        "dateModified": "{iso_modified}",
        "inLanguage": "nl-NL",
        "commentCount": 0,
        "interactionStatistic": [{{
          "@type": "InteractionCounter",
          "interactionType": {{ "@type": "CommentAction" }},
          "userInteractionCount": 0
        }}]
      }},
      {{
        "@type": "BreadcrumbList",
        "@id": "{forum_url}#breadcrumbs",
        "itemListElement": [
          {{ "@type": "ListItem", "position": 1, "name": "Home", "item": "{BASE_URL}/" }},
          {{ "@type": "ListItem", "position": 2, "name": "Forum", "item": "{BASE_URL}/forum" }},
          {{ "@type": "ListItem", "position": 3, "name": "{esc_title}", "item": "{forum_url}" }}
        ]
      }}
    ]
  }}
  </script>

  <!-- PWA / Icons -->
  <link rel="manifest" href="/site.webmanifest">
  <link rel="icon" href="/favicon/favicon.ico">
  <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon/favicon-48x48.png">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon/favicon-96x96.png">
  <link rel="icon" type="image/png" sizes="128x128" href="/favicon/favicon-128x128.png">
  <link rel="icon" type="image/png" sizes="180x180" href="/favicon/favicon-180x180.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon/favicon-192x192.png">
  <link rel="icon" type="image/png" sizes="256x256" href="/favicon/favicon-256x256.png">
  <link rel="icon" type="image/png" sizes="384x384" href="/favicon/favicon-384x384.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/favicon/favicon-512x512.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
  <link rel="mask-icon" href="/favicon/safari-pinned-tab.svg" color="#0f172a">
  <meta name="theme-color" content="#0f172a">
  <meta name="msapplication-TileColor" content="#0f172a">
  <meta name="msapplication-TileImage" content="/favicon/favicon-144x144.png">
  <meta name="msapplication-config" content="/browserconfig.xml">

  <!-- Font Awesome CSS -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <a class="skip-link" href="#main"
     onfocus="this.style.top='11px'" onblur="this.style.top='-40px'">Direct naar inhoud</a>

  <header class="site-header" role="banner">
    <div class="logo-container">
      <img src="https://digestpaper.com/logo.png" alt="DigestPaper.com logo" width="48" height="48" loading="eager">
      <a href="/" title="DigestPaper.com - Home - Laatste politienieuws en veiligheidsforum Nederland">DigestPaper.com</a>
    </div>
    <nav class="nav-links" id="navLinks" role="navigation" aria-label="Hoofdnavigatie">
      <a href="/" title="Naar de homepagina"><i class="fas fa-home" aria-hidden="true"></i> Home</a>
      <a href="/search" title="Zoek in politieberichten"><i class="fas fa-search" aria-hidden="true"></i> Zoeken</a>
      <a href="/categories" title="Bekijk alle categorieën"><i class="fas fa-list" aria-hidden="true"></i> Categorieën</a>
      <a href="/forum" class="active" aria-current="page" title="Bekijk het forum"><i class="fas fa-comments" aria-hidden="true"></i> Forum</a>
      <a href="/opsporingen" title="Actuele opsporingen"><i class="fas fa-exclamation-triangle" aria-hidden="true"></i> Opsporingen</a>
      <a href="/contact" title="Neem contact met ons op"><i class="fas fa-envelope" aria-hidden="true"></i> Contact</a>
      <a href="/admin" title="Admin Panel"><i class="fas fa-cog" aria-hidden="true"></i> Admin</a>
      <button id="darkModeToggle" class="dark-mode-toggle" aria-label="Donkere modus schakelen">
        <i class="fas fa-moon" aria-hidden="true" id="darkModeIcon"></i>
        <span id="darkModeText">Licht</span>
      </button>
    </nav>
    <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Menu openen" aria-expanded="false">
      <i class="fas fa-bars" aria-hidden="true"></i>
    </button>
  </header>

  <main id="main" class="forum-container" role="main">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a> / <a href="/forum">Forum</a> /
      <span aria-current="page">{esc_title}</span>
    </nav>

    <article class="forum-thread" itemscope itemtype="https://schema.org/DiscussionForumPosting">
      <h1 class="forum-title" itemprop="headline">Discussie: {esc_title}</h1>

      <p class="forum-origin">
        Bespreek dit nieuws:
        <a href="{canonical}">
          {esc_title}
        </a>
      </p>

      <div class="forum-intro" itemprop="articleBody">
        <p>Discussie over het artikel: <strong>{esc_title}</strong></p>
        <meta itemprop="discussionUrl" content="{forum_url}">
      </div>

      <div class="forum-meta">
        <span id="replyCount" aria-live="polite">0 reacties</span>
        <label for="sort">Sorteren:</label>
        <select id="sort">
          <option value="newest">Nieuwste eerst</option>
          <option value="oldest">Oudste eerst</option>
          <option value="top">Meeste stemmen</option>
        </select>
      </div>

      <section id="replies" aria-label="Reacties">
        <p>Nog geen reacties geplaatst. <a href="{canonical}#discuss">Start de discussie op de artikelpagina</a>.</p>
      </section>

      <!-- Pagination (for future use when implementing comment pagination) -->
      <nav class="pagination hidden" aria-label="Paginering reacties">
        <a href="#" rel="prev" class="pagination-link pagination-prev" aria-label="Vorige pagina">
          <i class="fas fa-chevron-left" aria-hidden="true"></i> Vorige
        </a>
        <span class="pagination-info">Pagina <span id="currentPage">1</span> van <span id="totalPages">1</span></span>
        <a href="#" rel="next" class="pagination-link pagination-next" aria-label="Volgende pagina">
          Volgende <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </a>
      </nav>

      <section id="reply-form" aria-label="Plaats een reactie">
        <h2>Plaats een reactie</h2>
        <p><a href="{canonical}#discuss" class="btn btn-primary">Ga naar artikelpagina om te reageren</a></p>
      </section>
    </article>
  </main>

  <!-- App JS -->
  <script type="module" src="/js/app.js"></script>

<!-- Global Footer -->
  <footer class="site-footer" role="contentinfo">
    <div class="footer-container">
      <div class="footer-section">
        <h2>Over DigestPaper.com</h2>
        <p>DigestPaper.com biedt het laatste politienieuws uit Nederland. Wij bundelen berichten van politiekorpsen door het hele land om u te informeren over veiligheid, misdaad en opsporingsactiviteiten in uw buurt.</p>
        <div class="footer-social">
          <a href="#" title="Volg ons op Facebook" aria-label="Facebook" rel="nofollow noopener noreferrer"><i class="fab fa-facebook-f" aria-hidden="true"></i></a>
          <a href="#" title="Volg ons op Twitter" aria-label="Twitter" rel="nofollow noopener noreferrer"><i class="fab fa-twitter" aria-hidden="true"></i></a>
          <a href="#" title="Volg ons op Instagram" aria-label="Instagram" rel="nofollow noopener noreferrer"><i class="fab fa-instagram" aria-hidden="true"></i></a>
          <a href="#" title="Volg ons op LinkedIn" aria-label="LinkedIn" rel="nofollow noopener noreferrer"><i class="fab fa-linkedin-in" aria-hidden="true"></i></a>
        </div>
      </div>
      <div class="footer-section">
        <h2>Navigatie</h2>
        <ul class="footer-links">
          <li><a href="/" title="Naar de homepagina">Home</a></li>
          <li><a href="/categories" title="Bekijk alle categorieën">Categorieën</a></li>
          <li><a href="/forum" title="Bekijk het forum">Forum</a></li>
          <li><a href="/opsporingen" title="Actuele opsporingen">Opsporingen</a></li>
          <li><a href="/vermissingen" title="Vermiste personen">Vermissingen</a></li>
          <li><a href="/tips" title="Tips over veiligheid">Veiligheidstips</a></li>
          <li><a href="/contact" title="Neem contact met ons op">Contact</a></li>
          <li><a href="/admin" title="Admin Panel">Admin</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h2>Juridisch</h2>
        <ul class="footer-links">
          <li><a href="/privacy-policy" title="Lees ons privacybeleid">Privacybeleid</a></li>
          <li><a href="/cookie-policy" title="Lees ons cookiebeleid">Cookiebeleid</a></li>
          <li><a href="/terms-of-service" title="Lees onze gebruiksvoorwaarden">Gebruiksvoorwaarden</a></li>
          <li><a href="/forum-rules" title="Lees onze forumregels">Forumregels</a></li>
          <li><a href="/disclaimer" title="Lees onze disclaimer">Disclaimer</a></li>
          <li><a href="/accessibility" title="Toegankelijkheidsverklaring">Toegankelijkheid</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 DigestPaper.com - Alle rechten voorbehouden |
      <a href="https://digestpaper.com" rel="noopener" title="Officiële website">Geen officiële website van de Nederlandse Politie</a> |
      <a href="https://www.politie.nl" rel="noopener noreferrer nofollow" title="Officiële Politie Website">Bezoek de officiële website</a>
      </p>
    </div>
  </footer>

  <!-- Consent (default) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{ dataLayer.push(arguments); }}
    gtag('consent','default',{{
      ad_user_data:'granted',
      ad_personalization:'granted',
      ad_storage:'granted',
      analytics_storage:'granted',
      functionality_storage:'granted',
      personalization_storage:'granted',
      security_storage:'granted'
    }});
  </script>
  <!-- GA -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-BKYZZK6D07"></script>
  <script src="/js/consent.js" defer></script>
  <script>
    gtag('js', new Date());
    gtag('config', 'G-BKYZZK6D07', {{
      send_page_view: true,
      anonymize_ip: false,
      allow_google_signals: true,
      allow_ad_personalization_signals: true
    }});
  </script>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"></noscript>

  <!-- Firestore comment counter + JSON-LD updater -->
  <script type="module">
    import {{ initializeApp, getApps }} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
    import {{ getFirestore, collection, query, where, getCountFromServer }} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

    // TODO: vervang door je echte config
    const firebaseConfig = {{
        apiKey: "AIzaSyDCRYKrWUvtOtDAY4TThjlm7AxkzHG-62s",
        authDomain: "blockchainkix-com-fy.firebaseapp.com",
        databaseURL: "https://blockchainkix-com-fy-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "blockchainkix-com-fy",
        storageBucket: "blockchainkix-com-fy.firebasestorage.app",
        messagingSenderId: "148890561425",
        appId: "1:148890561425:web:7cba0e7477141e3a880830"
    }};

    // Initialize Firebase only if not already initialized
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db  = getFirestore(app);

    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const match = canonical.match(/\\/forum\\/([^\\/#?]+)/i);
    const SLUG = match ? decodeURIComponent(match[1]) : '';

    async function fetchCommentCount(slug){{
      try{{
        const baseQ = query(
          collection(db, "comments"),
          where("articleSlug","==", slug),
          where("status","==","public"),
          where("deleted","==", false)
        );
        const snap = await getCountFromServer(baseQ);
        return snap.data().count || 0;
      }}catch(e){{
        console.warn('commentCount error:', e);
        return 0;
      }}
    }}

    function updateJsonLd(count){{
      const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
      for(const s of scripts){{
        let data;
        try {{ data = JSON.parse(s.textContent || '{{}}'); }} catch {{ continue; }}
        // Handle @graph or single node
        if(data['@graph'] && Array.isArray(data['@graph'])){{
          for(const node of data['@graph']){{
            if(node['@type'] === 'DiscussionForumPosting'){{
              node.commentCount = count;
              node.interactionStatistic = [{{
                "@type":"InteractionCounter",
                "interactionType":{{"@type":"CommentAction"}},
                "userInteractionCount": count
              }}];
            }}
          }}
          s.textContent = JSON.stringify(data, null, 2);
        }} else if (data['@type'] === 'DiscussionForumPosting'){{
          data.commentCount = count;
          data.interactionStatistic = [{{
            "@type":"InteractionCounter",
            "interactionType":{{"@type":"CommentAction"}},
            "userInteractionCount": count
          }}];
          s.textContent = JSON.stringify(data, null, 2);
        }}
      }}
    }}

    function updateUi(count){{
      const replyCountEl = document.getElementById('replyCount');
      if(replyCountEl){{
        replyCountEl.textContent = count === 0
          ? 'Nog geen reacties geplaatst.'
          : `${{count}} reactie${{count === 1 ? '' : 's'}}`;
      }}
    }}

    // UGC link sanitization function
    function sanitizeUGCLinks(container) {{
      const links = container.querySelectorAll('a[href^="http"]');
      links.forEach(link => {{
        const url = link.getAttribute('href');
        if (!url.startsWith('{BASE_URL}')) {{
          // External link - add UGC attributes
          link.setAttribute('rel', 'ugc nofollow noopener noreferrer');
          link.setAttribute('target', '_blank');
        }}
      }});
    }}

    // Pagination logic - UI only (SEO via server-side rendering)
    function updatePagination(currentPage, totalPages) {{
      const paginationNav = document.querySelector('.pagination');
      const currentPageEl = document.getElementById('currentPage');
      const totalPagesEl = document.getElementById('totalPages');
      const prevLink = document.querySelector('.pagination-prev');
      const nextLink = document.querySelector('.pagination-next');

      const base = '{forum_url}';

      if (totalPages > 1) {{
        paginationNav.style.display = 'flex';
        currentPageEl.textContent = currentPage;
        totalPagesEl.textContent = totalPages;

        // Update pagination UI links (canonical/prev/next managed server-side for SEO)
        if (currentPage > 1) {{
          const prevHref = currentPage === 2 ? base : `${{base}}?page=${{currentPage - 1}}`;
          prevLink.href = prevHref;
          prevLink.style.visibility = 'visible';
        }} else {{
          prevLink.style.visibility = 'hidden';
        }}

        if (currentPage < totalPages) {{
          const nextHref = `${{base}}?page=${{currentPage + 1}}`;
          nextLink.href = nextHref;
          nextLink.style.visibility = 'visible';
        }} else {{
          nextLink.style.visibility = 'hidden';
        }}
      }} else {{
        paginationNav.style.display = 'none';
      }}
    }}

    (async () => {{
      if(!SLUG) return;
      const count = await fetchCommentCount(SLUG);
      updateJsonLd(count);
      updateUi(count);

      // Initialize pagination (currentPage = 1, totalPages based on comment count)
      const commentsPerPage = 20; // Future configuration
      const totalPages = Math.max(1, Math.ceil(count / commentsPerPage));
      const urlParams = new URLSearchParams(window.location.search);
      const currentPage = parseInt(urlParams.get('page')) || 1;
      updatePagination(currentPage, totalPages);

      // Sanitize any existing UGC content
      const repliesSection = document.getElementById('replies');
      if (repliesSection) {{
        sanitizeUGCLinks(repliesSection);
      }}
    }})();
  </script>
</body>
</html>""")

    return forum_path


# ---------------------------
# Advanced Sitemap Generation & Content Enhancement
# ---------------------------

def generate_comprehensive_sitemaps(processed_articles: List[Dict[str, Any]], output_base: str) -> Dict[str, str]:
    """
    Generate separate sitemaps for news articles and forum pages for better SEO organization.
    Returns paths to generated sitemap files.
    """
    from xml.sax.saxutils import escape as xml_escape

    sitemap_dir = os.path.join(output_base, "sitemaps")
    os.makedirs(sitemap_dir, exist_ok=True)

    # Current timestamp for lastmod
    now_iso = get_dutch_now().isoformat()

    # Generate news sitemap (articles only)
    news_entries = []
    forum_entries = []

    for article in processed_articles:
        urls = article.get("urls", {})
        canonical = urls.get("canonical", "")
        forum_url = urls.get("forum", "")

        # Get publication date
        pub_dt = article.get("timestamp")
        if isinstance(pub_dt, datetime):
            lastmod = iso_timestamp(pub_dt)
        else:
            lastmod = now_iso

        # News article entry
        if canonical:
            title = xml_escape(article.get("title", ""))
            category = xml_escape(article.get("category", "Nieuws"))

            news_entries.append(f"""  <url>
    <loc>{xml_escape(canonical)}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <news:news>
      <news:publication>
        <news:name>DigestPaper.com</news:name>
        <news:language>nl</news:language>
      </news:publication>
      <news:publication_date>{lastmod}</news:publication_date>
      <news:title>{title}</news:title>
      <news:keywords>{xml_escape(', '.join(article.get('tags', [])))}</news:keywords>
    </news:news>
  </url>""")

        # Forum page entry
        if forum_url:
            forum_entries.append(f"""  <url>
    <loc>{xml_escape(forum_url)}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>""")

    # Write news sitemap
    news_sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
{chr(10).join(news_entries)}
</urlset>"""

    news_sitemap_path = os.path.join(sitemap_dir, "news.xml")
    with open(news_sitemap_path, "w", encoding="utf-8") as f:
        f.write(news_sitemap_content)

    # Write forum sitemap
    forum_sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(forum_entries)}
</urlset>"""

    forum_sitemap_path = os.path.join(sitemap_dir, "forum.xml")
    with open(forum_sitemap_path, "w", encoding="utf-8") as f:
        f.write(forum_sitemap_content)

    # Generate master sitemap index
    master_sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>{BASE_URL}/sitemaps/news.xml</loc>
    <lastmod>{now_iso}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{BASE_URL}/sitemaps/forum.xml</loc>
    <lastmod>{now_iso}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{BASE_URL}/sitemaps/main.xml</loc>
    <lastmod>{now_iso}</lastmod>
  </sitemap>
</sitemapindex>"""

    master_sitemap_path = os.path.join(output_base, "sitemap.xml")
    with open(master_sitemap_path, "w", encoding="utf-8") as f:
        f.write(master_sitemap_content)

    print(f"✅ Generated news sitemap: {news_sitemap_path}")
    print(f"✅ Generated forum sitemap: {forum_sitemap_path}")
    print(f"✅ Generated master sitemap: {master_sitemap_path}")

    return {
        "news": news_sitemap_path,
        "forum": forum_sitemap_path,
        "master": master_sitemap_path
    }

def generate_forum_synopsis(article: Dict[str, Any]) -> str:
    """
    Generate a synopsis paragraph for forum pages introducing the discussion topic.
    """
    title = article.get("title", "")
    category = article.get("category", "Nieuws")
    summary = article.get("summary", "")

    if _ai_client is None:
        # Fallback synopsis
        return f"Dit is het debat rond het nieuwsartikel over {title.lower()}. " \
               f"Deel uw mening over deze {category.lower()} en lees wat andere gebruikers ervan vinden."

    try:
        prompt = f"""Schrijf een korte inleidende paragraaf (50-80 woorden) voor een forumthread over dit nieuwsartikel.
Nodig gebruikers uit om deel te nemen aan de discussie.

Titel: {title}
Categorie: {category}
Samenvatting: {summary[:200]}

Maak het uitnodigend en informatief."""

        synopsis = generate_text(prompt, style="Normal", language="Dutch", max_tokens=100)

        if synopsis and len(synopsis) > 30:
            return synopsis.strip()
    except Exception as e:
        print(f"Error generating synopsis: {e}")

    # Fallback
    return f"Dit is het debat rond het nieuwsartikel '{title}'. " \
           f"Deel uw mening over deze {category.lower()} en lees reacties van andere gebruikers."


# ---------------------------
# Google News sitemap (Original)
# ---------------------------

def write_news_sitemap_fn(processed: List[Dict[str, Any]], output_base: str) -> Optional[str]:
    """
    Writes a Google News sitemap for the current batch.
    Only includes items with a timestamp in the last 48 hours (typical News window).
    """
    if not processed:
        return None

    from xml.sax.saxutils import escape as xml_escape

    cutoff = get_dutch_now().timestamp() - 48 * 3600
    items = []
    for art in processed:
        ts = art.get("timestamp")
        ts_iso = iso_timestamp(ts) if isinstance(ts, datetime) else iso_timestamp(get_dutch_now())
        if isinstance(ts, datetime) and ts.timestamp() < cutoff:
            continue
        url = art["urls"]["canonical"]
        title = xml_escape(art.get("title", ""))
        publication_name = "DigestPaper.com"
        lang = "nl"
        item = f"""
  <url>
    <loc>{xml_escape(url)}</loc>
    <news:news>
      <news:publication>
        <news:name>{xml_escape(publication_name)}</news:name>
        <news:language>{lang}</news:language>
      </news:publication>
      <news:publication_date>{ts_iso}</news:publication_date>
      <news:title>{title}</news:title>
    </news:news>
  </url>"""
        items.append(item)

    if not items:
        return None

    ts_stamp = get_dutch_now().strftime("%Y%m%d-%H%M%S")
    sitemap_dir = os.path.join(output_base, SITEMAP_DIR_REL)
    os.makedirs(sitemap_dir, exist_ok=True)
    sitemap_path = os.path.join(sitemap_dir, f"news-{ts_stamp}.xml")

    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
{''.join(items)}
</urlset>"""

    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

    print(f"📰 Google News sitemap: {sitemap_path}")
    print(f"➡️  Submit in Search Console: {BASE_URL}/{SITEMAP_DIR_REL}/{os.path.basename(sitemap_path)}")
    return sitemap_path

def copy_headers_file(output_base_dir: str) -> None:
    """Copy _headers file to public directory for Firebase Hosting"""
    import shutil

    script_dir = os.path.dirname(os.path.abspath(__file__))
    headers_source = os.path.join(script_dir, "_headers")
    headers_dest = os.path.join(output_base_dir, "_headers")

    if os.path.exists(headers_source):
        try:
            shutil.copy2(headers_source, headers_dest)
            print(f"✅ Copied _headers file to {headers_dest}")
        except Exception as e:
            print(f"⚠️ Failed to copy _headers file: {e}")
    else:
        print(f"⚠️ _headers file not found at {headers_source}")

# ---------------------------
# Batch pipeline
# ---------------------------

def process_batch(
    db,
    limit: int,
    sleep_s: int,
    style: str,
    language: str,
    dest_collection: str,
    source_collection: str,
    dry_run: bool,
    output_base_dir: str,
    write_news_sitemap: bool,
) -> None:
    global _ai_client, _ai_model, _client_type

    # init AI client (if key is absent, runs no-AI fallback)
    _ai_client, _ai_model, _client_type = get_ai_client()

    print(f"\n🚀 Advanced Rewriter starting")
    print(f"   Source: {source_collection} → Dest: {dest_collection}")
    print(f"   Style: {style} | Language: {language} | Model: {MODEL_NAME if _ai_model else 'NO-AI'}")
    print(f"   Limit: {'all' if limit is None else limit} | Sleep: {sleep_s}s | Dry-run: {dry_run}")
    print(f"   Output base: {output_base_dir}")

    # Copy _headers file for Firebase Hosting
    copy_headers_file(output_base_dir)

    # Fetch unprocessed documents
    docs = []
    try:
        query = db.collection(source_collection).where("processed", "==", False)
        if limit is not None:
            query = query.limit(limit)
        docs = query.get()
    except Exception as e:
        print(f"⚠️ Query by processed failed ({e}), falling back to full scan...")
        all_docs = db.collection(source_collection).get()
        for d in all_docs:
            data = d.to_dict()
            if not data.get("processed"):
                docs.append(d)
            if limit is not None and len(docs) >= limit:
                break

    print(f"🧾 Found {len(docs)} unprocessed article(s)")

    processed_count = 0
    error_count = 0
    processed_payloads: List[Dict[str, Any]] = []

    for idx, doc in enumerate(docs, start=1):
        data = doc.to_dict() or {}
        link = data.get("link", "")
        title = data.get("title", "")

        print(f"\n[{idx}/{len(docs)}] {title[:80]}")

        try:
            rewritten = rewrite_article(data, style=style, language=language)

            if dry_run:
                print("🧪 Dry-run: not writing to Firestore/static")
            else:
                # Save to destination
                dest_ref = db.collection(dest_collection).document()
                dest_ref.set(rewritten)
                print(f"✅ Saved rewritten article → {dest_ref.id}")

                # Mark source processed
                db.collection(source_collection).document(doc.id).update({"processed": True})
                print("✅ Marked original as processed")

                # ALWAYS write static/AMP/forum/API
                write_static_article(rewritten, output_base_dir)

            processed_count += 1
            processed_payloads.append(rewritten)

        except Exception as e:
            print(f"❌ Error processing article: {e}")
            error_count += 1

        if idx < len(docs) and sleep_s > 0:
            print(f"⏳ Sleeping {sleep_s}s...")
            time.sleep(sleep_s)

    # Comprehensive sitemap generation for this batch
    if not dry_run and write_news_sitemap:
        try:
            # Generate comprehensive sitemaps (news, forum, master)
            sitemap_paths = generate_comprehensive_sitemaps(processed_payloads, output_base_dir)
            print(f"📊 Sitemap URLs for Google Search Console:")
            print(f"   📰 News: {BASE_URL}/sitemaps/news.xml")
            print(f"   💬 Forum: {BASE_URL}/sitemaps/forum.xml")
            print(f"   🗺️ Master: {BASE_URL}/sitemap.xml")

            # Also generate the original single news sitemap for backwards compatibility
            write_news_sitemap_fn(processed_payloads, output_base_dir)
        except Exception as e:
            print(f"⚠️ Could not write comprehensive sitemaps: {e}")

    print("\n📊 Summary")
    print(f"   ✅ Rewritten & saved: {processed_count}")
    print(f"   ❌ Errors: {error_count}")
    print(f"   📈 Total handled: {processed_count + error_count}")
    print("\n🎯 SEO Assets Generated:")
    print(f"   📄 Article pages: {processed_count}")
    print(f"   ⚡ AMP pages: {processed_count}")
    print(f"   💬 Forum alias pages: {processed_count}")
    print(f"   📡 RSS feeds: {processed_count}")
    print(f"   🔗 API endpoints: {processed_count}")
    print("\n📈 SEO Features:")
    print("   ✅ Distinct meta titles & descriptions for forum pages")
    print("   ✅ Q&A extraction for FAQPage structured data")
    print("   ✅ Long-tail keyword optimization")
    print("   ✅ Cross-linking between articles and forum pages")
    print("   ✅ Separate news.xml and forum.xml sitemaps")
    print("   ✅ UGC link sanitization with rel='ugc nofollow'")
    print("   ✅ Prerendered comment placeholders for indexability")

# ---------------------------
# Template Loaders
# ---------------------------

def load_template(template_name: str, metadata: Dict[str, Any] = None) -> str:
    """Load and process template files with dynamic metadata"""
    template_path = os.path.join(os.path.dirname(__file__), "..", "templates", template_name)

    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
    except FileNotFoundError:
        print(f"⚠️ Template not found: {template_path}, using fallback")
        return ""

    if metadata:
        # Replace template variables with actual values
        for key, value in metadata.items():
            placeholder = f"{{{{{key}}}}}"
            template_content = template_content.replace(placeholder, str(value))

    return template_content

def generate_header_html(metadata: Dict[str, Any]) -> str:
    """Generate dynamic header HTML with metadata"""
    default_meta = {
        "title": "DigestPaper.com | Nieuws, Forum & Discussies - Politie & Veiligheid",
        "description": "Actueel nieuws, forum en analyses over politie en veiligheid in Nederland. Word lid en discussieer mee op DigestPaper.com.",
        "keywords": "politienieuws, politie forum, opsporingen, misdaad, veiligheid, politieberichten, Nederland",
        "canonical_url": "https://digestpaper.com/",
        "og_type": "website",
        "og_title": "DigestPaper.com | Nieuws, Forum & Discussies - Politie & Veiligheid",
        "og_description": "Actueel nieuws, forum en analyses over politie en veiligheid in Nederland. Word lid en discussieer mee op DigestPaper.com.",
        "og_url": "https://digestpaper.com/",
        "og_image": "https://digestpaper.com/favicon/og-1200x630.jpg",
        "twitter_title": "DigestPaper.com | Nieuws, Forum & Discussies - Politie & Veiligheid",
        "twitter_description": "Actueel politienieuws, forum en analyses over politie en veiligheid in Nederland.",
        "twitter_image": "https://digestpaper.com/favicon/twitter-1200x630.jpg",
        "structured_data": "",
        "extra_css": "",
        "extra_js": ""
    }

    # Merge provided metadata with defaults
    combined_meta = {**default_meta, **metadata}

    # Load template and replace variables
    header_template = load_template("header.html", combined_meta)

    if not header_template:
        # Fallback header if template loading fails
        return f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{combined_meta['title']}</title>
  <meta name="description" content="{combined_meta['description']}">
  <link rel="canonical" href="{combined_meta['canonical_url']}">
  <link rel="stylesheet" href="/css/style.css">
  {combined_meta['extra_css']}
  {combined_meta['structured_data']}
  {combined_meta['extra_js']}
</head>
<body>"""

    return header_template

def generate_footer_html(metadata: Dict[str, Any] = None) -> str:
    """Generate dynamic footer HTML"""
    footer_meta = metadata or {}

    # Load template
    footer_template = load_template("footer.html", footer_meta)

    if not footer_template:
        # Fallback footer with correct JavaScript includes
        return """  <script type="module" src="/js/app.js"></script>
  <script src="/js/category-enhancer.js"></script>
  <script src="/js/svg-icon-enhancer.js"></script>
</body>
</html>"""

    return footer_template

# ---------------------------
# Enhanced Deploy Functionality
# ---------------------------

def deploy_enhanced_seo(
    limit: int = 10,
    sleep_s: int = 1,
    style: str = DEFAULT_STYLE,
    language: str = DEFAULT_LANGUAGE,
    output_base_dir: str = OUTPUT_BASE_DIR_DEFAULT,
    project_id: str = "blockchainkix-com-fy"
) -> bool:
    """Deploy enhanced forum SEO features - integrated version"""
    print("🚀 Deploying Enhanced Forum SEO Features")
    print("=" * 50)

    start_time = time.time()

    try:
        # Initialize Firebase
        print("🔥 Connecting to Firebase...")
        db = ensure_firebase(project_id)
        print("✅ Connected to Firebase Firestore")

        # Generate all content with enhanced SEO features
        print("📰 Processing articles with enhanced SEO...")
        process_batch(
            db=db,
            limit=limit,
            sleep_s=sleep_s,
            style=style,
            language=language,
            dest_collection=DEST_COLLECTION,
            source_collection=SOURCE_COLLECTION,
            dry_run=False,
            output_base_dir=output_base_dir,
            write_news_sitemap=True
        )

        elapsed = time.time() - start_time
        print(f"\n✅ Deployment completed successfully in {elapsed:.2f}s")
        print("\n🎯 Enhanced Features Applied:")
        print("   ✅ Rich forum alias pages with unique meta data")
        print("   ✅ Enhanced JSON-LD structured data (DiscussionForumPosting, FAQPage)")
        print("   ✅ Cross-linking between articles and forum pages")
        print("   ✅ Comprehensive sitemaps (news, forum, master)")
        print("   ✅ FAQ-style Q&A content extraction")
        print("   ✅ Long-tail keyword optimization")
        print("   ✅ Related discussions widget")
        print("   ✅ Forum synopsis generation")
        print("   ✅ Dynamic header/footer templates")

        return True

    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()
        return False

# ---------------------------
# CLI
# ---------------------------

def main():
    parser = argparse.ArgumentParser(description="Advanced rewriter + exporter for DigestPaper.com")
    parser.add_argument("--project-id", default="blockchainkix-com-fy", help="Firebase project ID")
    parser.add_argument("--source", default=SOURCE_COLLECTION, help="Source collection")
    parser.add_argument("--dest", default=DEST_COLLECTION, help="Destination collection")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help="Max docs to process (None = all)")
    parser.add_argument("--sleep", type=int, default=DEFAULT_SLEEP, help="Sleep seconds between docs")
    parser.add_argument("--style", default=DEFAULT_STYLE, choices=["Technical", "Normal", "Easy", "Populair", "News Reader"], help="Writing style")
    parser.add_argument("--language", default=DEFAULT_LANGUAGE, choices=["Dutch", "English", "German"], help="Language for prompts")
    parser.add_argument("--dry-run", action="store_true", help="Process but do not write to Firestore/static")
    parser.add_argument("--output-base", default=OUTPUT_BASE_DIR_DEFAULT, help="Base dir for static export")
    parser.add_argument("--no-news-sitemap", action="store_true", help="Do not write a Google News sitemap for this batch")
    parser.add_argument("--deploy", action="store_true", help="Deploy enhanced SEO features (quick deployment)")
    args = parser.parse_args()

    # Check if deploy mode is requested
    if args.deploy:
        success = deploy_enhanced_seo(
            limit=args.limit or 10,
            sleep_s=args.sleep,
            style=args.style,
            language=args.language,
            output_base_dir=args.output_base,
            project_id=args.project_id
        )
        sys.exit(0 if success else 1)

    # Firebase
    try:
        db = ensure_firebase(args.project_id)
        print("✅ Connected to Firebase Firestore")
    except Exception as e:
        print(f"❌ Firebase init failed: {e}")
        return

    process_batch(
        db=db,
        limit=args.limit,
        sleep_s=args.sleep,
        style=args.style,
        language=args.language,
        dest_collection=args.dest,
        source_collection=args.source,
        dry_run=bool(args.dry_run),
        output_base_dir=args.output_base,
        write_news_sitemap=not args.no_news_sitemap,
    )

if __name__ == "__main__":
    main()
