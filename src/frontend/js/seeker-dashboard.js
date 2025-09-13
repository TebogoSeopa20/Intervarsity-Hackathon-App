// seeker-dashboard.js - JavaScript for Imbewu Seeker Dashboard

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
    
    // Check if user is actually a seeker
    const user = auth.getCurrentUser();
    if (user.role !== 'seeker') {
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
    // In a real application, you might determine if plural is appropriate based on context
    return { 
        greeting: greetingData.singular, 
    };
}

// Initialize interactive elements
function initInteractiveElements() {
    // Plant identification button
    const identifyPlantBtn = document.querySelector('.welcome-actions .btn-primary');
    if (identifyPlantBtn) {
        identifyPlantBtn.addEventListener('click', function() {
            // Switch to plant identification section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#plant-identification"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('plant-identification').classList.add('active');
        });
    }
    
    // Explore knowledge button
    const exploreKnowledgeBtn = document.querySelector('.welcome-actions .btn-outline');
    if (exploreKnowledgeBtn) {
        exploreKnowledgeBtn.addEventListener('click', function() {
            // Switch to knowledge library section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#knowledge-library"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('knowledge-library').classList.add('active');
        });
    }
    
    // Initialize plant identification camera
    const startCameraBtn = document.querySelector('.camera-placeholder .btn');
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', function() {
            initCamera();
        });
    }
}

// Initialize camera for plant identification
function initCamera() {
    // This would typically access the device camera
    // For demonstration, we'll simulate camera activation
    const cameraPlaceholder = document.querySelector('.camera-placeholder');
    if (cameraPlaceholder) {
        cameraPlaceholder.innerHTML = `
            <div class="camera-active">
                <div class="camera-viewfinder"></div>
                <button class="btn btn-primary capture-btn">Capture Plant</button>
            </div>
        `;
        
        // Add event listener for capture button
        const captureBtn = document.querySelector('.capture-btn');
        if (captureBtn) {
            captureBtn.addEventListener('click', simulatePlantIdentification);
        }
    }
}

// Simulate plant identification process
function simulatePlantIdentification() {
    // This would typically send the image to a backend for identification
    // For demonstration, we'll simulate the process
    const cameraActive = document.querySelector('.camera-active');
    if (cameraActive) {
        cameraActive.innerHTML = `
            <div class="identifying">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Identifying plant...</p>
            </div>
        `;
        
        // Simulate identification process
        setTimeout(() => {
            showIdentificationResult();
        }, 2000);
    }
}

