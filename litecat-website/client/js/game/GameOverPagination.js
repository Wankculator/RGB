export class GameOverPagination {
    constructor() {
        this.currentPage = 0;
        this.pages = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        // Create pagination structure
        const gameOverContent = document.querySelector('.game-over-content');
        if (!gameOverContent) return;

        // Wrap existing content in pages
        this.wrapContentInPages(gameOverContent);
        
        // Add navigation arrows
        this.addNavigationArrows(gameOverContent);
        
        // Show first page
        this.showPage(0);
        
        this.initialized = true;
    }

    wrapContentInPages(container) {
        // Create page 1: Score and tier info
        const page1 = document.createElement('div');
        page1.className = 'game-over-page';
        page1.id = 'page-1';
        
        // Move header content to page 1
        const headerDiv = container.querySelector('div[style*="margin-bottom: 5px"]');
        if (headerDiv) {
            page1.appendChild(headerDiv.cloneNode(true));
            headerDiv.remove();
        }

        // Create page 2: Twitter verification
        const page2 = document.createElement('div');
        page2.className = 'game-over-page';
        page2.id = 'page-2';
        
        // Move twitter section to page 2
        const twitterSection = container.querySelector('#twitter-verify');
        if (twitterSection) {
            page2.appendChild(twitterSection.cloneNode(true));
            twitterSection.remove();
        }

        // Create page 3: Actions and benefits
        const page3 = document.createElement('div');
        page3.className = 'game-over-page';
        page3.id = 'page-3';
        
        // Move buttons and allocation message to page 3
        const buttonContainer = container.querySelector('div[style*="display: flex"]');
        if (buttonContainer) {
            page3.appendChild(buttonContainer.cloneNode(true));
            buttonContainer.remove();
        }

        // Clear container and add pages
        container.innerHTML = '';
        container.appendChild(page1);
        container.appendChild(page2);
        container.appendChild(page3);
        
        this.pages = [page1, page2, page3];
        
        // Add styles
        this.addStyles();
    }

    addNavigationArrows(container) {
        // Create navigation container
        const navContainer = document.createElement('div');
        navContainer.className = 'game-over-nav';
        navContainer.innerHTML = `
            <button class="nav-arrow nav-prev" id="nav-prev" style="display: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
            </button>
            <div class="page-indicator">
                <span id="page-current">1</span> / <span id="page-total">3</span>
            </div>
            <button class="nav-arrow nav-next" id="nav-next">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
            </button>
        `;
        
        container.appendChild(navContainer);
        
        // Add event listeners
        document.getElementById('nav-prev').addEventListener('click', () => this.previousPage());
        document.getElementById('nav-next').addEventListener('click', () => this.nextPage());
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .game-over-page {
                display: none;
                min-height: 150px;
                animation: fadeIn 0.3s ease-out;
            }
            
            .game-over-page.active {
                display: block;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateX(10px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            .game-over-nav {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 0, 0.3);
            }
            
            .nav-arrow {
                background: transparent;
                border: 1px solid var(--primary-yellow);
                color: var(--primary-yellow);
                padding: 5px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .nav-arrow:hover:not(:disabled) {
                background: rgba(255, 255, 0, 0.1);
                transform: scale(1.1);
            }
            
            .nav-arrow:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            
            .page-indicator {
                color: var(--primary-yellow);
                font-size: 0.7rem;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }

    showPage(index) {
        // Hide all pages
        this.pages.forEach(page => page.classList.remove('active'));
        
        // Show current page
        if (this.pages[index]) {
            this.pages[index].classList.add('active');
            this.currentPage = index;
            
            // Update navigation
            this.updateNavigation();
        }
    }

    updateNavigation() {
        const prevBtn = document.getElementById('nav-prev');
        const nextBtn = document.getElementById('nav-next');
        const currentSpan = document.getElementById('page-current');
        
        // Update page number
        if (currentSpan) {
            currentSpan.textContent = this.currentPage + 1;
        }
        
        // Update button states
        if (prevBtn) {
            prevBtn.style.display = this.currentPage === 0 ? 'none' : 'flex';
        }
        
        if (nextBtn) {
            nextBtn.style.display = this.currentPage === this.pages.length - 1 ? 'none' : 'flex';
        }
    }

    nextPage() {
        if (this.currentPage < this.pages.length - 1) {
            this.showPage(this.currentPage + 1);
        }
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.showPage(this.currentPage - 1);
        }
    }

    reset() {
        this.currentPage = 0;
        this.showPage(0);
    }
}

// Create global instance
window.gameOverPagination = new GameOverPagination();