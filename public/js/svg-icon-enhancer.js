/**
 * SVG Icon Accessibility and Schema.org Enhancement
 * Dynamically adds proper accessibility markup and microdata to all SVG icons
 */

class SVGIconEnhancer {
  constructor() {
    this.iconData = {
      // Portfolio/Brand Icons
      "icon-politie-forum": {
        title: "Politie-Forum.nl",
        description:
          "Platform voor politieprofessionals — discussie en kennisdeling binnen de Nederlandse politie",
        url: "https://politie-forum.nl/",
        category: "Forum & Community",
        keywords: "politie, forum, discussie, kennisdeling",
      },
      "icon-politie-nl": {
        title: "Politie-NL.nl",
        description:
          "Informatieportaal over de Nederlandse politie — organisatie, taken en procedures",
        url: "https://politie-nl.nl/",
        category: "Informatieportaal",
        keywords: "politie, informatie, organisatie, procedures",
      },
      "icon-onderzoek-portaal": {
        title: "OnderzoekPortaal.nl",
        description:
          "Platform voor onderzoeksjournalistiek en data-analyse — transparante dossiers en feitenonderzoek",
        url: "https://onderzoekportaal.nl/",
        category: "Onderzoeksjournalistiek",
        keywords: "onderzoek, journalistiek, data-analyse, transparantie",
      },
      "icon-onderzoek-platform": {
        title: "OnderzoekPlatform.nl",
        description:
          "Onderzoeksplatform voor publieke informatie — open data en transparantie initiatieven",
        url: "https://onderzoekplatform.nl/",
        category: "Open Data Platform",
        keywords: "onderzoek, open data, transparantie, publieke informatie",
      },
      "icon-cybersecurity-ai": {
        title: "Cybersecurity-AI.eu",
        description:
          "Europees platform voor AI-gedreven cybersecurity — technologie en veiligheidsinnovatie",
        url: "https://cybersecurity-ai.eu/",
        category: "Cybersecurity & AI",
        keywords: "cybersecurity, AI, kunstmatige intelligentie, veiligheid",
      },
      "icon-digestpaper": {
        title: "DigestPaper Media",
        description:
          "Onafhankelijke uitgever — journalistiek, nieuws en onderzoek met transparantie",
        url: "https://digestpaper.com/",
        category: "Media & Uitgeverij",
        keywords: "uitgever, journalistiek, nieuws, transparantie",
      },
      "icon-headlines-magazine": {
        title: "HeadlinesMagazine.com",
        description:
          "Digitaal nieuwsmagazine — actuele nieuwsanalyses en achtergrondverhalen",
        url: "https://headlinesmagazine.com/",
        category: "Nieuwsmagazine",
        keywords: "nieuws, magazine, analyses, achtergrond",
      },
      "icon-het-nieuws": {
        title: "HetNieuws.app",
        description:
          "Mobiele nieuwsapplicatie — real-time nieuws en persoonlijke nieuwsfeeds",
        url: "https://hetnieuws.app/",
        category: "Nieuws App",
        keywords: "nieuws, app, mobiel, real-time",
      },
      "icon-cybersecurityad": {
        title: "CyberSecurityAD.com",
        description:
          "Cybersecurity consultancy — advies en implementatie van veiligheidsoplossingen",
        url: "https://cybersecurityad.com/",
        category: "Cybersecurity Consultancy",
        keywords: "cybersecurity, consultancy, advies, veiligheid",
      },

      // Functional Icons
      "icon-github": {
        title: "GitHub",
        description:
          "Code repository en versiecontrole — open source projecten en samenwerking",
        category: "Development Platform",
        keywords: "github, code, repository, open source",
      },
      "icon-linkedin": {
        title: "LinkedIn",
        description:
          "Professioneel netwerk — zakelijke connecties en carrièreontwikkeling",
        category: "Social Media",
        keywords: "linkedin, professioneel, netwerk, carrière",
      },
      "icon-instagram": {
        title: "Instagram",
        description: "Visueel social media platform — foto's en verhalen delen",
        category: "Social Media",
        keywords: "instagram, foto, visueel, social media",
      },
      "icon-patreon": {
        title: "Patreon",
        description:
          "Crowdfunding platform voor creators — abonnementen en ondersteuning",
        url: "https://www.patreon.com/cw/digestpaper",
        category: "Crowdfunding & Support",
        keywords: "patreon, crowdfunding, donaties, ondersteuning, creator",
      },
      "icon-building": {
        title: "Adres",
        description:
          "Fysieke locatie en kantooradres — bezoekadres en postadres informatie",
        category: "Contact Informatie",
        keywords: "adres, locatie, kantoor, bezoek",
      },
      "icon-phone": {
        title: "Telefoon",
        description:
          "Telefonische bereikbaarheid — directe communicatie en support",
        category: "Contact Informatie",
        keywords: "telefoon, contact, communicatie, support",
      },
      "icon-envelope": {
        title: "E-mail",
        description:
          "Elektronische communicatie — e-mail contact en correspondentie",
        category: "Contact Informatie",
        keywords: "email, elektronisch, communicatie, correspondentie",
      },

      // Policy Icons
      "icon-shield-halved": {
        title: "Veiligheid",
        description:
          "Beveiligingsbeleid en veiligheidsmaatregelen — bescherming van gegevens en privacy",
        category: "Veiligheid & Privacy",
        keywords: "veiligheid, beveiliging, privacy, bescherming",
      },
      "icon-gavel": {
        title: "Juridisch",
        description:
          "Juridische aspecten en rechtsgronden — wetgeving en compliance",
        category: "Juridisch",
        keywords: "juridisch, wet, recht, compliance",
      },
      "icon-scale-balanced": {
        title: "Principes",
        description:
          "Redactionele principes en ethische richtlijnen — journalistieke integriteit",
        category: "Ethiek & Principes",
        keywords: "principes, ethiek, integriteit, richtlijnen",
      },
      "icon-magnifying-glass": {
        title: "Fact-checking",
        description:
          "Feitencontrole en verificatie — waarheidsgetrouwe nieuwsrapportage",
        category: "Kwaliteitscontrole",
        keywords: "fact-check, verificatie, feiten, waarheid",
      },
      "icon-rotate-left": {
        title: "Correcties",
        description:
          "Correctiebeleid en transparantie — eerlijke foutenherstel en verbeteringen",
        category: "Transparantie",
        keywords: "correcties, transparantie, fouten, verbetering",
      },

      // Menu Icons
      "icon-menu-projects": {
        title: "Projecten",
        description:
          "Projectoverzicht en initiatieven — lopende en afgeronde projecten",
        category: "Navigatie",
        keywords: "projecten, initiatieven, overzicht",
      },
      "icon-menu-portfolio": {
        title: "Portfolio",
        description: "Portfolio en showcases — werk en realisaties overzicht",
        category: "Navigatie",
        keywords: "portfolio, werk, realisaties, showcase",
      },
      "icon-menu-data": {
        title: "Data",
        description: "Data en analyses — datasets en onderzoeksresultaten",
        category: "Navigatie",
        keywords: "data, analyses, datasets, onderzoek",
      },
      "icon-list-check": {
        title: "Projectlijst",
        description:
          "Georganiseerde projectenlijst — systematisch overzicht van initiatieven",
        category: "Organisatie",
        keywords: "lijst, projecten, organisatie, systematisch",
      },
      "icon-folder-tree": {
        title: "Mappenstructuur",
        description:
          "Hiërarchische bestandsorganisatie — gestructureerde informatie-architectuur",
        category: "Organisatie",
        keywords: "mappen, structuur, hiërarchie, organisatie",
      },
      "icon-user-shield": {
        title: "Gebruikersveiligheid",
        description:
          "Gebruikersbeveiliging en privacy — account en gegevensbescherming",
        category: "Gebruikerservaring",
        keywords: "gebruiker, veiligheid, privacy, bescherming",
      },

      // Additional Policy and Legal Icons
      "icon-cookie-bite": {
        title: "Cookie Beleid",
        description:
          "Cookie-beleid en tracking voorkeuren — transparantie over gegevensgebruik",
        category: "Privacy & Cookies",
        keywords: "cookies, tracking, privacy, voorkeuren",
      },
      "icon-file-contract": {
        title: "Algemene Voorwaarden",
        description:
          "Algemene voorwaarden en gebruiksregels — juridische overeenkomsten",
        category: "Juridische Documenten",
        keywords: "voorwaarden, contract, juridisch, overeenkomst",
      },
      "icon-universal-access": {
        title: "Toegankelijkheid",
        description:
          "Digitale toegankelijkheid en inclusie — toegankelijke website voor iedereen",
        category: "Toegankelijkheid",
        keywords: "toegankelijkheid, inclusie, handicap, bereikbaarheid",
      },
      "icon-lock": {
        title: "Beveiligingsbeleid",
        description:
          "Beveiligingsmaatregelen en protocollen — bescherming van systemen en gegevens",
        category: "Cyber Security",
        keywords: "beveiliging, security, bescherming, protocollen",
      },
      "icon-award": {
        title: "Erkenningen",
        description:
          "Onderscheidingen en certificeringen — kwaliteit en betrouwbaarheid waardering",
        category: "Kwaliteit & Certificering",
        keywords: "award, erkenning, certificaat, kwaliteit",
      },

      // Financial and Business Icons
      "icon-coins": {
        title: "Financiering",
        description:
          "Financieringsstructuur en transparantie — inkomstenbronnen en funding",
        category: "Financiële Transparantie",
        keywords: "financiering, geld, inkomsten, transparantie",
      },
      "icon-uitgeversportfolio": {
        title: "Uitgeversportfolio",
        description:
          "Portfolio van uitgeverij projecten — overzicht van publicaties en initiatieven",
        category: "Portfolio Overzicht",
        keywords: "portfolio, uitgeverij, projecten, publicaties",
      },
      "icon-handshake-angle": {
        title: "Samenwerking",
        description:
          "Partnerschappen en samenwerkingsverbanden — netwerkrelaties",
        category: "Partnerships",
        keywords: "samenwerking, handshake, partnerschap, netwerk",
      },

      // Font Awesome Replacement Icons
      "icon-code": {
        title: "Software Ontwikkeling",
        description:
          "Programmeren en softwareontwikkeling — technische expertise en coding projecten",
        category: "Technologie",
        keywords: "code, programmeren, software, ontwikkeling, technologie",
      },
      "icon-globe": {
        title: "Websites",
        description:
          "Webprojecten en online platforms — digitale aanwezigheid en web development",
        category: "Technologie",
        keywords: "websites, web, internet, online, platforms",
      },
      "icon-robot": {
        title: "Artificial Intelligence",
        description:
          "AI-onderwerpen en machine learning — kunstmatige intelligentie en automatisering",
        category: "AI & Technologie",
        keywords: "AI, robot, machine learning, automatisering, intelligentie",
      },
      "icon-user-secret": {
        title: "Politie",
        description:
          "Politie en opsporingsdiensten — veiligheid en rechtshandhaving nieuws",
        category: "Politie & Veiligheid",
        keywords: "politie, opsporing, veiligheid, recherche, detective",
      },
      "icon-triangle-exclamation": {
        title: "Illegale Activiteiten",
        description:
          "Waarschuwingen over illegale activiteiten — criminaliteit en misdaadbestrijding",
        category: "Misdaad & Recht",
        keywords: "illegaal, waarschuwing, criminaliteit, misdaad, alert",
      },
      "icon-id-badge": {
        title: "Identificatie",
        description:
          "Identiteitsdocumenten en persoonlijke identificatie — legitimatie en verificatie",
        category: "Identiteit & Documenten",
        keywords: "ID, identiteit, badge, legitimatie, verificatie",
      },
      "icon-people-robbery": {
        title: "Criminaliteit",
        description:
          "Criminele activiteiten en misdaad — delicten en rechtszaken",
        category: "Misdaad & Recht",
        keywords: "criminaliteit, misdaad, diefstal, delict, rechtszaak",
      },
      "icon-circle-info": {
        title: "Informatie",
        description:
          "Algemene informatie en toelichting — achtergrond en context",
        category: "Informatie",
        keywords: "info, informatie, toelichting, uitleg, context",
      },
      "icon-user-group": {
        title: "Team Overzicht",
        description:
          "Teamleden en groepssamenstelling — organisatiestructuur en samenwerking",
        category: "Organisatie",
        keywords: "team, groep, organisatie, samenwerking, mensen",
      },
      "icon-id-card": {
        title: "Persoonlijke Gegevens",
        description:
          "Persoonlijke identificatie en profielinformatie — individuele gegevens",
        category: "Persoonlijk",
        keywords: "persoonlijk, profiel, kaart, gegevens, identiteit",
      },
      "icon-users": {
        title: "Masthead",
        description: "Redactie en teamleden — personen achter de organisatie",
        category: "Organisatie",
        keywords: "masthead, redactie, team, personen, organisatie",
      },
      "icon-piggy-bank": {
        title: "Financiering",
        description:
          "Financiële ondersteuning en funding — inkomstenbronnen en sponsoring",
        category: "Financiën",
        keywords: "financiering, funding, geld, sponsoring, ondersteuning",
      },
      "icon-handshake": {
        title: "Eigendom",
        description:
          "Eigendomsstructuur en partnerships — organisatie-eigendom en samenwerkingen",
        category: "Eigendom & Partnerships",
        keywords:
          "eigendom, partnerschap, samenwerking, overeenkomst, handshake",
      },
      "icon-microchip": {
        title: "Data",
        description:
          "Data en technische informatie — datasets en technische systemen",
        category: "Data & Technologie",
        keywords: "data, technologie, chip, systemen, informatie",
      },
      "icon-database": {
        title: "Database",
        description:
          "Databases en gegevensopslag — informatiesystemen en data management",
        category: "Data & Technologie",
        keywords: "database, opslag, gegevens, systemen, data",
      },
      "icon-screwdriver-wrench": {
        title: "Tools",
        description:
          "Hulpmiddelen en instrumenten — praktische tools en utilities",
        category: "Tools & Utilities",
        keywords: "tools, hulpmiddelen, instrumenten, utilities, gereedschap",
      },
      "icon-check": {
        title: "Bevestiging",
        description: "Bevestiging en goedkeuring — akkoord en verificatie",
        category: "Bevestiging",
        keywords: "check, bevestiging, akkoord, goedkeuring, juist",
      },
      "icon-flask": {
        title: "Labs",
        description: "Laboratorium en experimenten — onderzoek en prototyping",
        category: "Labs & Onderzoek",
        keywords: "labs, laboratorium, experimenten, onderzoek, prototyping",
      },
      "icon-paper-plane": {
        title: "Contact",
        description: "Berichten en communicatie — contact en correspondentie",
        category: "Communicatie",
        keywords: "contact, bericht, communicatie, mail, correspondentie",
      },
      "icon-bullhorn": {
        title: "Pers & Media",
        description: "Pers en media contacten — persmeldingen en mediarelaties",
        category: "Media & Communicatie",
        keywords: "pers, media, persmeldingen, publiciteit, communicatie",
      },
      "icon-circle-half-stroke": {
        title: "Thema Wisselen",
        description:
          "Thema wisselen tussen licht en donker — gebruikersvoorkeuren",
        category: "Interface",
        keywords: "thema, donker, licht, toggle, voorkeuren",
      },
      "icon-shield-check": {
        title: "Beveiliging",
        description:
          "Beveiligingsverificatie en bescherming — veiligheidscontrole",
        category: "Beveiliging",
        keywords: "beveiliging, verificatie, bescherming, veiligheid, controle",
      },
      "icon-newspaper": {
        title: "Nieuws",
        description: "Nieuws en berichten — actuele informatie en updates",
        category: "Nieuws & Media",
        keywords: "nieuws, berichten, updates, informatie, actueel",
      },
      "icon-square-rss": {
        title: "RSS Feed",
        description: "RSS feed abonnement — nieuws syndication",
        category: "Feeds & Abonnementen",
        keywords: "RSS, feed, abonnement, syndication, nieuws",
      },
      "icon-rss": {
        title: "RSS",
        description: "RSS feed standaard — nieuws syndication",
        category: "Feeds & Abonnementen",
        keywords: "RSS, feed, syndication, nieuws, updates",
      },
      "icon-book-open": {
        title: "Handboek",
        description: "Handboek en documentatie — richtlijnen en procedures",
        category: "Documentatie",
        keywords: "handboek, documentatie, richtlijnen, procedures, gids",
      },
      "icon-clipboard-check": {
        title: "Verificatie",
        description: "Verificatie en controle — fact-checking en validatie",
        category: "Verificatie & Controle",
        keywords: "verificatie, controle, fact-checking, validatie, check",
      },
      "icon-pen-to-square": {
        title: "Bewerken",
        description: "Bewerken en wijzigen — correcties en aanpassingen",
        category: "Bewerking & Correcties",
        keywords: "bewerken, wijzigen, correcties, aanpassingen, edit",
      },
      "icon-rotate": {
        title: "Herstel",
        description: "Draaien en herstellen — terugzetten en updaten",
        category: "Herstel & Updates",
        keywords: "herstel, draaien, terugzetten, update, refresh",
      },
      "icon-chart-line": {
        title: "Statistieken",
        description: "Grafieken en statistieken — data-visualisatie en trends",
        category: "Data & Analytics",
        keywords: "statistieken, grafieken, data, visualisatie, trends",
      },
      "icon-map-pin": {
        title: "Locatie",
        description: "Kaart en locatie — adres en geografische positie",
        category: "Locatie & Navigatie",
        keywords: "locatie, kaart, adres, positie, pin, map",
      },
    };

    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.enhanceAllIcons()
      );
    } else {
      this.enhanceAllIcons();
    }

    // Watch for dynamically added icons
    this.observeForNewIcons();
  }

  enhanceAllIcons() {
    // Find all SVG elements with use elements
    const svgs = document.querySelectorAll("svg");

    svgs.forEach((svg) => {
      const useElement = svg.querySelector('use[href^="#icon-"]');
      if (useElement) {
        this.enhanceIcon(svg, useElement);
      }
    });

    console.log(
      "[SVG Enhancer] Enhanced",
      svgs.length,
      "SVG icons with accessibility + wrapper microdata"
    );
  }

  enhanceIcon(svg, useElement) {
    const iconId = useElement.getAttribute("href").substring(1); // Remove the #
    const iconInfo = this.iconData[iconId];

    if (!iconInfo) {
      console.warn(`[SVG Enhancer] No data found for icon: ${iconId}`);
      return;
    }

    // Generate unique IDs for this icon instance
    const instanceId = this.generateUniqueId(iconId);
    const titleId = `title-${instanceId}`;
    const descId = `desc-${instanceId}`;

    // Add/update SVG attributes for accessibility only
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-labelledby", `${titleId} ${descId}`);

    // Set default size if not present
    if (!svg.getAttribute("width")) svg.setAttribute("width", "40");
    if (!svg.getAttribute("height")) svg.setAttribute("height", "40");

    // Remove any existing title/desc elements to avoid duplicates
    const existingTitle = svg.querySelector("title");
    const existingDesc = svg.querySelector("desc");
    if (existingTitle) existingTitle.remove();
    if (existingDesc) existingDesc.remove();

    // Create title element for accessibility
    const title = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title"
    );
    title.id = titleId;
    title.textContent = iconInfo.title;

    // Create desc element for accessibility
    const desc = document.createElementNS("http://www.w3.org/2000/svg", "desc");
    desc.id = descId;
    desc.textContent = iconInfo.description;

    // Add elements before the use element
    svg.insertBefore(title, useElement);
    svg.insertBefore(desc, useElement);

    // Add schema.org microdata to wrapper/container (not SVG itself)
    this.addSchemaOrgData(svg, iconInfo);

    // Add CSS class for enhanced icons
    svg.classList.add("enhanced-icon");
  }

  addSchemaOrgData(svg, iconInfo) {
    // Find the closest container that should have microdata
    let container = svg.closest(
      "li, .portfolio-brand, article, section, .nav-dropdown"
    );

    if (!container) {
      // Create a wrapper if none exists
      container = document.createElement("div");
      container.className = "icon-wrapper";
      svg.parentNode.insertBefore(container, svg);
      container.appendChild(svg);
    }

    // Skip if container already has microdata to prevent duplicates
    if (container.hasAttribute("itemscope") && container.dataset.enhanced) {
      return;
    }

    // Mark as enhanced to prevent re-processing
    container.dataset.enhanced = "true";

    // Determine schema type based on icon context
    let schemaType = "https://schema.org/Thing"; // Default fallback

    if (iconInfo.url) {
      schemaType = "https://schema.org/WebSite";
    } else if (iconInfo.category === "Contact Informatie") {
      schemaType = "https://schema.org/ContactPoint";
    } else if (iconInfo.category === "Organisatie") {
      schemaType = "https://schema.org/Organization";
    } else if (iconInfo.category?.includes("Media")) {
      schemaType = "https://schema.org/MediaObject";
    }

    // Add microdata to container (not SVG)
    container.setAttribute("itemscope", "");
    container.setAttribute("itemtype", schemaType);

    // Try to find existing visible elements and add microdata to them
    let urlElement = container.querySelector("a[href]");
    let nameElement = container.querySelector(
      'h3 span, h4, .brand-name, [data-name], span[itemprop="name"]'
    );
    let descElement = container.querySelector(".brand-desc, .description, p");

    // Add itemprop to existing visible elements
    if (urlElement && !urlElement.hasAttribute("itemprop")) {
      urlElement.setAttribute("itemprop", "url");
    }
    if (nameElement && !nameElement.hasAttribute("itemprop")) {
      nameElement.setAttribute("itemprop", "name");
    }
    if (descElement && !descElement.hasAttribute("itemprop")) {
      descElement.setAttribute("itemprop", "description");
    }

    // Add fallback meta elements only if no visible elements found
    if (!nameElement) {
      this.addMetaElement(container, "name", iconInfo.title);
    }
    if (iconInfo.url && !urlElement) {
      this.addMetaElement(container, "url", iconInfo.url);
    }
    if (!descElement) {
      this.addMetaElement(container, "description", iconInfo.description);
    }

    // Add category and keywords as meta (not typically visible)
    if (iconInfo.category) {
      this.addMetaElement(container, "category", iconInfo.category);
    }
    if (iconInfo.keywords) {
      this.addMetaElement(container, "keywords", iconInfo.keywords);
    }
  }

  addMetaElement(container, property, content) {
    if (!content) return;

    // Check if meta element with this itemprop already exists
    const existingMeta = container.querySelector(
      `meta[itemprop="${property}"]`
    );
    if (existingMeta) return;

    const meta = document.createElement("meta");
    meta.setAttribute("itemprop", property);
    meta.setAttribute("content", content);
    meta.style.display = "none"; // Hidden meta data
    container.appendChild(meta);
  }

  generateUniqueId(iconId) {
    // Generate a unique ID for this icon instance
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${iconId}-${timestamp}-${random}`;
  }

  observeForNewIcons() {
    // Use MutationObserver to catch dynamically added icons
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is an SVG or contains SVGs
            const svgs =
              node.tagName === "SVG"
                ? [node]
                : node.querySelectorAll?.("svg") || [];

            svgs.forEach((svg) => {
              const useElement = svg.querySelector('use[href^="#icon-"]');
              if (useElement && !svg.classList.contains("enhanced-icon")) {
                this.enhanceIcon(svg, useElement);
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Static method to manually enhance a specific icon
  static enhanceSpecificIcon(svg) {
    const enhancer = new SVGIconEnhancer();
    const useElement = svg.querySelector('use[href^="#icon-"]');
    if (useElement) {
      enhancer.enhanceIcon(svg, useElement);
    }
  }
}

// Auto-initialize when script loads
new SVGIconEnhancer();

// Also expose the class globally for manual use
window.SVGIconEnhancer = SVGIconEnhancer;
