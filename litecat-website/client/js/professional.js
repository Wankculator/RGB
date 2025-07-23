// Professional JavaScript Implementation for LIGHTCAT
// Performance optimized with error handling and accessibility

(function() {
    'use strict';
    
    // Performance monitoring
    const performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
                console.log('LCP:', entry.startTime);
            }
        }
    });
    
    try {
        performanceObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
        console.warn('Performance monitoring not supported');
    }
    
    // Error boundary
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        // Send to error tracking service in production
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        // Send to error tracking service in production
    });
    
    // Lazy loading for images
    class LazyImageLoader {
        constructor() {
            this.imageObserver = null;
            this.init();
        }
        
        init() {
            if ('IntersectionObserver' in window) {
                this.imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.loadImage(entry.target);
                            observer.unobserve(entry.target);
                        }
                    });
                }, {
                    rootMargin: '50px 0px',
                    threshold: 0.01
                });
                
                this.observeImages();
            } else {
                // Fallback for browsers without IntersectionObserver
                this.loadAllImages();
            }
        }
        
        observeImages() {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => this.imageObserver.observe(img));
        }
        
        loadImage(img) {
            const src = img.getAttribute('data-src');
            const srcset = img.getAttribute('data-srcset');
            
            if (src) {
                img.src = src;
                img.removeAttribute('data-src');
            }
            
            if (srcset) {
                img.srcset = srcset;
                img.removeAttribute('data-srcset');
            }
            
            img.classList.add('loaded');
        }
        
        loadAllImages() {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => this.loadImage(img));
        }
    }
    
    // Debounce utility
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Throttle utility
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Network status monitoring
    class NetworkMonitor {
        constructor() {
            this.online = navigator.onLine;
            this.callbacks = [];
            this.init();
        }
        
        init() {
            window.addEventListener('online', () => this.updateStatus(true));
            window.addEventListener('offline', () => this.updateStatus(false));
        }
        
        updateStatus(online) {
            this.online = online;
            this.callbacks.forEach(cb => cb(online));
            
            if (!online) {
                this.showOfflineNotification();
            } else {
                this.hideOfflineNotification();
            }
        }
        
        showOfflineNotification() {
            const notification = document.createElement('div');
            notification.id = 'offline-notification';
            notification.className = 'offline-notification';
            notification.innerHTML = `
                <div class="offline-content">
                    <span>⚠️ You are currently offline</span>
                </div>
            `;
            notification.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #FF3B30;
                color: white;
                padding: 12px;
                text-align: center;
                z-index: 10000;
                font-weight: 600;
            `;
            document.body.appendChild(notification);
        }
        
        hideOfflineNotification() {
            const notification = document.getElementById('offline-notification');
            if (notification) {
                notification.remove();
            }
        }
        
        onStatusChange(callback) {
            this.callbacks.push(callback);
        }
    }
    
    // Service Worker Registration
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('ServiceWorker registered:', registration);
            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
            }
        }
    }
    
    // Prefetch critical resources
    function prefetchResources() {
        const criticalResources = [
            '/api/rgb/stats',
            '/images/RGB_LITE_CAT_LOGO.jpg',
            '/tokenomics.html'
        ];
        
        criticalResources.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        });
    }
    
    // Optimize animations for performance
    function optimizeAnimations() {
        // Reduce motion for users who prefer it
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            document.documentElement.style.setProperty('--transition-fast', '0.01ms');
            document.documentElement.style.setProperty('--transition-normal', '0.01ms');
            document.documentElement.style.setProperty('--transition-slow', '0.01ms');
            
            // Disable GSAP animations
            if (window.gsap) {
                gsap.globalTimeline.pause();
            }
        }
        
        // Use will-change sparingly
        const animatedElements = document.querySelectorAll('.btn, .card, .nav-link');
        
        animatedElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                el.style.willChange = 'transform';
            });
            
            el.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    el.style.willChange = 'auto';
                }, 300);
            });
        });
    }
    
    // Memory management
    class MemoryManager {
        constructor() {
            this.observers = [];
            this.timers = [];
            this.listeners = [];
        }
        
        addObserver(observer) {
            this.observers.push(observer);
        }
        
        addTimer(timer) {
            this.timers.push(timer);
        }
        
        addListener(element, event, handler) {
            element.addEventListener(event, handler);
            this.listeners.push({ element, event, handler });
        }
        
        cleanup() {
            // Disconnect all observers
            this.observers.forEach(observer => {
                if (observer.disconnect) observer.disconnect();
            });
            
            // Clear all timers
            this.timers.forEach(timer => {
                clearTimeout(timer);
                clearInterval(timer);
            });
            
            // Remove all listeners
            this.listeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            
            // Clear arrays
            this.observers = [];
            this.timers = [];
            this.listeners = [];
        }
    }
    
    // Initialize everything when DOM is ready
    function init() {
        // Initialize lazy loading
        new LazyImageLoader();
        
        // Initialize network monitoring
        const networkMonitor = new NetworkMonitor();
        
        // Register service worker
        registerServiceWorker();
        
        // Prefetch resources
        prefetchResources();
        
        // Optimize animations
        optimizeAnimations();
        
        // Initialize memory manager
        const memoryManager = new MemoryManager();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            memoryManager.cleanup();
        });
        
        // Expose utilities globally if needed
        window.rgbUtils = {
            debounce,
            throttle,
            networkMonitor,
            memoryManager
        };
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// Skeleton screen implementation
class SkeletonScreen {
    constructor() {
        this.skeletons = [];
    }
    
    create(element, options = {}) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton';
        skeleton.style.width = options.width || '100%';
        skeleton.style.height = options.height || '20px';
        skeleton.style.borderRadius = options.radius || '4px';
        
        element.appendChild(skeleton);
        this.skeletons.push(skeleton);
        
        return skeleton;
    }
    
    remove() {
        this.skeletons.forEach(skeleton => skeleton.remove());
        this.skeletons = [];
    }
}

// Progressive image loading
class ProgressiveImage {
    constructor(smallSrc, largeSrc, element) {
        this.smallSrc = smallSrc;
        this.largeSrc = largeSrc;
        this.element = element;
        this.load();
    }
    
    load() {
        // Load small image first
        const smallImg = new Image();
        smallImg.src = this.smallSrc;
        
        smallImg.onload = () => {
            this.element.src = this.smallSrc;
            this.element.classList.add('loaded-small');
            
            // Load large image
            const largeImg = new Image();
            largeImg.src = this.largeSrc;
            
            largeImg.onload = () => {
                this.element.src = this.largeSrc;
                this.element.classList.remove('loaded-small');
                this.element.classList.add('loaded-large');
            };
        };
    }
}

// Request idle callback polyfill
window.requestIdleCallback = window.requestIdleCallback || function(cb) {
    const start = Date.now();
    return setTimeout(() => {
        cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
        });
    }, 1);
};

// Cancel idle callback polyfill
window.cancelIdleCallback = window.cancelIdleCallback || function(id) {
    clearTimeout(id);
};