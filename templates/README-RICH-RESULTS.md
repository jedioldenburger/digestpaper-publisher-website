# DigestPaper Rich Results Templates

This collection provides specialized header templates for different content types, each optimized for specific Google Rich Results and enhanced SEO.

## 📰 Core Templates

### `header-article.html` - NewsArticle Rich Results

**Use for:** News articles, investigations, reports
**Rich Results:** Article snippets, Top Stories, Publisher carousel
**Required Variables:**

- `page.title` - Article headline
- `page.description` - Article summary
- `page.date` - Publication date
- `page.featured_image` - Article image (1200x630 recommended)

**Enhanced Features:**

- ✅ Complete NewsArticle schema with copyrightNotice
- ✅ Author management (single or multiple)
- ✅ Advanced Open Graph (article:published_time, article:section, etc.)
- ✅ Location and citation support
- ✅ Interaction statistics (comments, shares)

### `header-regular.html` - General WebPage

**Use for:** Homepage, about pages, general content
**Rich Results:** Sitelinks, Knowledge Panel
**Features:** NewsMediaOrganization, WebSite with SearchAction, BreadcrumbList

## 🎯 Specialized Rich Results

### `header-factcheck.html` - ClaimReview Rich Results

**Use for:** Fact-checking articles
**Rich Results:** "Fact check" label in search results
**Required Variables:**

- `page.claim_reviewed` - The claim being fact-checked
- `page.rating_value` - Rating (1-5 scale)
- `page.rating_label` - Rating description (e.g., "Onwaar", "Gedeeltelijk waar")

**Optional Variables:**

```yaml
claim_source:
  title: "Original claim source"
  url: "https://example.com/original-claim"
  author:
    name: "Source Author"
    type: "Person" # or "Organization"
  date: "2025-09-18"
```

### `header-faq.html` - FAQPage Rich Results

**Use for:** Policy pages, help sections, Q&A content
**Rich Results:** FAQ snippets with expandable answers
**Required Variables:**

```yaml
faq:
  - question: "What is DigestPaper's editorial policy?"
    answer: "DigestPaper follows strict editorial guidelines..."
  - question: "How do you verify information?"
    answer: "We use a multi-step fact-checking process..."
```

### `header-howto.html` - HowTo Rich Results

**Use for:** Tutorials, guides, step-by-step instructions
**Rich Results:** How-to snippets with step navigation
**Required Variables:**

```yaml
steps:
  - title: "Install Signal"
    text: "Download Signal from the official website"
    instruction: "Navigate to signal.org and click Download"
    image: "/images/signal-download.jpg"
  - title: "Create Account"
    text: "Set up your Signal account with phone verification"
```

**Optional Variables:**

- `estimated_time` - e.g., "PT30M" (30 minutes)
- `difficulty` - "Easy", "Medium", "Hard"
- `tools` - Required tools/software
- `supplies` - Required materials

### `header-dataset.html` - Dataset Rich Results

**Use for:** Open data pages, research datasets
**Rich Results:** Google Dataset Search inclusion
**Required Variables:**

- `page.dataset_id` - Unique identifier
- `page.dataset_format` - ["CSV", "JSON", "XML"]

**Optional Variables:**

```yaml
dataset_distribution:
  - url: "/data/example.csv"
    format: "CSV"
    size: "2.5MB"
    name: "Raw Data"
  - url: "/data/example.json"
    format: "JSON"
    size: "1.8MB"
temporal_coverage: "2024-01-01/2024-12-31"
spatial_coverage:
  name: "Netherlands"
  geo:
    polygon: "52.1,4.2 52.5,4.9 52.0,5.8 51.8,4.5"
```

### `header-tool.html` - SoftwareApplication Rich Results

**Use for:** Web tools, applications, calculators
**Rich Results:** App snippets, installation prompts
**Required Variables:**

- `page.category` - "WebApplication", "SecurityTool", etc.

**Optional Variables:**

