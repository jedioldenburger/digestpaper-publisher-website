/**
 * DigestPaper Authentication System
 * Handles user login, logout, and authentication state management
 */

class AuthManager {
  constructor() {
    this.user = null;
    this.isInitialized = false;
    this.loginButton = null;
    this.authModal = null;
    this.init();
  }

  async init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupAuth());
    } else {
      this.setupAuth();
    }
  }

  setupAuth() {
    this.loginButton = document.getElementById('loginButton');
    this.authModal = document.getElementById('auth-modal');

    if (this.loginButton) {
      this.loginButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.showLoginModal();
      });
    }

    // Setup modal close functionality
    this.setupModalEvents();

    // Check for existing authentication
    this.checkAuthState();

    this.isInitialized = true;
    console.log('AuthManager initialized');
  }

  setupModalEvents() {
    if (!this.authModal) return;

    // Close modal on X button click
    const closeBtn = this.authModal.querySelector('.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideLoginModal());
    }

    // Close modal on outside click
    this.authModal.addEventListener('click', (e) => {
      if (e.target === this.authModal) {
        this.hideLoginModal();
      }
    });

    // Tab switching
    const authTabs = this.authModal.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(tab.dataset.tab);
      });
    });

    // Form submissions
    this.setupFormHandlers();
  }

  setupFormHandlers() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleLogin();
        });
      }
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleRegister();
        });
      }
    }
  }

  showLoginModal() {
    if (this.authModal) {
      this.authModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // Focus on first input
      const firstInput = this.authModal.querySelector('input[type="email"]');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }

  hideLoginModal() {
    if (this.authModal) {
      this.authModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    const tabs = this.authModal.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update form visibility
    const forms = this.authModal.querySelectorAll('.auth-form');
    forms.forEach(form => {
      form.classList.toggle('active', form.id === `${tabName}-form`);
    });
  }

  async handleLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    if (!emailInput || !passwordInput) {
      console.error('Login form inputs not found');
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      this.showError('Vul alle velden in');
      return;
    }

    // Show loading state
    this.setLoadingState(true);

    try {
      // Simulate API call for now
      await this.simulateLogin(email, password);

      // Success
      this.onLoginSuccess({
        email: email,
        name: email.split('@')[0],
        avatar: email.charAt(0).toUpperCase()
      });

    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  async handleRegister() {
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (!emailInput || !passwordInput || !confirmPasswordInput) {
      console.error('Register form inputs not found');
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!email || !password || !confirmPassword) {
      this.showError('Vul alle velden in');
      return;
    }

    if (password !== confirmPassword) {
      this.showError('Wachtwoorden komen niet overeen');
      return;
    }

    if (password.length < 6) {
      this.showError('Wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    // Show loading state
    this.setLoadingState(true);

    try {
      // Simulate API call for now
      await this.simulateRegister(email, password);

      // Success - automatically log in
      this.onLoginSuccess({
        email: email,
        name: email.split('@')[0],
        avatar: email.charAt(0).toUpperCase()
      });

    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  async simulateLogin(email, password) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple validation for demo
    if (email === 'demo@digestpaper.com' && password === 'demo123') {
      return { success: true };
    } else if (password.length < 3) {
      throw new Error('Ongeldig wachtwoord');
    } else {
      // For demo, accept any reasonable email/password
      return { success: true };
    }
  }

  async simulateRegister(email, password) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Simple validation for demo
    if (!email.includes('@')) {
      throw new Error('Ongeldig e-mailadres');
    }

    return { success: true };
  }

  onLoginSuccess(userData) {
    this.user = userData;
    this.hideLoginModal();
    this.updateUI();
    this.saveAuthState();

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('userLoggedIn', {
      detail: userData
    }));

    console.log('User logged in:', userData);
  }

  logout() {
    this.user = null;
    this.updateUI();
    this.clearAuthState();

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('userLoggedOut'));

    console.log('User logged out');
  }

  updateUI() {
    if (this.user) {
      // User is logged in
      if (this.loginButton) {
        this.loginButton.innerHTML = `
          <svg width="20" height="20"><use href="#icon-user"></use></svg>
          ${this.user.name}
        `;
        this.loginButton.removeEventListener('click', this.showLoginModal);
        this.loginButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      }
    } else {
      // User is logged out
      if (this.loginButton) {
        this.loginButton.innerHTML = `
          <svg width="20" height="20"><use href="#icon-user"></use></svg>
          Login
        `;
        this.loginButton.removeEventListener('click', this.logout);
        this.loginButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.showLoginModal();
        });
      }
    }
  }

  checkAuthState() {
    try {
      const savedAuth = localStorage.getItem('digestpaper_auth');
      if (savedAuth) {
        const userData = JSON.parse(savedAuth);
        if (userData && userData.email) {
          this.user = userData;
          this.updateUI();
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      this.clearAuthState();
    }
  }

  saveAuthState() {
    if (this.user) {
      try {
        localStorage.setItem('digestpaper_auth', JSON.stringify(this.user));
      } catch (error) {
        console.error('Error saving auth state:', error);
      }
    }
  }

  clearAuthState() {
    try {
      localStorage.removeItem('digestpaper_auth');
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  }

  setLoadingState(loading) {
    const submitBtns = this.authModal.querySelectorAll('button[type="submit"]');
    submitBtns.forEach(btn => {
      btn.disabled = loading;
      btn.textContent = loading ? 'Bezig...' : (btn.closest('#login-form') ? 'Inloggen' : 'Registreren');
    });
  }

  showError(message) {
    // Create or update error message
    let errorEl = this.authModal.querySelector('.auth-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'auth-error';
      errorEl.style.cssText = `
        color: var(--danger);
        padding: 0.5rem;
        margin: 0.5rem 0;
        border: 1px solid var(--danger);
        border-radius: 0.375rem;
        background: rgba(239, 68, 68, 0.1);
        font-size: 0.875rem;
      `;

      const activeForm = this.authModal.querySelector('.auth-form.active');
      if (activeForm) {
        activeForm.appendChild(errorEl);
      }
    }

    errorEl.textContent = message;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorEl && errorEl.parentNode) {
        errorEl.remove();
      }
    }, 5000);
  }

  // Public API
  getCurrentUser() {
    return this.user;
  }

  isLoggedIn() {
    return !!this.user;
  }
}

// Initialize authentication manager
const authManager = new AuthManager();

// Make it globally available
window.authManager = authManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}
