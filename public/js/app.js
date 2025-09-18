// /js/app.js
import {
  logEvent as gaLogEvent,
  getAnalytics,
  isSupported,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD4L4yGM63ZAhY9vpVHAlDfYka9qdAqGA4",
  authDomain: "botanic-wiki-static-v1.firebaseapp.com",
  projectId: "botanic-wiki-static-v1",
  storageBucket: "botanic-wiki-static-v1.firebasestorage.app",
  messagingSenderId: "1071998750169",
  appId: "1:1071998750169:web:58ee90a1037b5cb4bb9dc8",
  measurementId: "G-S20D4FG0BE",
};

// Firestore-only config for blockchainkix-com-fy
const firestoreConfig = {
  apiKey: "AIzaSyDCRYKrWUvtOtDAY4TThjlm7AxkzHG-62s",
  authDomain: "blockchainkix-com-fy.firebaseapp.com",
  projectId: "blockchainkix-com-fy",
  storageBucket: "blockchainkix-com-fy.firebasestorage.app",
  messagingSenderId: "148890561425",
  appId: "1:148890561425:web:7cba0e7477141e3a880830",
};

// Ready gate
window.firebaseReady = (async () => {
  try {
    // Initialize primary app (botanic-wiki-static-v1) for auth, firestore, analytics
    const app = initializeApp(firebaseConfig);

    // Initialize secondary app only for Firestore access (blockchainkix-com-fy)
    const firestoreApp = initializeApp(firestoreConfig, "firestoreApp");

    // Use primary app for auth and analytics
    const auth = getAuth(app);

    // Use secondary app for Firestore
    const firestore = getFirestore(firestoreApp);

    let analytics = null;
    // Analytics from primary app with correct measurement ID
    try {
      analytics = (await isSupported()) ? getAnalytics(app) : null;
    } catch (e) {
      console.warn("[Firebase] Analytics unavailable:", e?.message || e);
    }

    Object.assign(window, {
      firebaseApp: app, // Primary app (botanic-wiki-static-v1)
      firebaseFirestoreApp: firestoreApp, // Secondary app (blockchainkix-com-fy) for Firestore only
      firebaseAuth: auth, // From primary app
      firebaseFirestore: firestore, // From secondary app (Firestore only)
      firebaseAnalytics: analytics, // From primary app (G-S20D4FG0BE)
    });

    console.log("[Firebase] Initialized with hybrid setup:");
    console.log("  - Primary app (auth, analytics):", app.options.projectId);
    console.log(
      "  - Firestore app (Firestore only):",
      firestoreApp.options.projectId
    );
    return true;
  } catch (err) {
    console.error("[Firebase] Init failed:", err);
    return false;
  }
})();

/* -------------------- DARK MODE -------------------- */
(function darkMode() {
  const toggle = document.getElementById("darkModeToggle");
  const iconEl = document.getElementById("darkModeIcon");
  if (!toggle) return;

  const apply = (isDark) => {
    document.body.classList.toggle("dark-mode", isDark); // jouw CSS
    document.documentElement.classList.toggle("dark", isDark); // Tailwind pattern
    document.documentElement.dataset.theme = isDark ? "dark" : "light"; // [data-theme]
    if (iconEl) iconEl.className = isDark ? "fas fa-sun" : "fas fa-moon";
    localStorage.setItem("darkMode", isDark ? "dark" : "light");
  };

  const saved = localStorage.getItem("darkMode");
  const prefers = window.matchMedia("(prefers-color-scheme: dark)");
  apply(saved ? saved === "dark" : prefers.matches);

  toggle.addEventListener("click", () =>
    apply(!document.body.classList.contains("dark-mode"))
  );
  prefers.addEventListener("change", (e) => {
    if (!localStorage.getItem("darkMode")) apply(e.matches);
  });
})();

