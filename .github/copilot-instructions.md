# AI Agent Instructions for digestpaper-com

## Project Overview

This is DigestPaper's publisher website (digestpaper.com) - a static site that handles transparency, editorial guidelines, and legal content. The site uses a build process to inject meta tags, generate JSON-LD graphs, and maintain sitemaps.

## Key Architecture Components

### Meta Injection System

- `scripts/build-head.js`: Core build script that injects meta tags, JSON-LD, and generates sitemaps
- `scripts/pages.json`: Central configuration for all pages including metadata, SEO settings, and sitemap priorities
- Meta tags are injected between `<!-- BEGIN HEAD POLICY -->` and `<!-- END HEAD POLICY -->` markers
- JSON-LD graph injection uses `<!-- BEGIN JSON-LD PUBLISHER -->` markers

### Directory Structure

- `/public/`: Production-ready static files (HTML, assets)
- `/scripts/`: Build tooling
- Content pages follow the pattern `/public/{section}/index.html`

## Development Workflows

### Build Process

```bash
# Development with auto-rebuild
npm run watch

# One-time build
npm run build
```

### Deployment

- Uses Firebase Hosting (see `firebase.json` for configuration)
- Aggressive caching for static assets (31536000s/1 year)
- No caching for `index.html`

## Project-Specific Conventions

### SEO & Meta Tags

1. Each page requires metadata in `pages.json`:
   ```json
   {
     "path": "/section/index.html",
     "title": "Page Title",
     "description": "SEO description",
     "keywords": ["keyword1", "keyword2"],
     "canonical": "https://digestpaper.com/section/",
     "language": "nl-NL"
     // See pages.json for full schema
   }
   ```
2. Meta injection is idempotent - safe to run multiple times
3. Priority hierarchy: Home (1.0) > Section Pages (0.8) > Policy Pages (0.6)

### Language & Internationalization

- Default language is Dutch (`nl-NL`)
- Language codes are normalized (e.g., `nl` → `nl-NL`, `en` → `en-US`)
- Locale/language can be specified via `language`, `locale`, or `lang` in page config

### Special Files

- `publisher.json`: Public publisher manifest
- `robots.txt`: Auto-generated if missing
- `sitemap.xml`: Auto-generated from `pages.json` config

## Common Tasks

### Adding a New Page

1. Create HTML file in `/public/{section}/index.html`
2. Add page metadata to `pages.json`
3. Run `npm run build` to inject meta tags
4. Verify sitemap update includes new page

### Updating Meta Tags

1. Modify relevant page entry in `pages.json`
2. Run `npm run build` to update injected tags
3. Check HTML output for correct injection

### JSON-LD Graph

- Home page always includes full graph
- Other pages can opt-in via `jsonldOnPage: true`
- Graph includes Organization, Website, and WebPage nodes

## Integration Points

- Firebase Hosting for deployment
- Automatic cache control headers based on file types
- Meta tags optimized for:
  - Schema.org/JSON-LD
  - Open Graph (Facebook)
  - Twitter Cards
  - Dublin Core
