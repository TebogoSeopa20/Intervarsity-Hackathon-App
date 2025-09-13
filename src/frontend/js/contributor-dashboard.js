// contributor-dashboard.js - JavaScript for Imbewu Contributor Dashboard

// Cultural greeting mappings
const culturalGreetings = {
    'zulu': { singular: 'Welcome', plural: 'Sanibonani' },
    'xhosa': { singular: 'Welcome', plural: 'Sanibonani' },
    'pedi': { singular: 'Welcome', plural: 'Thobela' },
    'tswana': { singular: 'Welcome', plural: 'Dumelang' },
    'sotho': { singular: 'Welcome', plural: 'Lumelang' },
    'tsonga': { singular: 'Welcome', plural: 'Avuxeni' },
    'swazi': { singular: 'Welcome', plural: 'Sanibonani' },
    'venda': { singular: 'Welcome', plural: 'Ndaa' },
    'ndebele': { singular: 'Welcome', plural: 'Lotjhanini' },
    'other': { singular: 'Welcome', plural: 'Hello' },
    'global': { singular: 'Welcome', plural: 'Welcome' },
    'multiple': { singular: 'Welcome', plural: 'Greetings' },
    'ally': { singular: 'Welcome', plural: 'Welcome' }
};

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Check if user is actually a contributor
    const user = auth.getCurrentUser();
    if (user.role !== 'contributor') {
        // Redirect to appropriate dashboard
        window.location.href = `${user.role}-dashboard.html`;
        return;
    }
    
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Navigation handling
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        const targetHref = this.getAttribute('href');
        
        // Check if it's an external link (contains .html)
        if (targetHref.includes('.html')) {
            // Allow default behavior for external links
            return;
        }
        
        // For internal section links, prevent default and handle tab switching
        e.preventDefault();
        
        // Remove active class from all items
        navItems.forEach(navItem => navItem.classList.remove('active'));
        
        // Add active class to clicked item
        this.classList.add('active');
        
        // Get target section ID
        const targetId = targetHref.substring(1);
        
        // Hide all sections
        dashboardSections.forEach(section => section.classList.remove('active'));
        
        // Show target section
        document.getElementById(targetId).classList.add('active');
        
        // Close mobile sidebar if open
        if (sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
});
    
    // Logout functionality
    const logoutButton = document.querySelector('.btn-logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            if (auth.handleLogout()) {
                window.location.href = 'login.html';
            }
        });
    }
    
    // Initialize stats animation
    animateStats();
    
    // Initialize interactive elements
    initInteractiveElements();
    
    // Load user-specific data
    loadUserData();
    
    // Initialize search functionality
    initSearch();
    
    // Initialize knowledge form
    initKnowledgeForm();
});

// Animate stats counters
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-info h3');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = parseInt(target.getAttribute('data-value') || target.textContent);
                const duration = 2000;
                const increment = finalValue / (duration / 16);
                let currentValue = 0;
                
                const timer = setInterval(() => {
                    currentValue += increment;
                    if (currentValue >= finalValue) {
                        target.textContent = finalValue;
                        clearInterval(timer);
                    } else {
                        target.textContent = Math.floor(currentValue);
                    }
                }, 16);
                
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => {
        stat.setAttribute('data-value', stat.textContent);
        stat.textContent = '0';
        observer.observe(stat);
    });
}

// Get appropriate greeting based on cultural affiliation
function getCulturalGreeting(culturalAffiliation) {
    // Default to English if no cultural affiliation specified
    if (!culturalAffiliation) {
        return { greeting: 'Hello', language: 'English' };
    }
    
    // Handle array case (multiple cultural affiliations)
    const primaryCulture = Array.isArray(culturalAffiliation) ? 
        culturalAffiliation[0] : culturalAffiliation;
    
    // Find the greeting for this culture
    const cultureKey = primaryCulture.toLowerCase();
    const greetingData = culturalGreetings[cultureKey] || culturalGreetings['other'];
    
    // For simplicity, we'll use singular form
    return { 
        greeting: greetingData.singular, 
        language: getLanguageName(cultureKey)
    };
}

// Get language name from culture key
function getLanguageName(cultureKey) {
    const languageNames = {
        'zulu': 'isiZulu',
        'xhosa': 'isiXhosa',
        'pedi': 'Sepedi',
        'tswana': 'Setswana',
        'sotho': 'Sesotho',
        'tsonga': 'Xitsonga',
        'swazi': 'siSwati',
        'venda': 'Tshivenda',
        'ndebele': 'isiNdebele',
        'other': 'English',
        'global': 'English',
        'multiple': 'Multicultural',
        'ally': 'English'
    };
    
    return languageNames[cultureKey] || 'English';
}

