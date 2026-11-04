// URL Router & Dynamic Page Observer for Torn.com
import { isModuleEnabled } from './storage.js';

class TornRouter {
  constructor() {
    this.routes = [];
    this.currentHref = window.location.href;
    this.observer = null;
  }

  /**
   * Register a module handler
   * @param {string} id Unique identifier for the module
   * @param {RegExp|Function} pattern RegExp to match against window.location.href, or matcher function
   * @param {Function} handler Callback to run when page matches
   */
  register(id, pattern, handler) {
    this.routes.push({ id, pattern, handler, active: false });
  }

  matches(pattern) {
    const href = window.location.href;
    if (pattern instanceof RegExp) {
      return pattern.test(href);
    }
    if (typeof pattern === 'function') {
      return pattern(href, window.location);
    }
    return href.includes(pattern);
  }

  evaluate() {
    for (const route of this.routes) {
      if (!isModuleEnabled(route.id)) continue;

      if (this.matches(route.pattern)) {
        try {
          route.handler();
        } catch (err) {
          console.error(`[TornCore] Error in module [${route.id}]:`, err);
        }
      }
    }
  }

  start() {
    // Initial run
    this.evaluate();

    // Monitor for URL changes (HTML5 History API + Hash changes)
    let lastUrl = window.location.href;
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        setTimeout(() => this.evaluate(), 250);
      }
    };

    window.addEventListener('popstate', checkUrlChange);
    window.addEventListener('hashchange', checkUrlChange);

    // Observe body for dynamically loaded Torn AJAX containers
    let debounceTimer = null;
    this.observer = new MutationObserver((mutations) => {
      checkUrlChange();
      // Debounce re-evaluations on significant DOM tree mutations
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.evaluate();
      }, 400);
    });

    if (document.body) {
      this.observer.observe(document.body, { childList: true, subtree: true });
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        this.observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }
}

export const router = new TornRouter();