/* -------------------- UI zonder Firebase -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const mobileNav = document.getElementById("mobileNav");
  const scrollTopBtn = document.getElementById("scrollTop");

  // Mobile menu functionality
  if (mobileMenuToggle && mobileNav) {
    console.log("🍔 Mobile menu elements found");

    mobileMenuToggle.addEventListener("click", function () {
      console.log("🍔 Mobile menu toggle clicked");
      const isExpanded = this.getAttribute("aria-expanded") === "true";

      // Toggle button state
      this.setAttribute("aria-expanded", !isExpanded);

      // Toggle menu visibility
      if (isExpanded) {
        mobileNav.setAttribute("hidden", "");
        mobileNav.setAttribute("aria-hidden", "true");
        console.log("🍔 Menu closed");
      } else {
        mobileNav.removeAttribute("hidden");
        mobileNav.setAttribute("aria-hidden", "false");
        console.log("🍔 Menu opened");
      }

      // Add/remove active class for hamburger animation
      this.classList.toggle("active", !isExpanded);
    });

    // Close menu when clicking outside
    document.addEventListener("click", function (event) {
      if (
        !mobileNav.contains(event.target) &&
        !mobileMenuToggle.contains(event.target)
      ) {
        mobileMenuToggle.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("hidden", "");
        mobileNav.setAttribute("aria-hidden", "true");
        mobileMenuToggle.classList.remove("active");
      }
    });

    // Close menu on escape key
    document.addEventListener("keydown", function (event) {
      if (
        event.key === "Escape" &&
        mobileMenuToggle.getAttribute("aria-expanded") === "true"
      ) {
        mobileMenuToggle.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("hidden", "");
        mobileNav.setAttribute("aria-hidden", "true");
        mobileMenuToggle.classList.remove("active");
        mobileMenuToggle.focus();
      }
    });
  } else {
    console.log("❌ Mobile menu elements not found:", {
      toggle: !!mobileMenuToggle,
      nav: !!mobileNav,
    });
  }

  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      scrollTopBtn.classList.toggle("visible", window.pageYOffset > 300);
    });
    scrollTopBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }
});

/* -------------------- Firebase-gebonden features -------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const ok = await (window.firebaseReady || Promise.resolve(false));
  if (!ok) {
    console.warn("[App] Firebase not ready; showing fallbacks only.");
    initNewsFlasherFallback();
    renderNoArticlesMessage();
    return;
  }

  // DOM Elements for new news loader
  const newsFlashContent = document.getElementById("news-flash-content");
  const categoriesContainer = document.getElementById("categories-container");
  const articlesContainer = document.getElementById("articles-container");
  const tagsContainer = document.getElementById("tags-container");

  const auth = window.firebaseAuth;
  const db = window.firebaseDb;
  const firestore = window.firebaseFirestore;
  const logEvent = (...args) => {
    try {
      if (window.firebaseAnalytics)
        gaLogEvent(window.firebaseAnalytics, ...args);
    } catch {}
  };

  /* ---------- Auth UI ---------- */
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const authModal = document.getElementById("authModal");
  const closeModalBtn = document.getElementById("closeModal");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const formTabs = document.querySelectorAll(".form-tab");
  const authError = document.getElementById("authError");
  const userLoggedIn = document.getElementById("userLoggedIn");
  const userLoggedOut = document.getElementById("userLoggedOut");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");
  const userWidgetTitle = document.getElementById("userWidgetTitle");
  const headerLogin = document.getElementById("headerLogin");
  const headerLogout = document.getElementById("headerLogout");
  const headerUserAdmin = document.getElementById("headerUserAdmin");
  const headerUserName = document.getElementById("headerUserName");
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const googleRegisterBtn = document.getElementById("googleRegisterBtn");

  const qs = (s, r = document) => r.querySelector(s);

  formTabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      formTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isLogin = tab.dataset.tab === "login";
      if (loginForm) loginForm.style.display = isLogin ? "block" : "none";
      if (registerForm) registerForm.style.display = isLogin ? "none" : "block";
      qs(".modal-title").textContent = isLogin ? "Inloggen" : "Registreren";
    })
  );

  loginBtn?.addEventListener("click", () => {
    if (authModal) authModal.style.display = "block";
  });
  headerLogin?.addEventListener("click", () => {
    if (authModal) authModal.style.display = "block";
  });
  headerLogout?.addEventListener("click", async () => {
    if (!headerLogout) return;
    headerLogout.disabled = true;
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      headerLogout.disabled = false;
    }
  });

  // Add double-click logout to user admin link
  headerUserAdmin?.addEventListener("dblclick", async (e) => {
    e.preventDefault();
    if (!headerUserAdmin) return;
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Logout failed:", e);
      }
    }
  });

  closeModalBtn?.addEventListener("click", closeAuth);
  window.addEventListener("click", (e) => {
    if (e.target === authModal) closeAuth();
  });
  function closeAuth() {
    if (!authModal) return;
    authModal.style.display = "none";
    loginForm?.reset();
    registerForm?.reset();
    if (authError) authError.style.display = "none";
  }

  // Google authentication event listeners
  googleLoginBtn?.addEventListener("click", async () => {
    if (!googleLoginBtn) return;
    googleLoginBtn.disabled = true;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      closeAuth(); // Close modal on successful login
    } catch (e) {
      console.error("Google login failed:", e);
      showAuthError("Google inloggen mislukt: " + (e?.message || e));
    } finally {
      googleLoginBtn.disabled = false;
    }
  });

  googleRegisterBtn?.addEventListener("click", async () => {
    if (!googleRegisterBtn) return;
    googleRegisterBtn.disabled = true;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      closeAuth(); // Close modal on successful registration
    } catch (e) {
      console.error("Google registration failed:", e);
      showAuthError("Google registratie mislukt: " + (e?.message || e));
    } finally {
      googleRegisterBtn.disabled = false;
    }
  });

  qs("#showRegisterForm")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("register");
  });
  qs("#showLoginForm")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("login");
  });
  function switchTab(which) {
    formTabs.forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === which)
    );
    const isLogin = which === "login";
    if (loginForm) loginForm.style.display = isLogin ? "block" : "none";
    if (registerForm) registerForm.style.display = isLogin ? "none" : "block";
    qs(".modal-title").textContent = isLogin ? "Inloggen" : "Registreren";
  }

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = qs("#loginEmail").value;
    const password = qs("#loginPassword").value;
    const btn = loginForm.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig...';
    if (authError) authError.style.display = "none";
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      closeAuth();
      updateUserUI(cred.user);
      logEvent("login", { method: "email" });
    } catch (error) {
      showAuthError(mapAuthError(error));
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = qs("#registerName").value;
    const email = qs("#registerEmail").value;
    const password = qs("#registerPassword").value;
    const confirm = qs("#registerConfirmPassword").value;
    if (password !== confirm)
      return showAuthError("Wachtwoorden komen niet overeen.");
    const btn = registerForm.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig...';
    if (authError) authError.style.display = "none";
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await addDoc(collection(firestore, "users"), {
        name,
        email,
        createdAt: new Date().toISOString(),
        role: "user",
      });
      closeAuth();
      updateUserUI(cred.user);
      logEvent("sign_up", { method: "email" });
    } catch (error) {
      showAuthError(mapAuthError(error));
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await signOut(auth);
      if (userLoggedIn) userLoggedIn.style.display = "none";
      if (userLoggedOut) userLoggedOut.style.display = "block";
      logEvent("logout");
    } catch (e) {
      console.error("Logout error:", e);
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) updateUserUI(user);
    else {
      if (userLoggedIn) userLoggedIn.style.display = "none";
      if (userLoggedOut) userLoggedOut.style.display = "block";
      if (userWidgetTitle) userWidgetTitle.textContent = "Gratis Registreren!";
      if (headerLogin) headerLogin.style.display = "block";
      if (headerUserAdmin) headerUserAdmin.style.display = "none";
    }
  });

  // Initialize enhanced news loader components
  loadNewsFlash();
  loadForumCategories();
  loadRecentArticles();
  loadPopularTags();

  function updateUserUI(user) {
    const name = user.displayName || "User";
    if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();
    if (userName) userName.textContent = name;
    if (userWidgetTitle) userWidgetTitle.textContent = `👤 ${name}`;
    if (userLoggedIn) userLoggedIn.style.display = "block";
    if (userLoggedOut) userLoggedOut.style.display = "none";
    if (headerLogin) headerLogin.style.display = "none";
    if (headerUserAdmin) {
      headerUserAdmin.style.display = "flex";
      headerUserAdmin.title = `Gebruiker Admin - ${name}`;
    }
    if (headerUserName) headerUserName.textContent = name;
  }
  function showAuthError(msg) {
    if (!authError) return;
    authError.style.display = "block";
    authError.textContent = msg;
  }
  function mapAuthError(error) {
    const map = {
      "auth/user-not-found":
        "Er is geen gebruiker gevonden met dit e-mailadres.",
      "auth/wrong-password": "Onjuist wachtwoord, probeer opnieuw.",
      "auth/too-many-requests":
        "Te veel inlogpogingen. Probeer het later opnieuw.",
      "auth/email-already-in-use": "Dit e-mailadres is al in gebruik.",
      "auth/weak-password": "Het wachtwoord moet minstens 6 tekens lang zijn.",
    };
    return map[error.code] || "Er is een fout opgetreden: " + error.message;
  }

  /* ---------- Newsletter ---------- */
  const newsletterForm = document.getElementById("newsletterForm");
  newsletterForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = newsletterForm.querySelector('input[type="email"]').value;
    try {
      await addDoc(collection(firestore, "newsletter-subscribers"), {
        email,
        timestamp: new Date().toISOString(),
        source: "forum",
      });
      alert(`Bedankt voor je aanmelding voor forum notificaties met: ${email}`);
      newsletterForm.reset();
      logEvent("sign_up", { method: "newsletter" });
    } catch (err) {
      console.error("Newsletter error:", err);
      alert(
        "Er is een fout opgetreden bij het aanmelden. Probeer het later opnieuw."
      );
    }
  });

  /* ---------- News flasher ---------- */
  async function loadNewsFlash() {
    const flasherContent = document.querySelector(".flasher-content");
    if (!flasherContent) return;

    try {
      // Use Firestore to get news titles from articles_rewritten_digestpaper collection
      const snap = await getDocs(
        collection(firestore, "articles_rewritten_digestpaper")
      );
      if (snap.empty) {
        renderNewsFlashFallback(flasherContent);
        return;
      }

      const articles = snap.docs
        .map((doc) => doc.data())
        .filter((a) => a.title)
        .sort((a, b) => {
          const timeA = a.timestamp?.seconds
            ? a.timestamp.seconds
            : new Date(a.timestamp || 0).getTime() / 1000;
          const timeB = b.timestamp?.seconds
            ? b.timestamp.seconds
            : new Date(b.timestamp || 0).getTime() / 1000;
          return timeB - timeA;
        })
        .slice(0, 5);

      flasherContent.innerHTML = "";

      if (articles.length === 0) {
        renderNewsFlashFallback(flasherContent);
        return;
      }

      // Create ticker with news items
      const ticker = document.createElement("div");
      ticker.className = "news-ticker";

      // Define icons for different categories
      const categoryIcons = {
        Politie: "#icon-politie-nl",
        Veiligheid: "#icon-shield-halved",
        Cybersecurity: "#icon-cybersecurity-ai",
        Nieuws: "#icon-het-nieuws",
        Juridisch: "#icon-gavel",
        Onderzoek: "#icon-onderzoek-portaal",
        Tech: "#icon-headlines-magazine",
        default: "#icon-digestpaper",
      };

      articles.forEach((article, i) => {
        const newsItem = document.createElement("span");
        newsItem.className = "news-item";
        newsItem.dataset.id = article.id || i;

        // Select appropriate icon based on category
        const category = (article.category || "").trim();
        const iconRef = categoryIcons[category] || categoryIcons.default;

        // Create icon SVG element
        const iconSvg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        iconSvg.setAttribute("width", "16");
        iconSvg.setAttribute("height", "16");
        iconSvg.setAttribute("role", "img");
        iconSvg.setAttribute("aria-hidden", "true");
        iconSvg.classList.add("news-item-icon");

        // Create use element to reference the icon
        const useElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "use"
        );
        useElement.setAttribute("href", iconRef); // Use href instead of xlink:href for modern browsers
        iconSvg.appendChild(useElement);

        // Enhance the icon after creation
        setTimeout(() => {
          if (window.SVGIconEnhancer) {
            window.SVGIconEnhancer.enhanceSpecificIcon(iconSvg);
          }
        }, 0);

        // Create text span for the title
        const textSpan = document.createElement("span");
        textSpan.textContent = article.title;
        textSpan.className = "news-item-text";

        // Add both to news item
        newsItem.appendChild(iconSvg);
        newsItem.appendChild(textSpan);

        // Make the news item clickable to view full article
        newsItem.style.cursor = "pointer";
        newsItem.addEventListener("click", () => {
          const slug =
            article.slug ||
            article.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");
          window.open(`/article/${slug}`, "_blank");
        });

        ticker.appendChild(newsItem);

        // Add separator except after the last item
        if (i < articles.length - 1) {
          const separator = document.createElement("span");
          separator.className = "news-separator";
          separator.textContent = " • ";
          ticker.appendChild(separator);
        }
      });

      // For continuous scroll effect, clone the content
      ticker.innerHTML += ticker.innerHTML;

      flasherContent.appendChild(ticker);

      // Add animation for scrolling effect
      const tickerWidth = ticker.scrollWidth / 2;
      const duration = tickerWidth * 0.02; // Adjust speed as needed

      // Apply the animation
      ticker.style.animation = `ticker ${duration}s linear infinite`;
      ticker.style.width = "max-content";
      flasherContent.style.overflow = "hidden";

      // Add CSS if it doesn't exist
      if (!document.getElementById("news-ticker-style")) {
        const style = document.createElement("style");
        style.id = "news-ticker-style";
        style.textContent = `
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .news-ticker {
            display: inline-block;
            white-space: nowrap;
            padding: 10px 0;
          }
          .news-item {
            display: inline-block;
            padding: 0 10px;
            color: var(--accent);
            font-weight: 500;
          }
          .news-item:hover {
            color: var(--accent-hover);
            text-decoration: underline;
          }
        `;
        document.head.appendChild(style);
      }
    } catch (error) {
      console.error("Error loading news flash:", error);
      renderNewsFlashFallback(flasherContent);
    }
  }

  function renderNewsFlashFallback(container) {
    if (!container) return;

    const defaults = [
      {
        title:
          "Twee verdachten aangehouden na gewapende overval in Amsterdam-Zuid",
        category: "Politie",
      },
      {
        title: "Politie waarschuwt voor nieuwe oplichtingstruc via WhatsApp",
        category: "Veiligheid",
      },
      {
        title: "Vermist meisje (8) gezocht in Amsterdam-Noord",
        category: "Politie",
      },
      { title: "Grote drugsvangst in Rotterdamse haven", category: "Politie" },
      {
        title: "Inbraakgolf in Eindhoven: politie zoekt getuigen",
        category: "Veiligheid",
      },
    ];

    // Define icons for different categories
    const categoryIcons = {
      Politie: "#icon-politie-nl",
      Veiligheid: "#icon-shield-halved",
      Cybersecurity: "#icon-cybersecurity-ai",
      Nieuws: "#icon-het-nieuws",
      Juridisch: "#icon-gavel",
      Onderzoek: "#icon-onderzoek-portaal",
      Tech: "#icon-headlines-magazine",
      default: "#icon-digestpaper",
    };

    container.innerHTML = "";
    const ticker = document.createElement("div");
    ticker.className = "news-ticker";

    defaults.forEach((item, i) => {
      const newsItem = document.createElement("span");
      newsItem.className = "news-item";

      // Select appropriate icon based on category
      const category = (item.category || "").trim();
      const iconRef = categoryIcons[category] || categoryIcons.default;

      // Create icon SVG element
      const iconSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      iconSvg.setAttribute("width", "16");
      iconSvg.setAttribute("height", "16");
      iconSvg.setAttribute("role", "img");
      iconSvg.setAttribute("aria-hidden", "true");
      iconSvg.classList.add("news-item-icon");

      // Create use element to reference the icon
      const useElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "use"
      );
      useElement.setAttribute("href", iconRef); // Use href instead of xlink:href for modern browsers
      iconSvg.appendChild(useElement);

      // Enhance the icon after creation
      setTimeout(() => {
        if (window.SVGIconEnhancer) {
          window.SVGIconEnhancer.enhanceSpecificIcon(iconSvg);
        }
      }, 0);

      // Create text span for the title
      const textSpan = document.createElement("span");
      textSpan.textContent = item.title;
      textSpan.className = "news-item-text";

      // Add both to news item
      newsItem.appendChild(iconSvg);
      newsItem.appendChild(textSpan);

      ticker.appendChild(newsItem);

      if (i < defaults.length - 1) {
        const separator = document.createElement("span");
        separator.className = "news-separator";
        separator.textContent = " • ";
        ticker.appendChild(separator);
      }
    });

    ticker.innerHTML += ticker.innerHTML;
    container.appendChild(ticker);

    // Add animation
    const tickerWidth = ticker.scrollWidth / 2;
    const duration = tickerWidth * 0.02;
    ticker.style.animation = `ticker ${duration}s linear infinite`;
    ticker.style.width = "max-content";
    container.style.overflow = "hidden";
  }

  /* ---------- Forum Categories and Article Loading ---------- */
  let forumCategories = [];
  let forumSections = [];

  async function loadForumCategories() {
    const categoriesContainer = document.getElementById("categories-container");
    if (!categoriesContainer) return;

    try {
      // Get categories from Firestore
      const categoriesSnap = await getDocs(
        collection(firestore, "forum-categories")
      );
      if (!categoriesSnap.empty) {
        forumCategories = categoriesSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      } else {
        forumCategories = [
          { id: "algemeen", name: "Algemene categorieën", order: 1 },
          { id: "actueel", name: "Actueel Nieuws", order: 2 },
        ];
      }

      // Get sections from Firestore
      const sectionsSnap = await getDocs(
        collection(firestore, "forum-sections")
      );
      if (!sectionsSnap.empty) {
        forumSections = sectionsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          categoryId: doc.data().categoryId || "algemeen",
          icon: doc.data().icon || "fas fa-folder-open",
          postCount: doc.data().postCount ?? 0,
          topicCount: doc.data().topicCount ?? 0,
        }));
      } else {
        forumSections = [
          {
            id: "aankondigingen",
            categoryId: "algemeen",
            icon: "fas fa-bullhorn",
            title: "Aankondigingen",
            description:
              "Belangrijke mededelingen over het forum en de website.",
            postCount: 42,
            topicCount: 12,
            latestPost: {
              title: "Welkom bij het nieuwe forum",
              time: "Vandaag, 09:45",
            },
          },
        ];
      }

      renderForumCategories(categoriesContainer);
    } catch (error) {
      console.error("Error loading forum categories:", error);
      renderForumCategoriesFallback(categoriesContainer);
    }
  }

  function renderForumCategories(container) {
    if (!container) return;
    container.innerHTML = "";

    forumCategories.forEach((category) => {
      const categoryEl = document.createElement("div");
      categoryEl.className = "category";

      const header = document.createElement("div");
      header.className = "category-header";
      header.innerHTML = `<h3>${category.name}</h3><i class="fas fa-chevron-down"></i>`;

      const body = document.createElement("div");
      body.className = "category-body";

      if (category.id === "actueel") {
        body.style.display = "block";
        // For Actueel category, we'll load articles from Firestore
        loadFirestoreArticles(body);
      } else {
        // For other categories, render forum sections
        const sections = forumSections.filter(
          (s) => (s.categoryId || "algemeen") === category.id
        );
        sections.forEach((section) => {
          const sectionEl = document.createElement("div");
          sectionEl.className = "forum-section";

          sectionEl.innerHTML = `
            <a href="https://politie-forum.nl/forum/${section.id}" class="forum-section-link" target="_blank">
              <div class="forum-icon"><i class="${section.icon}"></i></div>
              <div class="forum-content">
                <div class="forum-title">${section.title}</div>
                <div class="forum-description">${section.description || ""}</div>
                <div class="forum-stats">
                  <div class="forum-stat"><i class="fas fa-comments"></i> ${section.postCount ?? 0} berichten</div>
                  <div class="forum-stat"><i class="fas fa-file-alt"></i> ${section.topicCount ?? 0} topics</div>
                </div>
              </div>
              <div class="forum-latest">
                <div class="latest-post">${section.latestPost?.title || ""}</div>
                <div class="latest-time">${section.latestPost?.time || ""}</div>
              </div>
            </a>`;

          body.appendChild(sectionEl);
        });
      }

      categoryEl.appendChild(header);
      categoryEl.appendChild(body);
      container.appendChild(categoryEl);

      // Add toggle functionality
      header.addEventListener("click", () => {
        const isOpen = body.style.display !== "none";
        body.style.display = isOpen ? "none" : "block";

        const icon = header.querySelector("i");
        icon.classList.toggle("fa-chevron-down", !isOpen);
        icon.classList.toggle("fa-chevron-right", isOpen);
      });
    });

    // Add CSS if it doesn't exist
    if (!document.getElementById("forum-categories-style")) {
      const style = document.createElement("style");
      style.id = "forum-categories-style";
      style.textContent = `
        .category {
          margin-bottom: 20px;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--card);
          cursor: pointer;
          border-bottom: 1px solid var(--border);
        }
        .category-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        .category-body {
          display: none;
          padding: 16px;
        }
        .forum-section {
          margin-bottom: 12px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .forum-section:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .forum-section-link {
          display: flex;
          padding: 16px;
          text-decoration: none;
          color: var(--fg);
        }
        .forum-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-right: 16px;
          color: var(--accent);
        }
        .forum-content {
          flex: 1;
        }
        .forum-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .forum-description {
          color: var(--muted);
          font-size: 14px;
          margin-bottom: 8px;
        }
        .forum-stats {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: var(--muted);
        }
        .forum-latest {
          text-align: right;
          font-size: 13px;
          color: var(--muted);
        }
        .latest-post {
          font-weight: 500;
          margin-bottom: 4px;
          color: var(--fg);
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Add CSS for categories
  const categoryStyle = document.createElement("style");
  categoryStyle.textContent = `
    .category-header h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.125rem;
      margin: 0;
    }
    .category-header h3 svg {
      flex-shrink: 0;
      vertical-align: middle;
    }
  `;
  document.head.appendChild(categoryStyle);

  function renderForumCategoriesFallback(container) {
    if (!container) return;
    container.innerHTML = "";

    const fallbackCategories = [
      { id: "algemeen", name: "Algemene categorieën", icon: "icon-list-check" },
      {
        id: "actueel",
        name: "Actueel Nieuws",
        icon: "icon-politie-nl",
      },
    ];

    fallbackCategories.forEach((category) => {
      const categoryEl = document.createElement("div");
      categoryEl.className = "category";

      const header = document.createElement("div");
      header.className = "category-header";
      header.innerHTML = `
        <h3>
          <svg width="40" height="40" role="img" aria-labelledby="category-${category.id}-title">
            <title id="category-${category.id}-title">${category.name}</title>
            <use href="#${category.icon}" fill="url(#icon-gradient)"></use>
          </svg>
          ${category.name}
        </h3>
        <i class="fas fa-chevron-down"></i>
      `;
      const body = document.createElement("div");
      body.className = "category-body";

      if (category.id === "actueel") {
        body.style.display = "block";
        body.innerHTML = `
          <div class="article featured-article">
            <div class="featured-badge">Info</div>
            <div class="article-content">
              <div class="article-categories"><span class="article-category">Systeem</span></div>
              <h3>Geen artikelen gevonden</h3>
              <div class="article-meta">
                <div class="article-date"><i class="far fa-calendar-alt"></i> ${new Date().toLocaleDateString("nl-NL")}</div>
                <div class="reading-time"><i class="far fa-clock"></i> 1 min leestijd</div>
              </div>
              <p>Er zijn nog geen artikelen beschikbaar of de verbinding met de database is verbroken.</p>
              <div class="article-actions"><button class="read-more" onclick="location.reload()">Vernieuwen</button></div>
            </div>
          </div>`;
      } else {
        body.innerHTML = `
          <div class="forum-section">
            <div class="forum-section-link">
              <div class="forum-icon"><i class="fas fa-bullhorn"></i></div>
              <div class="forum-content">
                <div class="forum-title">Geen secties gevonden</div>
                <div class="forum-description">Er zijn nog geen forum secties beschikbaar.</div>
                <div class="forum-stats">
                  <div class="forum-stat"><i class="fas fa-comments"></i> 0 berichten</div>
                  <div class="forum-stat"><i class="fas fa-file-alt"></i> 0 topics</div>
                </div>
              </div>
              <div class="forum-latest"></div>
            </div>
          </div>`;
      }

      categoryEl.appendChild(header);
      categoryEl.appendChild(body);
      container.appendChild(categoryEl);

      header.addEventListener("click", () => {
        const isOpen = body.style.display !== "none";
        body.style.display = isOpen ? "none" : "block";

        const icon = header.querySelector("i");
        icon.classList.toggle("fa-chevron-down", !isOpen);
        icon.classList.toggle("fa-chevron-right", isOpen);
      });
    });
  }

  async function loadFirestoreArticles(container) {
    if (!container) return;

    try {
      const snap = await getDocs(
        collection(firestore, "articles_rewritten_digestpaper")
      );

      if (snap.empty) {
        container.innerHTML = `
          <div class="article featured-article">
            <div class="featured-badge">Info</div>
            <div class="article-content">
              <div class="article-categories"><span class="article-category">Systeem</span></div>
              <h3>Geen artikelen gevonden</h3>
              <div class="article-meta">
                <div class="article-date"><i class="far fa-calendar-alt"></i> ${new Date().toLocaleDateString("nl-NL")}</div>
                <div class="reading-time"><i class="far fa-clock"></i> 1 min leestijd</div>
              </div>
              <p>Er zijn nog geen artikelen beschikbaar in de database.</p>
              <div class="article-actions"><button class="read-more" onclick="location.reload()">Vernieuwen</button></div>
            </div>
          </div>`;
        return;
      }

      // Clear container
      container.innerHTML = "";

      // Sort articles by timestamp (newest first)
      const articles = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const timeA = a.timestamp?.seconds
            ? a.timestamp.seconds
            : new Date(a.timestamp || 0).getTime() / 1000;
          const timeB = b.timestamp?.seconds
            ? b.timestamp.seconds
            : new Date(b.timestamp || 0).getTime() / 1000;
          return timeB - timeA;
        });

      // Display first 5 articles
      articles.slice(0, 5).forEach((article, idx) => {
        const slug =
          article.slug ||
          (article.title || "artikel")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const url = `https://digestpaper.com/nieuws/${slug}`;

        // Extract preview text
        const preview = (() => {
          if (!article.full_text)
            return (
              article.preview ||
              article.summary ||
              "Lees het volledige artikel..."
            );

          // Extract clean text from full_text
          const cleanText = article.full_text
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          // Split into sentences and get first 3
          const sentences = cleanText
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 10);
          const threeS = sentences.slice(0, 3).join(". ").trim();

          if (threeS.length > 0) {
            return threeS + (threeS.endsWith(".") ? "" : ".");
          }

          return (
            article.preview ||
            article.summary ||
            "Lees het volledige artikel..."
          );
        })();

        // Format date
        const d = (() => {
          try {
            const t = article.timestamp;
            if (!t) return new Date();
            if (t.seconds) return new Date(t.seconds * 1000);
            return new Date(t);
          } catch {
            return new Date();
          }
        })();

        const fmt =
          d.toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }) +
          " om " +
          d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

        // Estimate reading time
        const read = Math.max(
          1,
          Math.ceil((article.full_text || "").split(" ").length / 200)
        );

        // Create article element
        const articleEl = document.createElement("div");
        articleEl.className = "article featured-article";
        articleEl.innerHTML = `
          <div class="article-content">
            <div class="article-categories">
              <span class="article-category" data-category="${article.category || "Politie"}">${article.category || "Politie"}</span>
              <span class="featured-badge">
                <svg width="24" height="24" role="img" aria-labelledby="featured-title" viewBox="0 0 448 512">
                  <title id="featured-title">Uitgelicht</title>
                  <path fill="white" d="M245.9-25.9c-13.4-8.2-30.3-8.2-43.7 0-24.4 14.9-39.5 18.9-68.1 18.3-15.7-.4-30.3 8.1-37.9 21.9-13.7 25.1-24.8 36.2-49.9 49.9-13.8 7.5-22.2 22.2-21.9 37.9 .7 28.6-3.4 43.7-18.3 68.1-8.2 13.4-8.2 30.3 0 43.7 14.9 24.4 18.9 39.5 18.3 68.1-.4 15.7 8.1 30.3 21.9 37.9 22.1 12.1 33.3 22.1 45.1 41.5L42.7 458.5c-5.9 11.9-1.1 26.3 10.7 32.2l86 43c11.5 5.7 25.5 1.4 31.7-9.8l52.8-95.1 52.8 95.1c6.2 11.2 20.2 15.6 31.7 9.8l86-43c11.9-5.9 16.7-20.3 10.7-32.2l-48.6-97.2c11.7-19.4 23-29.4 45.1-41.5 13.8-7.5 22.2-22.2 21.9-37.9-.7-28.6 3.4-43.7 18.3-68.1 8.2-13.4 8.2-30.3 0-43.7-14.9-24.4-18.9-39.5-18.3-68.1 .4-15.7-8.1-30.3-21.9-37.9-25.1-13.7-36.2-24.8-49.9-49.9-7.5-13.8-22.2-22.2-37.9-21.9-28.6 .7-43.7-3.4-68.1-18.3zM224 96a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"></path>
                </svg>
                Uitgelicht
              </span>
            </div>
            <h3 id="article-title-${idx}"><a href="${url}" class="article-title-link" target="_blank" rel="noopener noreferrer">${article.title || "Nieuwsartikel"}</a></h3>
            <div class="article-meta">
              <div class="article-date"><i class="far fa-calendar-alt"></i> ${fmt}</div>
              <div class="reading-time"><i class="far fa-clock"></i> ${read} min leestijd</div>
            </div>
            <p>${preview}</p>
            <div class="article-actions">
              <a href="${url}" class="read-more" target="_blank" rel="noopener noreferrer">Lees meer</a>
            </div>
          </div>`;

        container.appendChild(articleEl);
      });

      // Add CSS if it doesn't exist
      if (!document.getElementById("articles-style")) {
        const style = document.createElement("style");
        style.id = "articles-style";
        style.textContent = `
          .article {
            margin-bottom: 20px;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .article:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .article-content {
            padding: 20px;
          }
          .article-categories {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
          }
          .article-category {
            display: inline-block;
            padding: 4px 8px;
            background: #000000;
            color: white;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .featured-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: linear-gradient(135deg, #6b21a8, #9333ea);
            color: white;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .featured-badge svg {
            flex-shrink: 0;
            vertical-align: middle;
            margin-right: 4px;
            height: 18px;
            width: 18px;
          }
          .featured-badge svg path {
            fill: white !important;
          }
          .article h3 {
            margin: 0 0 12px;
            font-size: 18px;
            font-weight: 700;
          }
          .article-title-link {
            color: var(--fg);
            text-decoration: none;
          }
          .article-title-link:hover {
            color: var(--accent);
            text-decoration: underline;
          }
          .article-meta {
            display: flex;
            gap: 16px;
            margin-bottom: 12px;
            font-size: 13px;
            color: var(--muted);
          }
          .article p {
            margin: 0 0 16px;
            line-height: 1.6;
          }
          .article-actions {
            margin-top: 16px;
          }
          .read-more {
            display: inline-block;
            padding: 8px 16px;
            background: linear-gradient(135deg, #6b21a8, #9333ea);
            color: white;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .read-more:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(107, 33, 168, 0.4);
            text-decoration: none;
            color: white;
          }
        `;
        document.head.appendChild(style);
      }
    } catch (error) {
      console.error("Error loading Firestore articles:", error);
      container.innerHTML = `
        <div class="article featured-article">
          <div class="featured-badge">Error</div>
          <div class="article-content">
            <div class="article-categories"><span class="article-category">Systeem</span></div>
            <h3>Fout bij laden van artikelen</h3>
            <p>Er is een fout opgetreden bij het ophalen van de artikelen uit de database.</p>
            <div class="article-actions"><button class="read-more" onclick="location.reload()">Opnieuw proberen</button></div>
          </div>
        </div>`;
    }
  }

  /* ---------- Recent Articles ---------- */
  async function loadRecentArticles() {
    const articlesContainer = document.getElementById("articles-container");
    if (!articlesContainer) return;

    try {
      const snap = await getDocs(
        collection(firestore, "articles_rewritten_digestpaper")
      );

      if (snap.empty) {
        articlesContainer.innerHTML = `
          <div class="no-articles">
            <i class="fas fa-newspaper fa-3x"></i>
            <h3>Geen artikelen gevonden</h3>
            <p>Er zijn nog geen recente artikelen beschikbaar.</p>
          </div>`;
        return;
      }

      // Clear container
      articlesContainer.innerHTML = "";

      // Sort articles by timestamp (newest first)
      const articles = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const timeA = a.timestamp?.seconds
            ? a.timestamp.seconds
            : new Date(a.timestamp || 0).getTime() / 1000;
          const timeB = b.timestamp?.seconds
            ? b.timestamp.seconds
            : new Date(b.timestamp || 0).getTime() / 1000;
          return timeB - timeA;
        });

      // Display first 5 articles
      articles.slice(0, 5).forEach((article) => {
        const slug =
          article.slug ||
          (article.title || "artikel")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const url = `https://digestpaper.com/nieuws/${slug}`;

        // Format date
        const d = (() => {
          try {
            const t = article.timestamp;
            if (!t) return new Date();
            if (t.seconds) return new Date(t.seconds * 1000);
            return new Date(t);
          } catch {
            return new Date();
          }
        })();

        const fmt = d.toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        // Create article element
        const articleEl = document.createElement("div");
        articleEl.className = "recent-article";
        articleEl.innerHTML = `
          <a href="${url}" class="recent-article-link" target="_blank" rel="noopener noreferrer">
            <h3 class="recent-article-title">${article.title || "Nieuwsartikel"}</h3>
            <div class="recent-article-meta">
              <span class="recent-article-date">${fmt}</span>
              <span class="recent-article-category">${article.category || "Politie"}</span>
            </div>
          </a>`;

        articlesContainer.appendChild(articleEl);
      });

      // Add CSS if it doesn't exist
      if (!document.getElementById("recent-articles-style")) {
        const style = document.createElement("style");
        style.id = "recent-articles-style";
        style.textContent = `
          .recent-article {
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border);
          }
          .recent-article:last-child {
            border-bottom: none;
            margin-bottom: 0;
          }
          .recent-article-link {
            display: block;
            text-decoration: none;
            color: var(--fg);
            transition: transform 0.2s ease;
          }
          .recent-article-link:hover {
            transform: translateX(4px);
          }
          .recent-article-title {
            margin: 0 0 8px;
            font-size: 16px;
            font-weight: 600;
          }
          .recent-article-link:hover .recent-article-title {
            color: var(--accent);
          }
          .recent-article-meta {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: var(--muted);
          }
          .no-articles {
            text-align: center;
            padding: 40px 0;
            color: var(--muted);
          }
          .no-articles i {
            margin-bottom: 16px;
            opacity: 0.5;
          }
          .no-articles h3 {
            margin: 0 0 8px;
            font-size: 18px;
            font-weight: 600;
          }
          .no-articles p {
            margin: 0;
          }
        `;
        document.head.appendChild(style);
      }
    } catch (error) {
      console.error("Error loading recent articles:", error);
      articlesContainer.innerHTML = `
        <div class="no-articles">
          <i class="fas fa-exclamation-triangle fa-3x"></i>
          <h3>Fout bij laden van artikelen</h3>
          <p>Er is een fout opgetreden bij het ophalen van de recente artikelen.</p>
        </div>`;
    }
  }

  /* ---------- Popular Tags ---------- */
  async function loadPopularTags() {
    const tagsContainer = document.getElementById("tags-container");
    if (!tagsContainer) return;

    try {
      // Extract tags from articles
      const snap = await getDocs(
        collection(firestore, "articles_rewritten_digestpaper")
      );

      if (snap.empty) {
        renderDefaultTags(tagsContainer);
        return;
      }

      // Count tag occurrences
      const tagCounts = {};
      snap.docs.forEach((doc) => {
        const article = doc.data();
        const tags = article.tags || [];

        tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      // Sort tags by count (most frequent first)
      const sortedTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Show top 10 tags

      if (sortedTags.length === 0) {
        renderDefaultTags(tagsContainer);
        return;
      }

      // Clear container
      tagsContainer.innerHTML = "";

      // Create tag elements
      sortedTags.forEach((tag) => {
        const tagEl = document.createElement("a");
        tagEl.className = "tag-item";
        tagEl.href = `https://politie-forum.nl/tags/${encodeURIComponent(tag.name.toLowerCase())}`;
        tagEl.target = "_blank";
        tagEl.rel = "noopener noreferrer";
        tagEl.innerHTML = `${tag.name} <span class="tag-count">${tag.count}</span>`;

        tagsContainer.appendChild(tagEl);
      });

      // Add CSS if it doesn't exist
      if (!document.getElementById("tags-style")) {
        const style = document.createElement("style");
        style.id = "tags-style";
        style.textContent = `
          #tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .tag-item {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            font-size: 14px;
            color: var(--fg);
            text-decoration: none;
            transition: all 0.2s ease;
          }
          .tag-item:hover {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
            transform: translateY(-2px);
          }
          .tag-count {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-left: 6px;
            min-width: 20px;
            height: 20px;
            padding: 0 6px;
            background: var(--accent);
            color: white;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
          }
          .tag-item:hover .tag-count {
            background: white;
            color: var(--accent);
          }
        `;
        document.head.appendChild(style);
      }
    } catch (error) {
      console.error("Error loading popular tags:", error);
      renderDefaultTags(tagsContainer);
    }
  }

  function renderDefaultTags(container) {
    if (!container) return;

    const defaultTags = [
      { name: "Politie", count: 24 },
      { name: "Veiligheid", count: 18 },
      { name: "Amsterdam", count: 15 },
      { name: "Rotterdam", count: 12 },
      { name: "Misdaad", count: 10 },
      { name: "Cybersecurity", count: 8 },
      { name: "Drugs", count: 7 },
      { name: "Recherche", count: 6 },
      { name: "Justitie", count: 5 },
      { name: "Verkeer", count: 4 },
    ];

    // Clear container
    container.innerHTML = "";

    // Create tag elements
    defaultTags.forEach((tag) => {
      const tagEl = document.createElement("a");
      tagEl.className = "tag-item";
      tagEl.href = `https://politie-forum.nl/tags/${encodeURIComponent(tag.name.toLowerCase())}`;
      tagEl.target = "_blank";
      tagEl.rel = "noopener noreferrer";
      tagEl.innerHTML = `${tag.name} <span class="tag-count">${tag.count}</span>`;

      container.appendChild(tagEl);
    });
  }

  function initNewsFlasherFallback() {
    const flasherContent = document.querySelector(".flasher-content");
    if (flasherContent) {
      renderNewsFlashFallback(flasherContent);
    }
  }

  function renderNoArticlesMessage() {
    const categoriesContainer = document.getElementById("categories-container");
    const articlesContainer = document.getElementById("articles-container");

    if (categoriesContainer) {
      renderForumCategoriesFallback(categoriesContainer);
    }

    if (articlesContainer) {
      articlesContainer.innerHTML = `
        <div class="no-articles">
          <i class="fas fa-newspaper fa-3x"></i>
          <h3>Geen artikelen gevonden</h3>
          <p>Er zijn nog geen recente artikelen beschikbaar.</p>
        </div>`;
    }
  }
});