// Show plant identification result
function showIdentificationResult() {
    const cameraView = document.querySelector('.camera-view');
    if (cameraView) {
        cameraView.innerHTML = `
            <div class="identification-result">
                <div class="plant-image-large" style="background-color: #8D6E63;"></div>
                <div class="plant-details">
                    <h3>African Wormwood</h3>
                    <p class="scientific-name">Artemisia afra</p>
                    <div class="cultural-info">
                        <h4>Traditional Uses</h4>
                        <p>Used for respiratory health, fever reduction, and spiritual cleansing in many Southern African cultures.</p>
                    </div>
                    <div class="actions">
                        <button class="btn btn-primary">Save to Collection</button>
                        <button class="btn btn-outline">Learn More</button>
                    </div>
                </div>
            </div>
        `;
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
        welcomeHeading.innerHTML = `${greeting}, ${user.full_name || 'Seeker'}!`;
        
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
            welcomeMessage.innerHTML = `Protect your family with <span class="cultural-highlight">real-time food safety information</span> and community alerts.`;
        } else {
            welcomeMessage.innerHTML = `Protect your family with <span class="cultural-highlight">real-time food safety information</span> and community alerts.`;
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
            plants_learned: 24,
            traditions_understood: 12,
            cultural_badges: 3,
            learning_time: 18
        };
        
        // Update stats cards
        document.querySelectorAll('.stat-info h3')[0].textContent = userStats.plants_learned;
        document.querySelectorAll('.stat-info h3')[1].textContent = userStats.traditions_understood;
        document.querySelectorAll('.stat-info h3')[2].textContent = userStats.cultural_badges;
        document.querySelectorAll('.stat-info h3')[3].textContent = userStats.learning_time + 'h';
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
                // Switch to knowledge library and filter results
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                document.querySelector('[href="#knowledge-library"]').classList.add('active');
                
                document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
                document.getElementById('knowledge-library').classList.add('active');
                
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

// Initialize dashboard with data
function initDashboard() {
    // Update user info
    updateUserInfo();
    
    // Load dashboard stats
    loadDashboardStats();
    
    // Load recent scans
    loadRecentScans();
    
    // Load safety alerts
    loadSafetyAlerts();
}

// Update user information in the dashboard
function updateUserInfo() {
    const user = auth.getCurrentUser();
    const userNameElement = document.querySelector('.user-name');
    const userAvatarContainer = document.querySelector('.user-avatar');
    
    if (userNameElement && user.full_name) {
        userNameElement.textContent = user.full_name;
    }
    
    if (userAvatarContainer) {
        // Clear existing content
        userAvatarContainer.innerHTML = '';
        
        // Create avatar with initials
        userAvatarContainer.innerHTML = `
            <div class="avatar-initials">
                ${getInitials(user.full_name)}
            </div>
        `;
    }
}

// Get initials from name
function getInitials(name) {
    if (!name) return 'PS';
    
    const names = name.trim().split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

// Load dashboard statistics
function loadDashboardStats() {
    // Get data from localStorage or set defaults
    const recentFoods = JSON.parse(localStorage.getItem('recentFoods') || '[]');
    const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    
    // Update stats
    document.getElementById('scannedCount').textContent = recentFoods.length;
    document.getElementById('reportedCount').textContent = savedReports.length;
    
    // Simulate community posts count (would come from API in real app)
    document.getElementById('communityCount').textContent = Math.floor(Math.random() * 50) + 10;
    
    // Simulate safe vendors count
    document.getElementById('safeVendors').textContent = Math.floor(Math.random() * 20) + 5;
    
    // Update alert count
    document.getElementById('alertCount').textContent = 2;
}

// Load recent scans from localStorage
function loadRecentScans() {
    const recentFoods = JSON.parse(localStorage.getItem('recentFoods') || '[]');
    const scansGrid = document.getElementById('recentScans');
    
    if (recentFoods.length === 0) {
        scansGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-barcode"></i>
                <p>No recently scanned products</p>
                <a href="foodId.html" class="btn btn-primary">Scan Your First Product</a>
            </div>
        `;
        return;
    }
    
    let html = '';
    recentFoods.slice(0, 4).forEach(product => {
        // Determine safety status (simulated)
        const status = Math.random() > 0.7 ? 'warning' : (Math.random() > 0.9 ? 'danger' : 'safe');
        const statusText = status === 'safe' ? 'Safe' : (status === 'warning' ? 'Caution' : 'Unsafe');
        
        html += `
            <div class="scan-card">
                <div class="scan-image">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                        `<i class="fas fa-image"></i>`
                    }
                </div>
                <div class="scan-content">
                    <h3>${product.name || 'Unknown Product'}</h3>
                    <p>${product.brand || 'Unknown Brand'}</p>
                    <span class="scan-status status-${status}">${statusText}</span>
                </div>
            </div>
        `;
    });
    
    scansGrid.innerHTML = html;
}

// Load safety alerts (simulated)
function loadSafetyAlerts() {
    // In a real app, this would come from an API
    const alerts = [
        {
            type: 'critical',
            title: 'Recall: Baby Food Brand X',
            description: 'Potential contamination detected in batches sold between Oct-Nov 2023',
            time: '2 hours ago'
        },
        {
            type: 'warning',
            title: 'Allergen Warning: Product Y',
            description: 'Undeclared milk ingredients found in vegan-labeled products',
            time: 'Yesterday'
        }
    ];
    
    const alertsList = document.getElementById('safetyAlerts');
    let html = '';
    
    alerts.forEach(alert => {
        html += `
            <div class="alert-item ${alert.type}">
                <div class="alert-icon">
                    <i class="fas fa-${alert.type === 'critical' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                </div>
                <div class="alert-content">
                    <h3>${alert.title}</h3>
                    <p>${alert.description}</p>
                    <span class="alert-time">${alert.time}</span>
                </div>
            </div>
        `;
    });
    
    alertsList.innerHTML = html;
}

// Simulate checking for new alerts
function checkForNewAlerts() {
    // In a real app, this would poll an API
    const hasNewAlerts = Math.random() > 0.8;
    
    if (hasNewAlerts) {
        // Show notification
        showNotification('New safety alert available', 'warning');
        
        // Update alert count
        const currentCount = parseInt(document.getElementById('alertCount').textContent);
        document.getElementById('alertCount').textContent = currentCount + 1;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 90px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: var(--radius);
                background: hsl(var(--card));
                color: hsl(var(--card-foreground));
                box-shadow: var(--shadow-lg);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 400px;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification.success {
                border-left: 4px solid hsl(var(--success));
            }
            
            .notification.warning {
                border-left: 4px solid hsl(var(--warning));
            }
            
            .notification.error {
                border-left: 4px solid hsl(var(--error));
            }
            
            .notification-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                margin-left: auto;
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Add close event
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Check for alerts periodically (every 5 minutes)
setInterval(checkForNewAlerts, 5 * 60 * 1000);