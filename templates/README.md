# DigestPaper Header Templates

Deze map bevat dynamische header templates voor verschillende paginatypes op DigestPaper.com. Elk template bevat volledig geconfigureerde metadata, JSON-LD structured data, en microdata markup.

## 📁 Template Overzicht

### 1. `header-regular.html`

**Voor**: Homepage, statische pagina's, overzichtspagina's
**Schema.org Types**: NewsMediaOrganization, WebSite, WebPage, BreadcrumbList
**Gebruik**: Algemene pagina's zonder specifieke content-types

### 2. `header-article.html`

**Voor**: Nieuwsartikelen, reportages, analyses, opinies
**Schema.org Types**: NewsMediaOrganization, NewsArticle/Article, Person, WebPage, ImageObject
**Gebruik**: Alle artikel-gerelateerde content

## 🔧 Template Variables

### Basis Configuratie (beide templates)

```yaml
# Pagina basics
title: "Pagina titel"
description: "Meta description (max 160 karakters)"
lang: "nl" # of "en", "de", etc.
author: "Jedi Oldenburger"
canonical_url: "https://digestpaper.com/pagina/"

# SEO & Social Media
og_title: "Open Graph titel"
og_description: "Open Graph beschrijving"
og_image: "https://digestpaper.com/images/og-image.jpg"
twitter_card: "summary_large_image"
keywords: "keyword1, keyword2, keyword3"
robots: "index, follow"

# Schema.org
schema_type: "AboutPage" # WebPage, AboutPage, ContactPage, etc.
body_class: "page-about"
microdata_itemscope: 'itemscope itemtype="https://schema.org/AboutPage"'

# Breadcrumbs
breadcrumb:
  - name: "About"
    url: "/about/"
  - name: "Ownership"
    url: "/about/ownership/"
```

### Artikel-specifieke Variables (`header-article.html`)

```yaml
# Artikel metadata
article_type: "NewsArticle" # NewsArticle, ReportageNewsArticle, OpinionNewsArticle, ReviewNewsArticle
subtitle: "Ondertitel of samenvatting"
category: "Politie" # Sectie/categorie
tags: ["politie", "veiligheid", "amsterdam"]
location: "Amsterdam" # Waar het verhaal zich afspeelt

# Datum management
date_published: "2025-09-18T10:00:00+02:00"
date_modified: "2025-09-18T15:30:00+02:00"
last_reviewed: "2025-09-18T15:30:00+02:00"

# Featured image
featured_image: "https://digestpaper.com/images/article-image.jpg"
featured_image_width: 1200
featured_image_height: 630
featured_image_alt: "Beschrijving van de afbeelding"

# Auteur informatie
author_info:
  name: "Jedi Oldenburger"
  slug: "jedi-oldenburger"
  job_title: "Hoofdredacteur"
  email: "jedi@xcom.dev"
  url: "https://digestpaper.com/about/masthead/jedi-oldenburger"
  bio: "Hoofdredacteur en oprichter van DigestPaper"
  expertise: ["Investigative Journalism", "Media Law", "Cybersecurity"]

# Geolocatie (optioneel)
geo:
  region: "NL-NH"
  placename: "Amsterdam"
  position: "52.3728;4.8936"
  icbm: "52.3728, 4.8936"
  latitude: 52.3728
  longitude: 4.8936

# Bronnen & correcties
sources:
  - name: "Politie Amsterdam"
    url: "https://politie.nl/nieuws/..."
  - name: "Ministerie van Justitie"
    url: "https://rijksoverheid.nl/..."

corrections:
  - text: "Correctie: De datum was 18 september, niet 17 september."
    date: "2025-09-18T16:00:00+02:00"

# Content flags
is_free: true
word_count: 850
```

## 📋 Schema.org Type Mapping

### Artikel Types (`article_type`)

| Type                   | Gebruik               | Voorbeeld                         |
| ---------------------- | --------------------- | --------------------------------- |
| `NewsArticle`          | Standaard nieuws      | Breaking news, dagelijkse updates |
| `ReportageNewsArticle` | Onderzoek & reportage | Diepgaande onderzoeken, dossiers  |
| `OpinionNewsArticle`   | Opinie & analyse      | Columns, expertopinies            |
| `ReviewNewsArticle`    | Reviews & evaluaties  | Beleidsevaluaties, rapporten      |
| `LiveBlogPosting`      | Live berichtgeving    | Live events, persconferenties     |
| `AnalysisNewsArticle`  | Data-analyse          | Statistische analyses, trends     |

### Page Types (`schema_type`)

| Type             | Gebruik            |
| ---------------- | ------------------ |
| `WebPage`        | Standaard pagina   |
| `AboutPage`      | Over-pagina's      |
| `ContactPage`    | Contactinformatie  |
| `CollectionPage` | Overzichtspagina's |
| `ProfilePage`    | Persoonspagina's   |

## 🎯 Best Practices

### SEO Optimalisatie

1. **Title Tags**: 50-60 karakters, includer merk
2. **Meta Descriptions**: 140-160 karakters, call-to-action
3. **Keywords**: Relevant, niet overstuffed
4. **Images**: Altijd alt-text, geoptimaliseerde grootte

### Schema.org Richtlijnen

1. **Specifiek Schema**: Gebruik meest specifieke type
2. **Complete Data**: Vul alle verplichte velden in
3. **Consistentie**: Zelfde data in meta tags en JSON-LD
4. **Validatie**: Test met Google's Rich Results Test

### Content Richtlijnen

1. **Unieke Content**: Elke pagina unieke title/description
2. **Actuele Data**: Update modified dates bij wijzigingen
3. **Correcte Auteurs**: Link naar juiste Person schema
4. **Bronvermelding**: Gebruik citations voor credibiliteit

## 🔗 Template Integratie

### Liquid/Jekyll Gebruik

```liquid
{% assign template = "header-article" %}
{% if page.layout == "article" %}
  {% include "{{template}}.html" %}
{% else %}
  {% include "header-regular.html" %}
{% endif %}
```

### Next.js/React Gebruik

```jsx
import HeaderArticle from "./templates/header-article";
import HeaderRegular from "./templates/header-regular";

export default function Layout({ page, children }) {
  const HeaderComponent =
    page.type === "article" ? HeaderArticle : HeaderRegular;

  return (
    <>
      <HeaderComponent page={page} site={site} />
      {children}
    </>
  );
}
```

## 🚀 Deployment Checklist

- [ ] Template variabelen ingevuld
- [ ] Schema.org type correct
- [ ] Featured image geoptimaliseerd
- [ ] Meta tags compleet
- [ ] Breadcrumbs geconfigureerd
- [ ] Auteur informatie correct
- [ ] JSON-LD gevalideerd
- [ ] Open Graph preview getest

## 📊 Monitoring & Analytics

### Rich Results Monitoring

- Google Search Console
- Rich Results Test Tool
- Schema Markup Validator

### Performance Tracking

- Core Web Vitals
- Social sharing metrics
- Search appearance rates

## 🔄 Template Updates

Bij updates van de templates:

1. **Backward Compatibility**: Behoud bestaande variabelen
2. **Documentation**: Update deze README
3. **Testing**: Test alle paginatypes
4. **Deployment**: Staged rollout via ontwikkel → staging → productie

---

**Laatste Update**: September 2025
**Versie**: 2.0
**Contactpersoon**: DigestPaper Tech Team
