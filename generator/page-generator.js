#!/usr/bin/env node

/**
 * DigestPaper Media - Dynamic HTML Page Generator
 * 
 * This generator creates complete HTML pages using header.html and footer.html templates
 * with dynamic metadata, SEO optimization, and content rotation.
 * 
 * Features:
 * - Dynamic meta tags, OpenGraph, Twitter Cards
 * - Comprehensive JSON-LD structured data
 * - SEO-optimized content generation
 * - Multi-language support (Dutch)
 * - Image integration with alt-text
 * - Sitemap generation
 * - Content rotation for freshness
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'https://digestpaper.com',
  siteName: 'DigestPaper Media',
  author: 'DigestPaper Media',
  organization: 'DigestPaper Publishing',
  language: 'nl-NL',
  timezone: 'Europe/Amsterdam',
  contact: {
    email: 'jedi@xcom.dev',
    phone: '+31648319165',
    address: {
      street: 'Sint Olofssteeg 4',
      postal: '1012AK',
      city: 'Amsterdam',
      country: 'Nederland'
    }
  }
};

// Page templates and content definitions
const PAGE_DEFINITIONS = {
  // Projects Section
  'projects': {
    title: 'Projecten — DigestPaper Media',
    h1: 'Projecten',
    description: 'Overzicht van alle projecten van DigestPaper Media. Van onderzoeksjournalistiek tot data-analyse en open source initiatieven.',
    keywords: 'projecten, onderzoek, journalistiek, data-analyse, open source',
    contentType: 'CollectionPage',
    category: 'projects',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Projecten', url: '/projects/' }
    ]
  },
  'projects/open-data': {
    title: 'Open Data Projecten — DigestPaper Media',
    h1: 'Open Data',
    description: 'Open data initiatieven en transparantieprojecten van DigestPaper Media. Toegankelijke datasets voor onderzoek en analyse.',
    keywords: 'open data, transparantie, datasets, onderzoek, toegankelijkheid',
    contentType: 'WebPage',
    category: 'projects',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Projecten', url: '/projects/' },
      { name: 'Open Data', url: '/projects/open-data/' }
    ]
  },
  'projects/cases': {
    title: 'Cases — DigestPaper Media',
    h1: 'Cases',
    description: 'Diepgaande casestudies en onderzoeksdossiers van DigestPaper Media. Gedetailleerde analyses van belangrijke gebeurtenissen.',
    keywords: 'cases, casestudies, onderzoek, dossiers, analyses',
    contentType: 'WebPage',
    category: 'projects',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Projecten', url: '/projects/' },
      { name: 'Cases', url: '/projects/cases/' }
    ]
  },

  // Portfolio Section
  'portfolio': {
    title: 'Portfolio — DigestPaper Media',
    h1: 'Portfolio',
    description: 'Overzicht van het uitgebreide portfolio van DigestPaper Media. Van publicaties tot software en websites.',
    keywords: 'portfolio, publicaties, software, websites, uitgeverij',
    contentType: 'CollectionPage',
    category: 'portfolio',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Portfolio', url: '/portfolio/' }
    ]
  },
  'portfolio/publications': {
    title: 'Publicaties — DigestPaper Media',
    h1: 'Publicaties',
    description: 'Overzicht van alle publicaties van DigestPaper Media. Artikelen, rapporten en onderzoekspublicaties.',
    keywords: 'publicaties, artikelen, rapporten, onderzoek, journalistiek',
    contentType: 'WebPage',
    category: 'portfolio',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Portfolio', url: '/portfolio/' },
      { name: 'Publicaties', url: '/portfolio/publications/' }
    ]
  },
  'portfolio/software': {
    title: 'Software — DigestPaper Media',
    h1: 'Software',
    description: 'Software en tools ontwikkeld door DigestPaper Media. Open source projecten en professionele applicaties.',
    keywords: 'software, tools, open source, applicaties, ontwikkeling',
    contentType: 'WebPage',
    category: 'portfolio',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Portfolio', url: '/portfolio/' },
      { name: 'Software', url: '/portfolio/software/' }
    ]
  },
  'portfolio/websites': {
    title: 'Websites — DigestPaper Media',
    h1: 'Websites',
    description: 'Overzicht van alle websites en platforms van DigestPaper Media. Van nieuws tot forums en specialistische portalen.',
    keywords: 'websites, platforms, nieuws, forums, portalen',
    contentType: 'WebPage',
    category: 'portfolio',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Portfolio', url: '/portfolio/' },
      { name: 'Websites', url: '/portfolio/websites/' }
    ]
  },
  'portfolio/data': {
    title: 'Data Portfolio — DigestPaper Media',
    h1: 'Data (Portfolio)',
    description: 'Data-gerelateerde projecten en datasets van DigestPaper Media. Analytics, onderzoeksdata en visualisaties.',
    keywords: 'data, datasets, analytics, onderzoek, visualisaties',
    contentType: 'WebPage',
    category: 'portfolio',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Portfolio', url: '/portfolio/' },
      { name: 'Data', url: '/portfolio/data/' }
    ]
  },

  // Topics Section
  'topics/ai': {
    title: 'AI — DigestPaper Media',
    h1: 'AI',
    description: 'Kunstmatige intelligentie nieuws, analyses en onderzoek. De laatste ontwikkelingen in AI-technologie en -toepassingen.',
    keywords: 'AI, kunstmatige intelligentie, machine learning, technologie, innovatie',
    contentType: 'WebPage',
    category: 'topics',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'AI', url: '/topics/ai/' }
    ]
  },
  'topics/cybersecurity': {
    title: 'CyberSecurity — DigestPaper Media',
    h1: 'CyberSecurity',
    description: 'Cybersecurity nieuws, dreigingen en beveiligingsanalyses. Actuele informatie over digitale veiligheid.',
    keywords: 'cybersecurity, beveiliging, dreigingen, hacking, privacy',
    contentType: 'WebPage',
    category: 'topics',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'CyberSecurity', url: '/topics/cybersecurity/' }
    ]
  },
  'topics/politie-techniek': {
    title: 'Politie Techniek — DigestPaper Media',
    h1: 'Politie Techniek',
    description: 'Technologie en innovatie binnen de politie. Analyse van opsporingsmethoden en forensische technieken.',
    keywords: 'politie, techniek, opsporing, forensisch, innovatie',
    contentType: 'WebPage',
    category: 'topics',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'Politie Techniek', url: '/topics/politie-techniek/' }
    ]
  },
  'topics/juridische': {
    title: 'Juridische — DigestPaper Media',
    h1: 'Juridische',
    description: 'Juridische ontwikkelingen en rechtsanalyses. Actueel nieuws over wet- en regelgeving.',
    keywords: 'juridisch, recht, wetgeving, rechtspraak, analyse',
    contentType: 'WebPage',
    category: 'topics',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'Juridische', url: '/topics/juridische/' }
    ]
  },

  // Deep Topics
  'topics/nederland/recht/politie-onderzoek': {
    title: 'Politie-onderzoek — DigestPaper Media',
    h1: 'Politie-onderzoek',
    description: 'Diepgaande analyses van politieonderzoeken in Nederland. Methoden, procedures en rechtspraakontwikkelingen.',
    keywords: 'politie onderzoek, opsporing, Nederland, procedures, rechtspraak',
    contentType: 'WebPage',
    category: 'topics',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'Juridische', url: '/topics/juridische/' },
      { name: 'Politie-onderzoek', url: '/topics/nederland/recht/politie-onderzoek/' }
    ]
  },
  'topics/nederland/recht/illegale-opsporings-methoden': {
    title: 'Illegale opsporings-methoden — DigestPaper Media',
    h1: 'Illegale opsporings-methoden',
    description: 'Onderzoek naar illegale opsporingsmethoden in Nederland. Analyse van rechtszaken en procedures.',
    keywords: 'illegale opsporing, politie methoden, rechtspraak, procedures, Nederland',
    contentType: 'WebPage',
    category: 'topics',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'Juridische', url: '/topics/juridische/' },
      { name: 'Illegale opsporings-methoden', url: '/topics/nederland/recht/illegale-opsporings-methoden/' }
    ]
  },
  'topics/nederland/recht/illegale-opsporings-methoden/jos-brech': {
    title: 'Illegale opsporings-methoden · Jos Brech — DigestPaper Media',
    h1: 'Illegale opsporings-methoden · Jos Brech',
    description: 'Analyse van de illegale opsporingsmethoden in de zaak Jos Brech. Juridische implicaties en procedures.',
    keywords: 'Jos Brech, illegale opsporing, rechtszaak, procedures, analyse',
    contentType: 'WebPage',
    category: 'topics',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'Illegale opsporings-methoden', url: '/topics/nederland/recht/illegale-opsporings-methoden/' },
      { name: 'Jos Brech', url: '/topics/nederland/recht/illegale-opsporings-methoden/jos-brech/' }
    ]
  },
  'topics/nederland/recht/illegale-opsporings-methoden/mocro-mafia': {
    title: 'Illegale opsporings-methoden · Mocro-mafia — DigestPaper Media',
    h1: 'Illegale opsporings-methoden · Mocro-mafia',
    description: 'Analyse van illegale opsporingsmethoden in mocro-mafia onderzoeken. Rechtspraak en procedures.',
    keywords: 'mocro mafia, illegale opsporing, rechtszaken, procedures, analyse',
    contentType: 'WebPage',
    category: 'topics',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'Illegale opsporings-methoden', url: '/topics/nederland/recht/illegale-opsporings-methoden/' },
      { name: 'Mocro-mafia', url: '/topics/nederland/recht/illegale-opsporings-methoden/mocro-mafia/' }
    ]
  },

  // About Section
  'about': {
    title: 'About — DigestPaper Media',
    h1: 'About',
    description: 'Over DigestPaper Media. Onze missie, visie en het team achter onafhankelijke journalistiek.',
    keywords: 'about, over ons, missie, visie, team, journalistiek',
    contentType: 'AboutPage',
    category: 'about',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'About', url: '/about/' }
    ]
  },
  'about/personal': {
    title: 'Personal — DigestPaper Media',
    h1: 'Personal',
    description: 'Persoonlijke achtergrond en motivatie van het team achter DigestPaper Media.',
    keywords: 'personal, persoonlijk, achtergrond, motivatie, team',
    contentType: 'WebPage',
    category: 'about',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'About', url: '/about/' },
      { name: 'Personal', url: '/about/personal/' }
    ]
  },
  'about/ownership': {
    title: 'Ownership — DigestPaper Media',
    h1: 'Ownership',
    description: 'Eigendomsstructuur en onafhankelijkheid van DigestPaper Media. Transparantie over eigendom.',
    keywords: 'ownership, eigendom, onafhankelijkheid, transparantie, structuur',
    contentType: 'WebPage',
    category: 'about',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'About', url: '/about/' },
      { name: 'Ownership', url: '/about/ownership/' }
    ]
  },

  // Data & Tools Section
  'data': {
    title: 'Data — DigestPaper Media',
    h1: 'Data',
    description: 'Data-initiatieven en datasets van DigestPaper Media. Open data voor onderzoek en transparantie.',
    keywords: 'data, datasets, open data, onderzoek, transparantie',
    contentType: 'WebPage',
    category: 'data',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Data', url: '/data/' }
    ]
  },
  'tools': {
    title: 'Tools — DigestPaper Media',
    h1: 'Tools',
    description: 'Journalistieke tools en software van DigestPaper Media. Hulpmiddelen voor onderzoek en analyse.',
    keywords: 'tools, software, journalistiek, onderzoek, analyse',
    contentType: 'WebPage',
    category: 'tools',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools/' }
    ]
  },
  'labs': {
    title: 'Labs — DigestPaper Media',
    h1: 'Labs',
    description: 'Experimentele projecten en innovatieve initiatieven van DigestPaper Media Labs.',
    keywords: 'labs, experimenten, innovatie, projecten, onderzoek',
    contentType: 'WebPage',
    category: 'labs',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Labs', url: '/labs/' }
    ]
  },
  'api': {
    title: 'API — DigestPaper Media',
    h1: 'API',
    description: 'API documentatie en toegang tot DigestPaper Media data. Ontwikkelaars kunnen hier terecht.',
    keywords: 'API, documentatie, data, ontwikkelaars, toegang',
    contentType: 'WebPage',
    category: 'api',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'API', url: '/api/' }
    ]
  },

  // Contact Section
  'contact': {
    title: 'Contact — DigestPaper Media',
    h1: 'Contact',
    description: 'Neem contact op met DigestPaper Media. Voor vragen, tips en persverzoeken.',
    keywords: 'contact, vragen, tips, pers, communicatie',
    contentType: 'ContactPage',
    category: 'contact',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Contact', url: '/contact/' }
    ]
  },
  'contact/tips': {
    title: 'Tips (PGP/Signal) — DigestPaper Media',
    h1: 'Tips (PGP/Signal)',
    description: 'Veilig tips doorgeven aan DigestPaper Media via PGP of Signal. Bronbescherming gegarandeerd.',
    keywords: 'tips, PGP, Signal, veilig, bronbescherming, vertrouwelijk',
    contentType: 'WebPage',
    category: 'contact',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Contact', url: '/contact/' },
      { name: 'Tips', url: '/contact/tips/' }
    ]
  },
  'contact/press': {
    title: 'Pers & Media — DigestPaper Media',
    h1: 'Pers & Media',
    description: 'Perscontact en media-informatie van DigestPaper Media. Voor journalisten en mediapartners.',
    keywords: 'pers, media, journalisten, persberichten, mediapartners',
    contentType: 'WebPage',
    category: 'contact',
    image: 'digestpaper-rect-1000x400.png',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Contact', url: '/contact/' },
      { name: 'Pers & Media', url: '/contact/press/' }
    ]
  }
};

// Content variations for dynamic rotation
const CONTENT_VARIATIONS = {
  intro: [
    'DigestPaper Media staat voor onafhankelijke en betrouwbare journalistiek.',
    'Bij DigestPaper Media geloven we in de kracht van transparante berichtgeving.',
    'DigestPaper Media combineert traditionele journalistiek met moderne technologie.',
    'Onze missie bij DigestPaper Media is het leveren van kwalitatieve informatie.',
    'DigestPaper Media zet zich in voor waarheidsvinding door gedegen onderzoek.'
  ],
  mission: [
    'Wij streven naar transparantie, nauwkeurigheid en toegankelijkheid in al onze publicaties.',
    'Onze focus ligt op fact-checking, bronverificatie en ethische journalistieke praktijken.',
    'Door gebruik van data-analyse en onderzoeksjournalistiek brengen wij de waarheid aan het licht.',
    'Met respect voor bronnen en lezers creëren we content die bijdraagt aan maatschappelijke discussie.',
    'Onze redactionele principes zijn gebaseerd op onafhankelijkheid en professionele integriteit.'
  ],
  technology: [
    'We maken gebruik van geavanceerde technologieën voor data-analyse en onderzoek.',
    'Onze platforms zijn gebouwd met focus op gebruiksvriendelijkheid en toegankelijkheid.',
    'Door innovatieve tools kunnen we complexe informatie begrijpelijk presenteren.',
    'Technologie helpt ons bij het verifiëren van bronnen en het controleren van feiten.',
    'We investeren in veilige communicatiemiddelen voor bronbescherming.'
  ],
  commitment: [
    'DigestPaper Media staat voor kwaliteit, betrouwbaarheid en professionele journalistiek.',
    'Onze toewijding aan transparantie maakt ons tot een vertrouwde bron van informatie.',
    'We nemen onze verantwoordelijkheid als mediabedrijf serieus en handelen ethisch.',
    'Door continue verbetering en feedback streven we naar excellentie in onze berichtgeving.',
    'Onze lezers kunnen rekenen op accurate, tijdige en relevante informatie.'
  ]
};

// Helper functions
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

function getCurrentDateTime() {
  return new Date().toISOString();
}

function generateBreadcrumbLD(breadcrumbs) {
  return {
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": `${CONFIG.baseUrl}${crumb.url}`
    }))
  };
}

function generateContentVariation(type, page) {
  const variations = CONTENT_VARIATIONS[type] || CONTENT_VARIATIONS.intro;
  const randomIndex = Math.floor(Math.random() * variations.length);
  return variations[randomIndex];
}

function generateDynamicContent(pageData) {
  const intro = generateContentVariation('intro', pageData);
  const mission = generateContentVariation('mission', pageData);
  const technology = generateContentVariation('technology', pageData);
  const commitment = generateContentVariation('commitment', pageData);
  
  return `
    <section class="hero" role="banner">
      <div class="container">
        <div class="hero-content">
          <h1 class="hero-title">${pageData.h1}</h1>
          <p class="hero-description">${pageData.description}</p>
          <div class="hero-meta">
            <time datetime="${getCurrentDateTime()}" class="last-updated" id="last-updated">
              Laatst bijgewerkt: ${getCurrentDate()}
            </time>
          </div>
        </div>
        <div class="hero-image">
          <picture>
            <source srcset="/assets/${pageData.image.replace('.png', '.webp')}" type="image/webp">
            <img src="/assets/${pageData.image}" 
                 alt="${pageData.h1} - ${CONFIG.siteName}" 
                 width="800" height="400" 
                 loading="eager">
          </picture>
        </div>
      </div>
    </section>

    <main id="main" class="main-content" role="main">
      <div class="container">
        <article class="content-article">
          <section class="content-section">
            <h2>Overzicht</h2>
            <p class="lead">${intro}</p>
            <p>${mission}</p>
          </section>
          
          <section class="content-section">
            <h2>Onze Aanpak</h2>
            <p>${technology}</p>
            <p>${commitment}</p>
          </section>
          
          <section class="content-section">
            <h3>Kernwaarden</h3>
            <ul class="value-list">
              <li><strong>Transparantie:</strong> Openheid over bronnen, methoden en financiering</li>
              <li><strong>Nauwkeurigheid:</strong> Zorgvuldige verificatie en fact-checking</li>
              <li><strong>Onafhankelijkheid:</strong> Vrij van externe beïnvloeding</li>
              <li><strong>Toegankelijkheid:</strong> Informatie voor iedereen begrijpelijk</li>
              <li><strong>Innovatie:</strong> Gebruik van moderne technologie en methoden</li>
            </ul>
          </section>
          
          <section class="content-section">
            <h3>Meer Informatie</h3>
            <div class="info-cards">
              <div class="info-card">
                <h4>Redactionele Principes</h4>
                <p>Lees meer over onze journalistieke standaarden en werkwijze.</p>
                <a href="/policies/principles/" class="cta-link">Meer informatie</a>
              </div>
              <div class="info-card">
                <h4>Contact</h4>
                <p>Neem contact met ons op voor vragen of samenwerkingen.</p>
                <a href="/contact/" class="cta-link">Contact opnemen</a>
              </div>
              <div class="info-card">
                <h4>Portfolio</h4>
                <p>Bekijk ons volledige portfolio van publicaties en projecten.</p>
                <a href="/portfolio/" class="cta-link">Portfolio bekijken</a>
              </div>
            </div>
          </section>
        </article>
      </div>
    </main>
  `;
}

function updateHeaderMetadata(headerContent, pageData, pagePath) {
  const url = `${CONFIG.baseUrl}${pagePath.startsWith('/') ? pagePath : '/' + pagePath}`;
  const ogImage = `${CONFIG.baseUrl}/assets/${pageData.image}`;
  const currentDate = getCurrentDateTime();
  
  // Replace dynamic metadata
  let updatedHeader = headerContent
    // Title and basic meta
    .replace(/<title>.*?<\/title>/, `<title>${pageData.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/g, `$1${pageData.description}$2`)
    .replace(/(<meta name="keywords" content=")[^"]*(")/g, `$1${pageData.keywords}$2`)
    
    // Canonical URL
    .replace(/(<link rel="canonical" href=")[^"]*(")/g, `$1${url}$2`)
    .replace(/(<link rel="alternate" hreflang="nl" href=")[^"]*(")/g, `$1${url}$2`)
    .replace(/(<link rel="alternate" hreflang="x-default" href=")[^"]*(")/g, `$1${url}$2`)
    
    // Open Graph
    .replace(/(<meta property="og:title" content=")[^"]*(")/g, `$1${pageData.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/g, `$1${pageData.description}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/g, `$1${url}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/g, `$1${ogImage}$2`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*(")/g, `$1${pageData.h1} - ${CONFIG.siteName}$2`)
    .replace(/(<meta property="og:image:secure_url" content=")[^"]*(")/g, `$1${ogImage}$2`)
    
    // Twitter
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/g, `$1${pageData.title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/g, `$1${pageData.description}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/g, `$1${ogImage}$2`)
    .replace(/(<meta name="twitter:image:alt" content=")[^"]*(")/g, `$1${pageData.h1} - ${CONFIG.siteName}$2`)
    
    // Dublin Core
    .replace(/(<meta name="dc.title" content=")[^"]*(")/g, `$1${pageData.title}$2`)
    .replace(/(<meta name="dc.description" content=")[^"]*(")/g, `$1${pageData.description}$2`)
    .replace(/(<meta name="dc.subject" content=")[^"]*(")/g, `$1${pageData.keywords}$2`)
    .replace(/(<meta name="dc.identifier" content=")[^"]*(")/g, `$1${url}$2`);

  // Add structured data for this specific page
  const pageStructuredData = generatePageStructuredData(pageData, pagePath, url);
  
  // Insert before closing </head>
  updatedHeader = updatedHeader.replace(
    '</head>',
    `\n  ${pageStructuredData}\n</head>`
  );
  
  return updatedHeader;
}

function generatePageStructuredData(pageData, pagePath, url) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": pageData.contentType || "WebPage",
        "@id": `${url}#webpage`,
        "url": url,
        "name": pageData.title,
        "description": pageData.description,
        "inLanguage": CONFIG.language,
        "isPartOf": { "@id": `${CONFIG.baseUrl}#website` },
        "about": { "@id": `${CONFIG.baseUrl}#org` },
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": `${CONFIG.baseUrl}/assets/${pageData.image}`,
          "width": 1000,
          "height": 400
        },
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": pageData.breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": crumb.name,
            "item": `${CONFIG.baseUrl}${crumb.url}`
          }))
        },
        "datePublished": "2025-08-01",
        "dateModified": getCurrentDate(),
        "author": { "@id": `${CONFIG.baseUrl}#org` },
        "publisher": { "@id": `${CONFIG.baseUrl}#org` }
      }
    ]
  };

  // Add specific content for collection pages
  if (pageData.contentType === 'CollectionPage') {
    structuredData["@graph"][0].mainEntity = {
      "@type": "ItemList",
      "name": pageData.h1,
      "description": pageData.description
    };
  }

  return `<script type="application/ld+json">\n${JSON.stringify(structuredData, null, 2)}\n</script>`;
}

function generateHTML(pagePath) {
  const pageData = PAGE_DEFINITIONS[pagePath];
  if (!pageData) {
    throw new Error(`Page definition not found for: ${pagePath}`);
  }

  // Read templates
  const templatesDir = path.join(__dirname, '..', 'templates');
  const headerPath = path.join(templatesDir, 'header.html');
  const footerPath = path.join(templatesDir, 'footer.html');
  
  if (!fs.existsSync(headerPath) || !fs.existsSync(footerPath)) {
    throw new Error('Template files not found');
  }

  const headerContent = fs.readFileSync(headerPath, 'utf8');
  const footerContent = fs.readFileSync(footerPath, 'utf8');

  // Update header with dynamic metadata
  const updatedHeader = updateHeaderMetadata(headerContent, pageData, pagePath);
  
  // Generate dynamic content
  const mainContent = generateDynamicContent(pageData);
  
  // Combine all parts
  const fullHTML = updatedHeader + '\n' + mainContent + '\n' + footerContent;
  
  return fullHTML;
}

function generateSitemap() {
  const currentDate = getCurrentDate();
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Homepage -->
  <url>
    <loc>${CONFIG.baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  // Add all defined pages
  Object.keys(PAGE_DEFINITIONS).forEach(pagePath => {
    const pageData = PAGE_DEFINITIONS[pagePath];
    const url = `${CONFIG.baseUrl}/${pagePath}/`;
    
    sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${CONFIG.baseUrl}/assets/${pageData.image}</image:loc>
      <image:title>${pageData.h1}</image:title>
      <image:caption>${pageData.description}</image:caption>
    </image:image>
  </url>
`;
  });

  // Add policy pages
  const policyPages = [
    'policies/principles',
    'policies/fact-checking',
    'policies/corrections',
    'policies/funding',
    'policies/privacy',
    'policies/cookie-policy',
    'policies/terms-of-service',
    'policies/accessibility',
    'policies/security-policy',
    'policies/security-policy/acknowledgments'
  ];

  policyPages.forEach(pagePath => {
    sitemap += `  <url>
    <loc>${CONFIG.baseUrl}/${pagePath}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  sitemap += '</urlset>';
  return sitemap;
}

// CLI functionality
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('DigestPaper Media - Dynamic HTML Page Generator');
    console.log('Usage:');
    console.log('  node page-generator.js <page-path>     Generate single page');
    console.log('  node page-generator.js --all           Generate all pages');
    console.log('  node page-generator.js --sitemap       Generate sitemap.xml');
    console.log('  node page-generator.js --list          List available pages');
    console.log('');
    console.log('Examples:');
    console.log('  node page-generator.js projects');
    console.log('  node page-generator.js topics/ai');
    console.log('  node page-generator.js contact/tips');
    return;
  }

  const command = args[0];
  const outputDir = path.join(__dirname, '..', 'public');

  if (command === '--list') {
    console.log('Available pages:');
    Object.keys(PAGE_DEFINITIONS).forEach(pagePath => {
      const pageData = PAGE_DEFINITIONS[pagePath];
      console.log(`  ${pagePath.padEnd(40)} ${pageData.title}`);
    });
    return;
  }

  if (command === '--sitemap') {
    const sitemap = generateSitemap();
    const sitemapPath = path.join(outputDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);
    console.log(`✅ Sitemap generated: ${sitemapPath}`);
    return;
  }

  if (command === '--all') {
    console.log('Generating all pages...');
    let generated = 0;
    
    Object.keys(PAGE_DEFINITIONS).forEach(pagePath => {
      try {
        const html = generateHTML(pagePath);
        const outputPath = path.join(outputDir, pagePath, 'index.html');
        
        // Create directory if it doesn't exist
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, html);
        console.log(`✅ Generated: ${pagePath}`);
        generated++;
      } catch (error) {
        console.error(`❌ Error generating ${pagePath}:`, error.message);
      }
    });
    
    // Generate sitemap
    const sitemap = generateSitemap();
    const sitemapPath = path.join(outputDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);
    
    console.log(`\n🎉 Generated ${generated} pages and sitemap.xml`);
    return;
  }

  // Generate single page
  const pagePath = command;
  
  if (!PAGE_DEFINITIONS[pagePath]) {
    console.error(`❌ Page not found: ${pagePath}`);
    console.log('Available pages:');
    Object.keys(PAGE_DEFINITIONS).forEach(p => console.log(`  ${p}`));
    return;
  }

  try {
    const html = generateHTML(pagePath);
    const outputPath = path.join(outputDir, pagePath, 'index.html');
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, html);
    console.log(`✅ Generated: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error generating ${pagePath}:`, error.message);
  }
}

// Export for programmatic use
module.exports = {
  generateHTML,
  generateSitemap,
  PAGE_DEFINITIONS,
  CONFIG
};

// Run if called directly
if (require.main === module) {
  main();
}