// Initialize interactive elements
function initInteractiveElements() {
    // Add knowledge button
    const addKnowledgeBtn = document.querySelector('.welcome-actions .btn-primary');
    if (addKnowledgeBtn) {
        addKnowledgeBtn.addEventListener('click', function() {
            // Switch to add knowledge section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#add-knowledge"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('add-knowledge').classList.add('active');
        });
    }
    
    // Review submissions button
    const reviewSubmissionsBtn = document.querySelector('.welcome-actions .btn-outline');
    if (reviewSubmissionsBtn) {
        reviewSubmissionsBtn.addEventListener('click', function() {
            // Switch to verification queue section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#verification-queue"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('verification-queue').classList.add('active');
        });
    }
    
    // Review buttons in queue preview
    const reviewButtons = document.querySelectorAll('.queue-actions .btn');
    reviewButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Switch to verification queue section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#verification-queue"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('verification-queue').classList.add('active');
        });
    });
    
    // Answer buttons in community questions
    const answerButtons = document.querySelectorAll('.question-actions .btn');
    answerButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Switch to community engagement section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#community-engagement"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('community-engagement').classList.add('active');
        });
    });
}

// Initialize knowledge form
function initKnowledgeForm() {
    const nextButtons = document.querySelectorAll('.next-btn');
    
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            const currentStep = this.closest('.form-step');
            const nextStepId = currentStep.getAttribute('data-next');
            
            if (nextStepId) {
                // Hide current step
                currentStep.classList.remove('active');
                
                // Show next step
                document.getElementById(nextStepId).classList.add('active');
            }
        });
    });
    
    // Knowledge type selection
    const knowledgeTypeOptions = document.querySelectorAll('.type-option input');
    knowledgeTypeOptions.forEach(option => {
        option.addEventListener('change', function() {
            // Update form based on selected knowledge type
            console.log('Selected knowledge type:', this.id);
        });
    });
}

// Load user-specific data
function loadUserData() {
    const user = auth.getCurrentUser();
    
    // Update user name in navbar
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement && user.full_name) {
        userNameElement.textContent = user.full_name;
    }
    
    // Get cultural greeting
    const culturalAffiliation = user.cultural_affiliation;
    const { greeting, language } = getCulturalGreeting(culturalAffiliation);
    
    // Update welcome message with cultural greeting
    const welcomeHeading = document.querySelector('.welcome-banner h1');
    if (welcomeHeading) {
        welcomeHeading.innerHTML = `${greeting}, ${user.full_name || 'Contributor'}!`;
        
        // Add language attribution as a subtle indicator
        const languageIndicator = document.createElement('span');
        languageIndicator.className = 'language-indicator';
        languageIndicator.style.fontSize = '0.7em';
        languageIndicator.style.opacity = '0.7';
        welcomeHeading.appendChild(languageIndicator);
    }
    
    // Update cultural context message
    const welcomeMessage = document.querySelector('.welcome-banner p');
    if (welcomeMessage && culturalAffiliation) {
        const culturalContext = Array.isArray(culturalAffiliation) ? 
            culturalAffiliation[0] : culturalAffiliation;
        
        // Format the cultural context for display
        const formattedCulture = culturalContext.charAt(0).toUpperCase() + culturalContext.slice(1);
        if (formattedCulture === 'Other') {
            welcomeMessage.innerHTML = `Verifying your products ensures <span class="cultural-highlight"safety</span> in our community`;
        } else {
            welcomeMessage.innerHTML = `Verifying your prodects ensures  <span class="cultural-highlight">safety</span> in our community.`;
        }
    }
    
    // Load user stats from server (simulated)
    simulateUserStatsLoading();
}

// Simulate loading user stats from server
function simulateUserStatsLoading() {
    // This would typically be an API call
    setTimeout(() => {
        const userStats = {
            contributions: 42,
            knowledge_views: 1200,
            items_verified: 28,
            appreciations: 347
        };
        
        // Update stats cards
        document.querySelectorAll('.stat-info h3')[0].textContent = userStats.contributions;
        document.querySelectorAll('.stat-info h3')[1].textContent = userStats.knowledge_views;
        document.querySelectorAll('.stat-info h3')[2].textContent = userStats.items_verified;
        document.querySelectorAll('.stat-info h3')[3].textContent = userStats.appreciations;
    }, 1000);
}

// Handle search functionality
function initSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-btn');
    
    if (searchInput && searchButton) {
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                // Redirect to search results or filter content
                console.log('Searching for:', query);
                // Implement actual search functionality here
            }
        };
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        searchButton.addEventListener('click', performSearch);
    }
}