```yaml
features:
  - "PGP Key Generation"
  - "Secure File Sharing"
  - "Anonymous Communication"
version: "2.1.3"
system_requirements: "Modern web browser with JavaScript"
offers:
  price: 0
  currency: "EUR"
  availability: "https://schema.org/InStock"
```

### `header-qa.html` - QAPage Rich Results

**Use for:** Forum discussions, Q&A pages
**Rich Results:** Q&A snippets with accepted answers
**Required Variables:**

```yaml
question: "How to verify government documents?"
accepted_answer:
  text: "Use official government verification portals..."
  author:
    name: "Security Expert"
  upvotes: 15
```

**Optional Variables:**

```yaml
suggested_answers:
  - text: "Alternative verification method..."
    author:
      name: "Community Member"
    upvotes: 8
```

## 🔧 Implementation Guide

### 1. Template Selection

Choose the appropriate template based on content type:

- **News articles** → `header-article.html`
- **Fact checks** → `header-factcheck.html`
- **Tutorials** → `header-howto.html`
- **Open data** → `header-dataset.html`
- **Web tools** → `header-tool.html`
- **Q&A content** → `header-qa.html`
- **FAQ pages** → `header-faq.html`
- **General pages** → `header-regular.html`

### 2. Required Setup

All templates expect these global variables:

```yaml
site:
  url: "https://digestpaper.com"
  time: "2025-09-18T10:30:00+02:00"
```

### 3. Image Requirements

- **Featured images:** 1200x630px (16:9 ratio)
- **Logo:** 512x512px (square)
- **Screenshots:** Variable, but 1200px width recommended

### 4. Copyright and Licensing

Templates automatically include:

- Copyright notice: "© YYYY DigestPaper Publishing B.V."
- License links (when `page.license` specified)
- Usage info linking to terms of service

## 📊 SEO Features

### Enhanced Open Graph

All article templates include:

- `article:published_time`
- `article:modified_time`
- `article:section`
- `article:tag` (for each tag)

### Structured Data Validation

Test your implementation:

1. [Google Rich Results Test](https://search.google.com/test/rich-results)
2. [Schema Markup Validator](https://validator.schema.org/)
3. [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

### IndexNow Support

Add to your deployment pipeline:

```bash
# Submit URLs to IndexNow after publishing
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{"host":"digestpaper.com","key":"your-key","urlList":["https://digestpaper.com/new-article"]}'
```

## 🚀 Rich Results Checklist

### NewsArticle Essentials ✅

- [x] `headline`, `description`, `image` (w/h)
- [x] `datePublished`, `dateModified`, `author`, `publisher`
- [x] `mainEntityOfPage`, `inLanguage`
- [x] `copyrightNotice`, `isAccessibleForFree`
- [x] `articleSection`, `wordCount`

### Additional Rich Results ✅

- [x] **ClaimReview** for fact-checks
- [x] **FAQPage** for policy pages
- [x] **HowTo** for tutorials
- [x] **Dataset** for open data
- [x] **SoftwareApplication** for tools
- [x] **QAPage** for forums

### Recommended Additions

- [ ] **LiveBlogPosting** for live coverage events
- [ ] **Recipe** for any how-to content involving steps
- [ ] **Event** for conferences or announcements
- [ ] **VideoObject** for video content

## 🔍 Debug Tips

1. **Missing Rich Results?**
   - Verify required properties are present
   - Check JSON-LD syntax with validator
   - Ensure proper HTTP status codes (200)

2. **Images Not Showing?**
   - Verify image URLs are absolute
   - Check image dimensions meet requirements
   - Test image accessibility (no auth required)

3. **Template Variables Not Working?**
   - Check variable names match your CMS
   - Verify template engine syntax
   - Test with sample data first

## 📈 Performance Impact

- **Template Size:** ~15-25KB per template
- **Load Time:** Minimal impact (structured data parsed after page load)
- **SEO Benefit:** Significant improvement in rich results eligibility
- **Maintenance:** Update schemas annually or when Google updates requirements

---

_Last Updated: September 18, 2025_
_DigestPaper Publishing B.V._
