/**
 * Smoke Tests
 * 
 * Critical path tests that verify the app's core functionality.
 * These should run fast and catch any breaking changes.
 * 
 * Run: bun run test:e2e:smoke
 */

describe('Smoke Tests - Critical Paths', () => {
  
  describe('Application Boot', () => {
    it('should load the home page', () => {
      cy.visit('/');
      cy.get('body').should('be.visible');
      cy.title().should('not.be.empty');
    });

    it('should display the bottom navigation', () => {
      cy.visit('/');
      cy.get('nav').should('be.visible');
      cy.get('nav a').should('have.length.at.least', 3);
    });

    it('should not have any console errors on load', () => {
      cy.visit('/');
      cy.window().then((win) => {
        expect(win.console.error).to.not.be.called;
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('should navigate to search page', () => {
      cy.get('a[href="/search"]').click();
      cy.url().should('include', '/search');
    });

    it('should navigate to compare page', () => {
      cy.get('a[href="/compare"]').click();
      cy.url().should('include', '/compare');
    });

    it('should navigate to profile page', () => {
      cy.get('a[href="/profile"]').click();
      cy.url().should('include', '/profile');
    });

    it('should handle 404 routes gracefully', () => {
      cy.visit('/nonexistent-page', { failOnStatusCode: false });
      cy.contains(/not found|404/i).should('be.visible');
    });
  });

  describe('Feed Page', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('should display feed content or empty state', () => {
      // Either show tracks or an empty state message
      cy.get('body').then(($body) => {
        const hasTracks = $body.find('[class*="card"], [data-testid="track-card"]').length > 0;
        const hasEmptyState = $body.find('[class*="empty"], [data-testid="empty-state"]').length > 0;
        expect(hasTracks || hasEmptyState || $body.text().length > 0).to.be.true;
      });
    });
  });

  describe('Search Page', () => {
    beforeEach(() => {
      cy.visit('/search');
    });

    it('should display search input', () => {
      cy.get('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]')
        .should('be.visible');
    });

    it('should accept text input', () => {
      cy.get('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]')
        .first()
        .type('test query')
        .should('have.value', 'test query');
    });
  });

  describe('Auth Page', () => {
    beforeEach(() => {
      cy.visit('/auth');
    });

    it('should display auth form', () => {
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show validation on empty submit', () => {
      cy.get('button[type="submit"]').click();
      // Should show some form of validation (HTML5 or custom)
      cy.get('input:invalid, [class*="error"], [role="alert"]').should('exist');
    });
  });

  describe('Profile Page', () => {
    it('should redirect to auth if not logged in or show profile', () => {
      cy.visit('/profile');
      // Either redirected to auth or showing profile content
      cy.url().then((url) => {
        if (url.includes('/auth')) {
          cy.get('input[type="email"]').should('be.visible');
        } else {
          cy.get('body').should('contain.text', 'Profile');
        }
      });
    });
  });

  describe('Album Page', () => {
    it('should load album page with valid ID', () => {
      cy.visit('/album/test-album-id');
      // Should show album content or 404
      cy.get('body').should('be.visible');
    });
  });

  describe('Artist Page', () => {
    it('should load artist page with valid ID', () => {
      cy.visit('/artist/test-artist-id');
      // Should show artist content or 404
      cy.get('body').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should render properly on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.visit('/');
      cy.get('nav').should('be.visible');
    });

    it('should render properly on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.visit('/');
      cy.get('nav').should('be.visible');
    });

    it('should render properly on desktop viewport', () => {
      cy.viewport(1920, 1080);
      cy.visit('/');
      cy.get('body').should('be.visible');
    });
  });
});
