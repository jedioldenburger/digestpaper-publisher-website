#!/usr/bin/env node

/**
 * DigestPaper Media - Enhanced Dynamic HTML Page Generator
 * 
 * Advanced generator with configuration-driven content, dynamic metadata rotation,
 * and comprehensive SEO optimization for the DigestPaper Media website.
 * 
 * Features:
 * - Configuration-driven content generation
 * - Dynamic metadata and content rotation
 * - Comprehensive SEO optimization
 * - Multi-language support
 * - Advanced structured data
 * - Batch generation capabilities
 * - Performance optimization
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load configuration
const configPath = path.join(__dirname, 'config.json');
const CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Enhanced page definitions with more metadata
const ENHANCED_PAGE_DEFINITIONS = {
  // Projects Section
  'projects': {
    title: 'Projecten — DigestPaper Media',
    h1: 'Projecten',
    description: 'Overzicht van alle projecten van DigestPaper Media. Van onderzoeksjournalistiek tot data-analyse en open source initiatieven.',
    keywords: 'projecten, onderzoek, journalistiek, data-analyse, open source',
    contentType: 'CollectionPage',
    category: 'projects',
    image: CONFIG.branding.defaultImage,
    priority: 0.9,
    changefreq: 'weekly',
    theme: 'projects',
    sections: ['overview', 'methodology', 'impact', 'collaboration'],
    relatedPages: ['projects/open-data', 'projects/cases', 'about'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'weekly',
    theme: 'data',
    sections: ['datasets', 'methodology', 'access', 'applications'],
    relatedPages: ['data', 'tools', 'api'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'weekly',
    theme: 'research',
    sections: ['cases', 'methodology', 'findings', 'impact'],
    relatedPages: ['topics', 'about/methodology', 'policies/principles'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.9,
    changefreq: 'weekly',
    theme: 'portfolio',
    sections: ['overview', 'platforms', 'publications', 'technology'],
    relatedPages: ['portfolio/publications', 'portfolio/software', 'portfolio/websites'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'weekly',
    theme: 'editorial',
    sections: ['recent', 'categories', 'archive', 'methodology'],
    relatedPages: ['topics', 'projects', 'policies/principles'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'monthly',
    theme: 'technology',
    sections: ['applications', 'opensource', 'tools', 'apis'],
    relatedPages: ['tools', 'api', 'labs'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'monthly',
    theme: 'platforms',
    sections: ['platforms', 'features', 'technology', 'audience'],
    relatedPages: ['about', 'contact', 'policies/principles'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.7,
    changefreq: 'yearly',
    theme: 'corporate',
    sections: ['datasets', 'analytics', 'visualizations', 'methodology'],
    relatedPages: ['data', 'projects/open-data', 'tools'],
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
    contentType: 'TopicPage',
    category: 'topics',
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'daily',
    theme: 'technology',
    sections: ['news', 'analysis', 'trends', 'impact'],
    relatedPages: ['topics/cybersecurity', 'portfolio/software', 'labs'],
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
    contentType: 'TopicPage',
    category: 'topics',
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'daily',
    theme: 'security',
    sections: ['threats', 'analysis', 'prevention', 'updates'],
    relatedPages: ['topics/ai', 'policies/security-policy', 'tools'],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'CyberSecurity', url: '/topics/cybersecurity/' }
    ]
  },
  'topics/nederland/recht/politie-onderzoek': {
    title: 'Het Grote Politie Onderzoek — DigestPaper Media',
    h1: 'Het Grote Politie Onderzoek: Wanneer Justitie Faalt',
    description: 'Een diepgaande analyse van het grootschalige politieonderzoek dat volledig uit de hand liep. Hoe systemische problemen binnen de Nederlandse politie tot een crisis van vertrouwen leidden.',
    keywords: 'politie onderzoek, justitie, politie crisis, Nederland, rechtsstaat, politie schandaal, onderzoeksjournalistiek',
    contentType: 'InvestigativeReport',
    category: 'topics',
    image: CONFIG.branding.defaultImage,
    priority: 0.9,
    changefreq: 'weekly',
    theme: 'investigative',
    sections: ['timeline', 'investigation', 'consequences', 'analysis'],
    relatedPages: ['topics/nederland/recht/illegale-opsporings-methoden', 'policies/fact-checking', 'contact/tips'],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'Nederland', url: '/topics/nederland/' },
      { name: 'Recht', url: '/topics/nederland/recht/' },
      { name: 'Politie Onderzoek', url: '/topics/nederland/recht/politie-onderzoek/' }
    ]
  },

  // Netherlands Legal Topics Section
  'topics/nederland/recht/illegale-opsporings-methoden': {
    title: 'Illegale Opsporingsmethoden — DigestPaper Media',
    h1: 'Illegale Opsporingsmethoden in Nederland',
    description: 'Analyse van illegale opsporingsmethoden in Nederland. Onderzoek naar rechtsstaat, politie-overschrijdingen en gerechtelijke dwalingen.',
    keywords: 'illegale opsporingsmethoden, politie, rechtsstaat, Nederland, justitie, privacy, grondrechten',
    contentType: 'TopicPage',
    category: 'topics',
    image: CONFIG.branding.defaultImage,
    priority: 0.9,
    changefreq: 'weekly',
    theme: 'legal',
    sections: ['casestudies', 'analysis', 'legal-framework', 'impact'],
    relatedPages: ['topics/nederland/recht/illegale-opsporings-methoden/jos-brech', 'topics/cybersecurity', 'policies/principles'],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'Nederland', url: '/topics/nederland/' },
      { name: 'Recht', url: '/topics/nederland/recht/' },
      { name: 'Illegale Opsporingsmethoden', url: '/topics/nederland/recht/illegale-opsporings-methoden/' }
    ]
  },
  'topics/nederland/recht/illegale-opsporings-methoden/jos-brech': {
    title: 'Jos Brech Zaak: Illegale Opsporingsmethoden — DigestPaper Media',
    h1: 'De Jos Brech Zaak: Analyse van Illegale Opsporingsmethoden',
    description: 'Diepgaande analyse van de Jos Brech zaak en de illegale opsporingsmethoden die werden toegepast. Juridische implicaties en rechtsstaat-gevolgen.',
    keywords: 'Jos Brech, illegale opsporingsmethoden, Nicky Verstappen, politie, justitie, rechtsstaat, privacy-schending',
    contentType: 'CaseStudy',
    category: 'topics',
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'monthly',
    theme: 'legal-case',
    sections: ['case-overview', 'illegal-methods', 'legal-analysis', 'implications'],
    relatedPages: ['topics/nederland/recht/illegale-opsporings-methoden', 'policies/privacy', 'topics/cybersecurity'],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics/' },
      { name: 'Nederland', url: '/topics/nederland/' },
      { name: 'Recht', url: '/topics/nederland/recht/' },
      { name: 'Illegale Opsporingsmethoden', url: '/topics/nederland/recht/illegale-opsporings-methoden/' },
      { name: 'Jos Brech Zaak', url: '/topics/nederland/recht/illegale-opsporings-methoden/jos-brech/' }
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
    image: CONFIG.branding.defaultImage,
    priority: 0.9,
    changefreq: 'monthly',
    theme: 'corporate',
    sections: ['mission', 'vision', 'team', 'values'],
    relatedPages: ['about/personal', 'about/ownership', 'policies/principles'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.7,
    changefreq: 'monthly',
    theme: 'personal',
    sections: ['background', 'motivation', 'experience', 'philosophy'],
    relatedPages: ['about', 'about/ownership', 'contact'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.7,
    changefreq: 'yearly',
    theme: 'transparency',
    sections: ['structure', 'independence', 'funding', 'governance'],
    relatedPages: ['policies/funding', 'policies/principles', 'about'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'weekly',
    theme: 'data',
    sections: ['datasets', 'access', 'documentation', 'usage'],
    relatedPages: ['projects/open-data', 'api', 'tools'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'monthly',
    theme: 'tools',
    sections: ['applications', 'features', 'documentation', 'support'],
    relatedPages: ['portfolio/software', 'labs', 'api'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.7,
    changefreq: 'monthly',
    theme: 'innovation',
    sections: ['experiments', 'prototypes', 'research', 'collaboration'],
    relatedPages: ['projects', 'tools', 'portfolio/software'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.6,
    changefreq: 'monthly',
    theme: 'technical',
    sections: ['documentation', 'endpoints', 'authentication', 'examples'],
    relatedPages: ['data', 'tools', 'portfolio/software'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.9,
    changefreq: 'monthly',
    theme: 'contact',
    sections: ['general', 'press', 'tips', 'support'],
    relatedPages: ['contact/tips', 'contact/press', 'about'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.8,
    changefreq: 'monthly',
    theme: 'security',
    sections: ['methods', 'security', 'anonymity', 'guidelines'],
    relatedPages: ['contact', 'policies/security-policy', 'about'],
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
    image: CONFIG.branding.defaultImage,
    priority: 0.7,
    changefreq: 'monthly',
    theme: 'media',
    sections: ['contacts', 'releases', 'resources', 'partnerships'],
    relatedPages: ['about', 'portfolio', 'policies/principles'],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Contact', url: '/contact/' },
      { name: 'Pers & Media', url: '/contact/press/' }
    ]
  }
};

// Enhanced helper functions
function getCurrentDate(deterministic = false) {
  if (deterministic) {
    return '2025-01-01'; // Fixed date for deterministic output
  }
  return new Date().toISOString().split('T')[0];
}

function getCurrentDateTime(deterministic = false) {
  if (deterministic) {
    return '2025-01-01T12:00:00.000Z'; // Fixed datetime for deterministic output
  }
  return new Date().toISOString();
}

function generateContentHash(content) {
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
}

function getRandomVariation(variations, seed = null) {
  if (seed) {
    // Deterministic selection based on seed
    const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % variations.length;
    return variations[index];
  }
  return variations[Math.floor(Math.random() * variations.length)];
}

function generateDynamicContent(pageData, seed = null, options = {}) {
  const config = CONFIG.contentVariations;
  const isDeterministic = seed !== null || options.deterministic;
  
  // Generate content variations based on page theme and seed
  const intro = getRandomVariation(config.intro, seed ? `${seed}-intro` : null);
  const mission = getRandomVariation(config.mission, seed ? `${seed}-mission` : null);
  const technology = getRandomVariation(config.technology, seed ? `${seed}-tech` : null);
  const commitment = getRandomVariation(config.commitment, seed ? `${seed}-commit` : null);
  
  // Generate section-specific content based on page sections
  const sectionContent = generateSectionContent(pageData);
  
  return `
    <section class="hero ${pageData.theme ? `hero--${pageData.theme}` : ''}" role="banner">
      <div class="container">
        <div class="hero-content">
          <h1 class="hero-title">${pageData.h1}</h1>
          <p class="hero-description">${pageData.description}</p>
          <div class="hero-meta">
            <time datetime="${getCurrentDateTime(isDeterministic)}" class="last-updated" id="last-updated">
              Laatst bijgewerkt: ${getCurrentDate(isDeterministic)}
            </time>
            ${pageData.category ? `<span class="category">Categorie: ${pageData.category}</span>` : ''}
          </div>
        </div>
        <div class="hero-image">
          <picture>
            <source srcset="/assets/${pageData.image.replace('.png', '.webp')}" type="image/webp">
            <img src="/assets/${pageData.image}" 
                 alt="${pageData.h1} - ${CONFIG.site.name}" 
                 width="800" height="400" 
                 loading="eager">
          </picture>
        </div>
      </div>
    </section>

    <main id="main" class="main-content" role="main">
      <div class="container">
        <article class="content-article" itemscope itemtype="https://schema.org/Article">
          <meta itemprop="headline" content="${pageData.title}">
          <meta itemprop="description" content="${pageData.description}">
          <meta itemprop="datePublished" content="2025-08-01">
          <meta itemprop="dateModified" content="${getCurrentDate(isDeterministic)}">
          
          <section class="content-section">
            <h2>Overzicht</h2>
            <p class="lead" itemprop="description">${intro}</p>
            <p>${mission}</p>
          </section>
          
          <section class="content-section">
            <h2>Onze Aanpak</h2>
            <p>${technology}</p>
            <p>${commitment}</p>
          </section>
          
          ${sectionContent}
          
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
          
          ${generateRelatedContent(pageData)}
        </article>
      </div>
    </main>
  `;
}

function generateSectionContent(pageData) {
  if (!pageData.sections) return '';
  
  const sectionMap = {
    overview: 'Dit overzicht toont de belangrijkste aspecten van ons werk op dit gebied.',
    methodology: 'Onze methodologie is gebaseerd op bewezen journalistieke praktijken en moderne technologie.',
    impact: 'De impact van ons werk strekt zich uit tot verschillende sectoren van de maatschappij.',
    collaboration: 'We werken samen met diverse partners om onze doelen te bereiken.',
    datasets: 'Onze datasets zijn zorgvuldig samengesteld en regelmatig geüpdatet.',
    access: 'Toegang tot onze resources is gebaseerd op transparantie en openheid.',
    applications: 'Deze toepassingen demonstreren de praktische waarde van ons werk.',
    features: 'De functionaliteiten zijn ontworpen met gebruiksvriendelijkheid in gedachten.',
    documentation: 'Uitgebreide documentatie ondersteunt gebruikers bij implementatie.',
    support: 'Ons supportteam staat klaar om te helpen bij vragen en problemen.'
  };
  
  return pageData.sections.map(section => `
    <section class="content-section">
      <h3>${section.charAt(0).toUpperCase() + section.slice(1)}</h3>
      <p>${sectionMap[section] || 'Deze sectie bevat relevante informatie over dit onderwerp.'}</p>
    </section>
  `).join('');
}

function generateRelatedContent(pageData) {
  if (!pageData.relatedPages || pageData.relatedPages.length === 0) return '';
  
  return `
    <section class="content-section">
      <h3>Gerelateerd</h3>
      <div class="related-cards">
        ${pageData.relatedPages.map(relatedPath => {
          const relatedPage = ENHANCED_PAGE_DEFINITIONS[relatedPath];
          if (!relatedPage) return '';
          
          return `
            <div class="related-card">
              <h4><a href="/${relatedPath}/">${relatedPage.h1}</a></h4>
              <p>${relatedPage.description}</p>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function updateHeaderMetadata(headerContent, pageData, pagePath, options = {}) {
  const url = `${CONFIG.site.baseUrl}${pagePath.startsWith('/') ? pagePath : '/' + pagePath}`;
  const ogImage = `${CONFIG.site.baseUrl}/assets/${pageData.image}`;
  const currentDate = getCurrentDateTime(options.deterministic);
  
  // Enhanced metadata replacement with more comprehensive coverage
  let updatedHeader = headerContent
    // Basic metadata
    .replace(/<title>.*?<\/title>/, `<title>${pageData.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/g, `$1${pageData.description}$2`)
    .replace(/(<meta name="keywords" content=")[^"]*(")/g, `$1${pageData.keywords}$2`)
    .replace(/(<meta name="author" content=")[^"]*(")/g, `$1${CONFIG.site.author}$2`)
    
    // Canonical and alternates
    .replace(/(<link rel="canonical" href=")[^"]*(")/g, `$1${url}$2`)
    .replace(/(<link rel="alternate" hreflang="nl" href=")[^"]*(")/g, `$1${url}$2`)
    .replace(/(<link rel="alternate" hreflang="x-default" href=")[^"]*(")/g, `$1${url}$2`)
    
    // Open Graph
    .replace(/(<meta property="og:title" content=")[^"]*(")/g, `$1${pageData.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/g, `$1${pageData.description}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/g, `$1${url}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/g, `$1${ogImage}$2`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*(")/g, `$1${pageData.h1} - ${CONFIG.site.name}$2`)
    .replace(/(<meta property="og:image:secure_url" content=")[^"]*(")/g, `$1${ogImage}$2`)
    .replace(/(<meta property="og:site_name" content=")[^"]*(")/g, `$1${CONFIG.site.name}$2`)
    
    // Twitter Cards
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/g, `$1${pageData.title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/g, `$1${pageData.description}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/g, `$1${ogImage}$2`)
    .replace(/(<meta name="twitter:image:alt" content=")[^"]*(")/g, `$1${pageData.h1} - ${CONFIG.site.name}$2`)
    .replace(/(<meta name="twitter:site" content=")[^"]*(")/g, `$1${CONFIG.social.twitter}$2`)
    .replace(/(<meta name="twitter:creator" content=")[^"]*(")/g, `$1${CONFIG.social.twitter}$2`)
    
    // Dublin Core
    .replace(/(<meta name="dc.title" content=")[^"]*(")/g, `$1${pageData.title}$2`)
    .replace(/(<meta name="dc.description" content=")[^"]*(")/g, `$1${pageData.description}$2`)
    .replace(/(<meta name="dc.subject" content=")[^"]*(")/g, `$1${pageData.keywords}$2`)
    .replace(/(<meta name="dc.identifier" content=")[^"]*(")/g, `$1${url}$2`)
    .replace(/(<meta name="dc.creator" content=")[^"]*(")/g, `$1${CONFIG.site.author}$2`)
    .replace(/(<meta name="dc.publisher" content=")[^"]*(")/g, `$1${CONFIG.site.organization}$2`);

  // Add page-specific structured data
  const pageStructuredData = generatePageStructuredData(pageData, pagePath, url, options);
  
  // Insert structured data before closing </head>
  updatedHeader = updatedHeader.replace(
    '</head>',
    `\n  ${pageStructuredData}\n</head>`
  );
  
  return updatedHeader;
}

function generatePageStructuredData(pageData, pagePath, url, options = {}) {
  const currentDate = getCurrentDate(options.deterministic);
  
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": pageData.contentType || "WebPage",
        "@id": `${url}#webpage`,
        "url": url,
        "name": pageData.title,
        "headline": pageData.h1,
        "description": pageData.description,
        "inLanguage": CONFIG.site.language,
        "isPartOf": { "@id": `${CONFIG.site.baseUrl}#website` },
        "about": { "@id": `${CONFIG.site.baseUrl}#org` },
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": `${CONFIG.site.baseUrl}/assets/${pageData.image}`,
          "width": 1000,
          "height": 400,
          "caption": pageData.description
        },
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": pageData.breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": crumb.name,
            "item": `${CONFIG.site.baseUrl}${crumb.url}`
          }))
        },
        "datePublished": "2025-08-01",
        "dateModified": currentDate,
        "author": { "@id": `${CONFIG.site.baseUrl}#org` },
        "publisher": { "@id": `${CONFIG.site.baseUrl}#org` },
        "keywords": pageData.keywords.split(', ')
      }
    ]
  };

  // Add specific schema types based on content type
  const mainEntity = structuredData["@graph"][0];
  
  switch (pageData.contentType) {
    case 'CollectionPage':
      mainEntity.mainEntity = {
        "@type": "ItemList",
        "name": pageData.h1,
        "description": pageData.description,
        "numberOfItems": pageData.relatedPages ? pageData.relatedPages.length : 0
      };
      break;
      
    case 'AboutPage':
      mainEntity.mainEntity = {
        "@type": "Organization", 
        "@id": `${CONFIG.site.baseUrl}#org`
      };
      break;
      
    case 'ContactPage':
      mainEntity.mainEntity = {
        "@type": "ContactPage",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": CONFIG.contact.email,
          "telephone": CONFIG.contact.phone,
          "contactType": "customer service"
        }
      };
      break;
      
    case 'TopicPage':
      mainEntity["@type"] = "WebPage";
      mainEntity.about = {
        "@type": "Thing",
        "name": pageData.h1,
        "description": pageData.description
      };
      break;
  }

  // Add related pages if available
  if (pageData.relatedPages && pageData.relatedPages.length > 0) {
    mainEntity.relatedLink = pageData.relatedPages.map(relatedPath => 
      `${CONFIG.site.baseUrl}/${relatedPath}/`
    );
  }

  return `<script type="application/ld+json">\n${JSON.stringify(structuredData, null, 2)}\n</script>`;
}

function generateEnhancedSitemap(options = {}) {
  const currentDate = getCurrentDate(options.deterministic);
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Homepage -->
  <url>
    <loc>${CONFIG.site.baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  // Add all defined pages with clean metadata
  Object.keys(ENHANCED_PAGE_DEFINITIONS).forEach(pagePath => {
    const pageData = ENHANCED_PAGE_DEFINITIONS[pagePath];
    const url = `${CONFIG.site.baseUrl}/${pagePath}/`;
    
    sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${pageData.changefreq || 'weekly'}</changefreq>
    <priority>${pageData.priority || 0.8}</priority>
  </url>
`;
  });

  // Add policy pages
  const policyPages = [
    { path: 'policies/principles', priority: 0.7, changefreq: 'monthly' },
    { path: 'policies/fact-checking', priority: 0.7, changefreq: 'monthly' },
    { path: 'policies/corrections', priority: 0.6, changefreq: 'monthly' },
    { path: 'policies/funding', priority: 0.6, changefreq: 'yearly' },
    { path: 'policies/privacy', priority: 0.8, changefreq: 'monthly' },
    { path: 'policies/cookie-policy', priority: 0.6, changefreq: 'yearly' },
    { path: 'policies/terms-of-service', priority: 0.6, changefreq: 'yearly' },
    { path: 'policies/accessibility', priority: 0.6, changefreq: 'yearly' },
    { path: 'policies/security-policy', priority: 0.7, changefreq: 'monthly' },
    { path: 'policies/security-policy/acknowledgments', priority: 0.5, changefreq: 'monthly' }
  ];

  policyPages.forEach(page => {
    sitemap += `  <url>
    <loc>${CONFIG.site.baseUrl}/${page.path}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  sitemap += '</urlset>';
  return sitemap;
}

function generateHTML(pagePath, options = {}) {
  const pageData = ENHANCED_PAGE_DEFINITIONS[pagePath];
  if (!pageData) {
    throw new Error(`Page definition not found for: ${pagePath}`);
  }

  // Determine template directory
  const templatesDir = options.templatesDir || path.join(__dirname, CONFIG.build.templatesDir);
  const headerPath = path.join(templatesDir, 'header.html');
  const footerPath = path.join(templatesDir, 'footer.html');
  
  if (!fs.existsSync(headerPath) || !fs.existsSync(footerPath)) {
    throw new Error(`Template files not found in: ${templatesDir}`);
  }

  const headerContent = fs.readFileSync(headerPath, 'utf8');
  const footerContent = fs.readFileSync(footerPath, 'utf8');

  // Generate content with optional seed for deterministic output
  const seed = options.seed || (options.deterministic ? pagePath : null);
  
  // Update header with dynamic metadata
  const updatedHeader = updateHeaderMetadata(headerContent, pageData, pagePath, options);
  
  // Generate dynamic content
  const mainContent = generateDynamicContent(pageData, seed, options);
  
  // Combine all parts
  const fullHTML = updatedHeader + '\n' + mainContent + '\n' + footerContent;
  
  // Add generation metadata as HTML comment
  const generationComment = `
<!-- 
  Generated by DigestPaper Media Page Generator
  Page: ${pagePath}
  Generated: ${getCurrentDateTime(options.deterministic)}
  Content Hash: ${generateContentHash(mainContent)}
  Seed: ${seed || 'random'}
-->`;
  
  return fullHTML.replace('<body>', `<body>${generationComment}`);
}

// Enhanced CLI functionality
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🚀 DigestPaper Media - Enhanced Dynamic HTML Page Generator');
    console.log('');
    console.log('Usage:');
    console.log('  node enhanced-generator.js <page-path>           Generate single page');
    console.log('  node enhanced-generator.js --all                Generate all pages');
    console.log('  node enhanced-generator.js --sitemap            Generate sitemap.xml');
    console.log('  node enhanced-generator.js --list               List available pages');
    console.log('  node enhanced-generator.js --stats              Show generation statistics');
    console.log('  node enhanced-generator.js --config             Show current configuration');
    console.log('');
    console.log('Options:');
    console.log('  --deterministic          Use deterministic content generation');
    console.log('  --output-dir <dir>       Specify output directory');
    console.log('  --templates-dir <dir>    Specify templates directory');
    console.log('');
    console.log('Examples:');
    console.log('  node enhanced-generator.js projects');
    console.log('  node enhanced-generator.js topics/ai --deterministic');
    console.log('  node enhanced-generator.js --all --output-dir ./dist');
    return;
  }

  // Parse arguments
  const options = {};
  const commands = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (arg === '--deterministic') {
        options.deterministic = true;
      } else if (arg === '--output-dir' && i + 1 < args.length) {
        options.outputDir = args[++i];
      } else if (arg === '--templates-dir' && i + 1 < args.length) {
        options.templatesDir = args[++i];
      } else {
        commands.push(arg);
      }
    } else {
      commands.push(arg);
    }
  }

  const command = commands[0];
  const outputDir = options.outputDir || path.join(__dirname, CONFIG.build.outputDir);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (command === '--list') {
    console.log('📝 Available pages:');
    console.log('');
    Object.keys(ENHANCED_PAGE_DEFINITIONS).forEach(pagePath => {
      const pageData = ENHANCED_PAGE_DEFINITIONS[pagePath];
      const status = pageData.priority >= 0.8 ? '🔥' : pageData.priority >= 0.6 ? '⭐' : '📄';
      console.log(`  ${status} ${pagePath.padEnd(45)} ${pageData.title}`);
    });
    console.log('');
    console.log(`Total pages: ${Object.keys(ENHANCED_PAGE_DEFINITIONS).length}`);
    return;
  }

  if (command === '--config') {
    console.log('⚙️  Current Configuration:');
    console.log('');
    console.log('Site:', CONFIG.site);
    console.log('Contact:', CONFIG.contact);
    console.log('Build:', CONFIG.build);
    console.log('Features:', CONFIG.features);
    return;
  }

  if (command === '--stats') {
    const pages = Object.values(ENHANCED_PAGE_DEFINITIONS);
    const categories = [...new Set(pages.map(p => p.category))];
    const contentTypes = [...new Set(pages.map(p => p.contentType))];
    
    console.log('📊 Generation Statistics:');
    console.log('');
    console.log(`Total pages: ${pages.length}`);
    console.log(`Categories: ${categories.join(', ')}`);
    console.log(`Content types: ${contentTypes.join(', ')}`);
    console.log(`High priority pages: ${pages.filter(p => p.priority >= 0.8).length}`);
    console.log(`Pages with sections: ${pages.filter(p => p.sections).length}`);
    console.log(`Pages with related content: ${pages.filter(p => p.relatedPages && p.relatedPages.length > 0).length}`);
    return;
  }

  if (command === '--sitemap') {
    const sitemap = generateEnhancedSitemap();
    const sitemapPath = path.join(outputDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);
    console.log(`✅ Enhanced sitemap generated: ${sitemapPath}`);
    return;
  }

  if (command === '--all') {
    console.log('🚀 Generating all pages...');
    console.log(`Output directory: ${outputDir}`);
    console.log(`Deterministic mode: ${options.deterministic ? 'enabled' : 'disabled'}`);
    console.log('');
    
    let generated = 0;
    let errors = 0;
    
    Object.keys(ENHANCED_PAGE_DEFINITIONS).forEach(pagePath => {
      try {
        const html = generateHTML(pagePath, options);
        const outputPath = path.join(outputDir, pagePath, 'index.html');
        
        // Create directory if it doesn't exist
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, html);
        const pageData = ENHANCED_PAGE_DEFINITIONS[pagePath];
        console.log(`✅ ${pagePath.padEnd(45)} ${pageData.h1}`);
        generated++;
      } catch (error) {
        console.error(`❌ ${pagePath.padEnd(45)} ${error.message}`);
        errors++;
      }
    });
    
    // Generate enhanced sitemap
    const sitemap = generateEnhancedSitemap();
    const sitemapPath = path.join(outputDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);
    
    console.log('');
    console.log(`🎉 Generation complete!`);
    console.log(`✅ Generated: ${generated} pages`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📄 Sitemap: ${sitemapPath}`);
    return;
  }

  // Generate single page
  const pagePath = command;
  
  if (!ENHANCED_PAGE_DEFINITIONS[pagePath]) {
    console.error(`❌ Page not found: ${pagePath}`);
    console.log('');
    console.log('Available pages:');
    Object.keys(ENHANCED_PAGE_DEFINITIONS).slice(0, 10).forEach(p => console.log(`  ${p}`));
    if (Object.keys(ENHANCED_PAGE_DEFINITIONS).length > 10) {
      console.log(`  ... and ${Object.keys(ENHANCED_PAGE_DEFINITIONS).length - 10} more`);
    }
    console.log('');
    console.log('Use --list to see all available pages');
    return;
  }

  try {
    const html = generateHTML(pagePath, options);
    const outputPath = path.join(outputDir, pagePath, 'index.html');
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, html);
    const pageData = ENHANCED_PAGE_DEFINITIONS[pagePath];
    
    console.log(`✅ Generated: ${outputPath}`);
    console.log(`📄 Title: ${pageData.title}`);
    console.log(`🏷️  Category: ${pageData.category}`);
    console.log(`⭐ Priority: ${pageData.priority}`);
    console.log(`🔄 Change frequency: ${pageData.changefreq}`);
    
    if (pageData.relatedPages && pageData.relatedPages.length > 0) {
      console.log(`🔗 Related pages: ${pageData.relatedPages.length}`);
    }
  } catch (error) {
    console.error(`❌ Error generating ${pagePath}:`, error.message);
    console.error(error.stack);
  }
}

// Export for programmatic use
module.exports = {
  generateHTML,
  generateEnhancedSitemap,
  ENHANCED_PAGE_DEFINITIONS,
  CONFIG
};

// Run if called directly
if (require.main === module) {
  main();
}