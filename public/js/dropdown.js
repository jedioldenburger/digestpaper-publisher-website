/**
 * Dropdown Navigation Module
 * Handles dropdown menu functionality with keyboard navigation and accessibility
 */

export function initDropdowns() {
  const dropdowns = [...document.querySelectorAll('[data-dropdown]')];

  if (dropdowns.length === 0) {
    console.log('📋 No dropdown menus found');
    return;
  }

  console.log(`📋 Initializing ${dropdowns.length} dropdown menu(s)`);

  function items(menu) {
    return [...menu.querySelectorAll('[role="menuitem"]')];
  }

  function open(btn, menu) {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }

  function close(btn, menu) {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function isOpen(menu) {
    return !menu.hidden;
  }

  dropdowns.forEach(dd => {
    const btn = dd.querySelector('button[aria-controls]');
    const menu = dd.querySelector('.nav-menu');

    if (!btn || !menu) {
      console.warn('📋 Dropdown missing button or menu element:', dd);
      return;
    }

    // Handle button clicks
    btn.addEventListener('click', () => {
      const wasOpen = isOpen(menu);

      if (wasOpen) {
        close(btn, menu);
      } else {
        open(btn, menu);
        // Focus first menu item
        const firstItem = items(menu)[0];
        if (firstItem) {
          firstItem.focus();
        }
      }

      // Close other dropdowns
      dropdowns.forEach(other => {
        if (other !== dd) {
          const otherBtn = other.querySelector('button[aria-controls]');
          const otherMenu = other.querySelector('.nav-menu');
          if (otherMenu && !otherMenu.hidden) {
            close(otherBtn, otherMenu);
          }
        }
      });
    });

    // Handle keyboard navigation on buttons
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen(menu)) open(btn, menu);
        items(menu)[0]?.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen(menu)) open(btn, menu);
        items(menu).at(-1)?.focus();
      }
      if (e.key === 'Escape') {
        close(btn, menu);
        btn.focus();
      }
    });

    // Handle keyboard navigation within menus
    menu.addEventListener('keydown', e => {
      const list = items(menu);
      const currentIndex = list.indexOf(document.activeElement);

      if (e.key === 'Escape') {
        e.preventDefault();
        close(btn, menu);
        btn.focus();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextItem = list[currentIndex + 1] || list[0];
        nextItem?.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevItem = list[currentIndex - 1] || list.at(-1);
        prevItem?.focus();
      }
      if (e.key === 'Home') {
        e.preventDefault();
        list[0]?.focus();
      }
      if (e.key === 'End') {
        e.preventDefault();
        list.at(-1)?.focus();
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', e => {
    dropdowns.forEach(dd => {
      if (!dd.contains(e.target)) {
        const btn = dd.querySelector('button[aria-controls]');
        const menu = dd.querySelector('.nav-menu');
        if (menu && !menu.hidden) {
          close(btn, menu);
        }
      }
    });
  });

  console.log('📋 Dropdown menus initialized successfully');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDropdowns);
} else {
  initDropdowns();
}
