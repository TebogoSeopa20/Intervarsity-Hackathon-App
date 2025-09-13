// moderator-dashboard.js - JavaScript for Imbewu Moderator Dashboard

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
    
    // Check if user is actually a moderator
    const user = auth.getCurrentUser();
    if (user.role !== 'moderator') {
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
    
    // Initialize user management tabs
    initUserManagementTabs();
    
    // Initialize moderation actions
    initModerationActions();
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
    // Review content button
    const reviewContentBtn = document.querySelector('.welcome-actions .btn-primary');
    if (reviewContentBtn) {
        reviewContentBtn.addEventListener('click', function() {
            // Switch to content moderation section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#content-moderation"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('content-moderation').classList.add('active');
        });
    }
    
    // View reports button
    const viewReportsBtn = document.querySelector('.welcome-actions .btn-outline');
    if (viewReportsBtn) {
        viewReportsBtn.addEventListener('click', function() {
            // Switch to reports section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#reports-analytics"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('reports-analytics').classList.add('active');
        });
    }
    
    // Review buttons in queue preview
    const reviewButtons = document.querySelectorAll('.queue-actions .btn, .urgent-actions .btn');
    reviewButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Switch to content moderation section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#content-moderation"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('content-moderation').classList.add('active');
        });
    });
}

// Initialize user management tabs
function initUserManagementTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Show selected tab content
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Initialize moderation actions
function initModerationActions() {
    // Approve buttons
    const approveButtons = document.querySelectorAll('.btn-success');
    approveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const item = this.closest('.moderation-item, .application-item');
            simulateModerationAction(item, 'approved');
        });
    });
    
    // Reject buttons
    const rejectButtons = document.querySelectorAll('.btn-danger');
    rejectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const item = this.closest('.moderation-item, .application-item');
            simulateModerationAction(item, 'rejected');
        });
    });
    
    // Edit buttons
    const editButtons = document.querySelectorAll('.btn-warning');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const item = this.closest('.moderation-item');
            simulateModerationAction(item, 'edit');
        });
    });
}

// Simulate moderation action
function simulateModerationAction(item, action) {
    if (action === 'approved') {
        item.style.opacity = '0.5';
        setTimeout(() => {
            item.remove();
            updateModerationStats();
        }, 1000);
    } else if (action === 'rejected') {
        item.style.opacity = '0.5';
        setTimeout(() => {
            item.remove();
            updateModerationStats();
        }, 1000);
    } else if (action === 'edit') {
        alert('Edit functionality would open a detailed editing interface.');
    }
}

// Update moderation stats after actions
function updateModerationStats() {
    // This would typically update stats from server data
    const itemsModerated = document.querySelectorAll('.stat-info h3')[3];
    if (itemsModerated) {
        const currentValue = parseInt(itemsModerated.textContent);
        itemsModerated.textContent = currentValue + 1;
    }
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
        welcomeHeading.innerHTML = `${greeting}, ${user.full_name || 'Moderator'}!`;
        
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
            welcomeMessage.innerHTML = `Verifying your <span class="cultural-highlight">products</span> will ensure safety in our community.`;
        } else {
            welcomeMessage.innerHTML = `Verifying your products will ensure  <span class="cultural-highlight">safety</span> in our community.`;
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
            pending_reviews: 12,
            user_verifications: 5,
            content_reports: 8,
            items_moderated: 142
        };
        
        // Update stats cards
        document.querySelectorAll('.stat-info h3')[0].textContent = userStats.pending_reviews;
        document.querySelectorAll('.stat-info h3')[1].textContent = userStats.user_verifications;
        document.querySelectorAll('.stat-info h3')[2].textContent = userStats.content_reports;
        document.querySelectorAll('.stat-info h3')[3].textContent = userStats.items_moderated;
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