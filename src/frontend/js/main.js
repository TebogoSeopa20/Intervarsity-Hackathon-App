// Mobile menu functionality
function initMobileMenuToggle() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileNavClose = document.getElementById('mobile-nav-close');
    const mobileNav = document.getElementById('mobile-nav');
    
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            mobileNav.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', function() {
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close menu when clicking a link
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

// Scroll animations with IntersectionObserver
function initScrollAnimations(threshold = 0.1) {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold });

        animatedElements.forEach(el => {
            observer.observe(el);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        animatedElements.forEach(el => {
            el.classList.add('visible');
        });
    }
}

// Navbar scroll effect
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Animate stats counting
function animateStats() {
    const statElements = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statElement = entry.target;
                const target = parseInt(statElement.getAttribute('data-target'));
                const duration = 2000; // 2 seconds
                const increment = target / (duration / 16); // 60fps
                let current = 0;
                
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        clearInterval(timer);
                        current = target;
                    }
                    statElement.textContent = Math.floor(current).toLocaleString();
                }, 16);
                
                observer.unobserve(statElement);
            }
        });
    }, { threshold: 0.5 });
    
    statElements.forEach(el => {
        observer.observe(el);
    });
}

// Button functionality and redirects
function initButtonFunctionality() {
    // Navigation buttons in header
    const joinNowButtons = document.querySelectorAll('.btn-primary:not(.hero-buttons .btn-primary)');
    const signInButtons = document.querySelectorAll('.btn-outline:not(.hero-buttons .btn-outline)');
    
    // Hero section buttons
    const explorePlantsButton = document.querySelector('.hero-buttons .btn-primary');
    const learnMoreButton = document.querySelector('.hero-buttons .btn-outline');
    
    // CTA section buttons
    const createAccountButton = document.querySelector('.cta-buttons .btn-white');
    const learnMoreCtaButton = document.querySelector('.cta-buttons .btn-outline-white');
    
    // Join Now buttons (redirect to signup)
    joinNowButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = 'signup.html';
        });
    });
    
    // Sign In buttons (redirect to login)
    signInButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    });
    
    // Explore Plants button (redirect to plants catalog)
    if (explorePlantsButton) {
        explorePlantsButton.addEventListener('click', function() {
            // Check if user is logged in
            if (typeof auth !== 'undefined' && auth.isLoggedIn()) {
                window.location.href = 'plants-catalog.html';
            } else {
                window.location.href = 'login.html?redirect=plants-catalog.html';
            }
        });
    }
    
    // Learn More button (scroll to features)
    if (learnMoreButton) {
        learnMoreButton.addEventListener('click', function() {
            document.getElementById('features').scrollIntoView({ 
                behavior: 'smooth' 
            });
        });
    }
    
    // Create Account button (redirect to signup)
    if (createAccountButton) {
        createAccountButton.addEventListener('click', function() {
            window.location.href = 'signup.html';
        });
    }
    
    // Learn More CTA button (redirect to about page)
    if (learnMoreCtaButton) {
        learnMoreCtaButton.addEventListener('click', function() {
            window.location.href = 'about.html';
        });
    }
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Only handle internal page anchors
            if (href !== '#' && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({ 
                        behavior: 'smooth' 
                    });
                    
                    // Update URL hash without scrolling
                    history.pushState(null, null, href);
                }
            }
        });
    });
}

// Initialize all functionality
function initAll() {
    initMobileMenuToggle();
    initScrollAnimations();
    initNavbarScroll();
    animateStats();
    initButtonFunctionality();
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', initAll);

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initMobileMenuToggle,
        initScrollAnimations,
        initNavbarScroll,
        animateStats,
        initButtonFunctionality,
        initAll
    };
}