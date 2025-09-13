// my-contributions.js
const API_BASE_URL = 'http://localhost:3000/api';

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
    
    // Initialize the page
    initPage();
    setupEventListeners();
    
    // Update user name in navbar
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement && user.full_name) {
        userNameElement.textContent = user.full_name;
    }
});

// Initialize the page
function initPage() {
    // Load user contributions
    loadUserContributions();
    
    // Set up filters
    setupFilters();
}

// Load user contributions from both plants and cultural practices APIs
async function loadUserContributions() {
    try {
        const user = auth.getCurrentUser();
        
        // Fetch plants and cultural practices in parallel
        const [plantsResponse, practicesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/users/${user.id}/plants`, {
                headers: {
                    'Authorization': `Bearer ${auth.getAccessToken()}`
                }
            }),
            fetch(`${API_BASE_URL}/users/${user.id}/cultural-practices`, {
                headers: {
                    'Authorization': `Bearer ${auth.getAccessToken()}`
                }
            })
        ]);
        
        let plantsData = [];
        let practicesData = [];
        
        if (plantsResponse.ok) {
            const plantsResult = await plantsResponse.json();
            plantsData = plantsResult.data || [];
            // Add type identifier to each plant
            plantsData = plantsData.map(plant => ({ ...plant, type: 'plant' }));
        } else {
            console.error('Failed to load plants:', plantsResponse.status);
        }
        
        if (practicesResponse.ok) {
            const practicesResult = await practicesResponse.json();
            practicesData = practicesResult.data || [];
            // Add type identifier to each practice
            practicesData = practicesData.map(practice => ({ ...practice, type: 'practice' }));
        } else {
            console.error('Failed to load cultural practices:', practicesResponse.status);
        }
        
        // Combine both data sets
        const allContributions = [...plantsData, ...practicesData];
        
        // Display contributions
        displayContributions(allContributions);
        updateStats(allContributions);
        
    } catch (error) {
        console.error('Error loading contributions:', error);
        
    }
}

// Display contributions in the list
function displayContributions(contributions) {
    const container = document.querySelector('.contributions-items');
    
    // Clear existing items (except the template ones for demo)
    const existingItems = container.querySelectorAll('.contribution-item:not(.demo-item)');
    existingItems.forEach(item => item.remove());
    
    if (contributions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No contributions yet</h3>
                <p>You haven't submitted any plants or cultural practices yet.</p>
                <a href="add-knowledge.html" class="btn btn-primary">Add Your First Contribution</a>
            </div>
        `;
        return;
    }
    
    // Sort by creation date (newest first)
    contributions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Create HTML for each contribution
    contributions.forEach(contribution => {
        const item = createContributionItem(contribution);
        container.appendChild(item);
    });
}

// Create HTML for a single contribution item
function createContributionItem(contribution) {
    const isPlant = contribution.type === 'plant';
    const title = isPlant ? contribution.common_name : contribution.title;
    const description = isPlant ? contribution.description : contribution.short_description;
    const status = contribution.verification_status || 'pending';
    
    // Format date
    const date = new Date(contribution.created_at);
    const formattedDate = formatRelativeTime(date);
    
    // Get view and like counts
    const views = contribution.views_count || 0;
    const likes = contribution.likes_count || 0;
    
    const item = document.createElement('div');
    item.className = `contribution-item ${contribution.type} ${status}`;
    item.setAttribute('data-id', contribution.id);
    item.setAttribute('data-type', contribution.type);
    item.setAttribute('data-date', contribution.created_at);
    
    item.innerHTML = `
        <div class="item-preview">
            <img src="${isPlant ? '../images/plant-placeholder.jpg' : '../images/practice-placeholder.jpg'}" alt="${title}">
        </div>
        <div class="item-content">
            <div class="item-header">
                <h3>${title}</h3>
                <span class="status-badge ${status}">${formatStatus(status)}</span>
            </div>
            <p class="item-description">${description || 'No description available'}</p>
            <div class="item-meta">
                <span class="meta-item"><i class="fas fa-heart"></i> ${likes} Likes</span>
                <span class="meta-item"><i class="fas fa-eye"></i> ${views} Views</span>
                <span class="meta-item"><i class="fas fa-calendar"></i> ${formattedDate}</span>
            </div>
            <div class="item-actions">
                <button class="btn btn-outline view-item"><i class="fas fa-eye"></i> View</button>
                <button class="btn btn-outline edit-item"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-danger delete-item"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const viewBtn = item.querySelector('.view-item');
    const editBtn = item.querySelector('.edit-item');
    const deleteBtn = item.querySelector('.delete-item');
    
    viewBtn.addEventListener('click', () => viewContribution(item));
    editBtn.addEventListener('click', () => editContribution(item));
    deleteBtn.addEventListener('click', () => showDeleteModal(item));
    
    return item;
}

// Format status for display
function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending Review',
        'verified': 'Approved',
        'needs_review': 'Needs Revision',
        'rejected': 'Rejected',
        'restricted': 'Restricted'
    };
    
    return statusMap[status] || status;
}

// Format relative time (e.g., "2 days ago")
function formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
    }
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
}

// Update stats based on contributions
function updateStats(contributions) {
    const total = contributions.length;
    const approved = contributions.filter(c => c.verification_status === 'verified').length;
    const pending = contributions.filter(c => c.verification_status === 'pending').length;
    const totalViews = contributions.reduce((sum, c) => sum + (c.views_count || 0), 0);
    
    // Update the stat cards
    document.querySelector('.stat-card:nth-child(1) h3').textContent = total;
    document.querySelector('.stat-card:nth-child(2) h3').textContent = approved;
    document.querySelector('.stat-card:nth-child(3) h3').textContent = pending;
    document.querySelector('.stat-card:nth-child(4) h3').textContent = totalViews.toLocaleString();
}

// Set up filter functionality
function setupFilters() {
    const contentTypeFilter = document.getElementById('content-type');
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('contributions-search');
    const sortSelect = document.getElementById('sort-by');
    
    // Content type filter
    contentTypeFilter.addEventListener('change', filterContributions);
    
    // Status filter
    statusFilter.addEventListener('change', filterContributions);
    
    // Search functionality
    searchInput.addEventListener('input', filterContributions);
    
    // Sort functionality
    sortSelect.addEventListener('change', sortContributions);
}

// Filter contributions based on selected criteria
function filterContributions() {
    const contentType = document.getElementById('content-type').value;
    const status = document.getElementById('status-filter').value;
    const searchText = document.getElementById('contributions-search').value.toLowerCase();
    
    const items = document.querySelectorAll('.contribution-item');
    
    items.forEach(item => {
        let showItem = true;
        
        // Filter by content type
        if (contentType !== 'all') {
            const itemType = item.classList.contains('plant') ? 'plant' : 'practice';
            if (itemType !== contentType) {
                showItem = false;
            }
        }
        
        // Filter by status
        if (status !== 'all') {
            const itemStatus = item.classList.contains('approved') ? 'verified' : 
                              item.classList.contains('pending') ? 'pending' :
                              item.classList.contains('rejected') ? 'rejected' : 'pending';
            if (itemStatus !== status) {
                showItem = false;
            }
        }
        
        // Filter by search text
        if (searchText) {
            const title = item.querySelector('h3').textContent.toLowerCase();
            const description = item.querySelector('.item-description').textContent.toLowerCase();
            
            if (!title.includes(searchText) && !description.includes(searchText)) {
                showItem = false;
            }
        }
        
        // Show or hide the item
        item.style.display = showItem ? 'flex' : 'none';
    });
}

// Sort contributions
function sortContributions() {
    const sortBy = document.getElementById('sort-by').value;
    const container = document.querySelector('.contributions-items');
    const items = Array.from(container.querySelectorAll('.contribution-item'));
    
    items.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return new Date(b.getAttribute('data-date')) - new Date(a.getAttribute('data-date'));
            case 'oldest':
                return new Date(a.getAttribute('data-date')) - new Date(b.getAttribute('data-date'));
            case 'views':
                const aViews = parseInt(a.querySelector('.meta-item:nth-child(2)').textContent.match(/\d+/)[0]);
                const bViews = parseInt(b.querySelector('.meta-item:nth-child(2)').textContent.match(/\d+/)[0]);
                return bViews - aViews;
            case 'title':
                const aTitle = a.querySelector('h3').textContent;
                const bTitle = b.querySelector('h3').textContent;
                return aTitle.localeCompare(bTitle);
            default:
                return 0;
        }
    });
    
    // Remove all items and re-add in sorted order
    items.forEach(item => container.appendChild(item));
}

// Set up event listeners
function setupEventListeners() {
    // Delete modal actions
    document.getElementById('cancel-delete').addEventListener('click', hideDeleteModal);
    document.getElementById('confirm-delete').addEventListener('click', confirmDelete);
    
    // Logout button
    document.querySelector('.btn-logout').addEventListener('click', function() {
        auth.handleLogout();
        window.location.href = 'login.html';
    });
}

// View contribution
function viewContribution(item) {
    const type = item.getAttribute('data-type');
    const id = item.getAttribute('data-id');
    
    // Redirect to view page
    window.location.href = `view-${type}.html?id=${id}`;
}

// Edit contribution
function editContribution(item) {
    const type = item.getAttribute('data-type');
    const id = item.getAttribute('data-id');
    
    // Redirect to edit page
    window.location.href = `edit-${type}.html?id=${id}`;
}

// Show delete confirmation modal
function showDeleteModal(item) {
    const title = item.querySelector('h3').textContent;
    const id = item.getAttribute('data-id');
    const type = item.getAttribute('data-type');
    
    document.getElementById('delete-item-name').textContent = title;
    const modal = document.getElementById('delete-modal');
    modal.setAttribute('data-item-id', id);
    modal.setAttribute('data-item-type', type);
    modal.classList.add('active');
}

// Hide delete modal
function hideDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
}

// Confirm deletion
async function confirmDelete() {
    const modal = document.getElementById('delete-modal');
    const id = modal.getAttribute('data-item-id');
    const type = modal.getAttribute('data-item-type');
    const user = auth.getCurrentUser();
    
    try {
        const response = await fetch(`${API_BASE_URL}/${type}s/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify({ user_id: user.id })
        });
        
        if (response.ok) {
            // Remove the item from the UI
            const item = document.querySelector(`[data-id="${id}"]`);
            if (item) {
                item.remove();
            }
            
            // Reload stats
            loadUserContributions();
            
            // Show success message
            showNotification('Contribution deleted successfully', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error deleting contribution', 'error');
        }
    } catch (error) {
        console.error('Error deleting contribution:', error);
        showNotification('Network error. Please try again.', 'error');
    }
    
    hideDeleteModal();
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
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Set up close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

// Add empty state styles
const emptyStateStyles = document.createElement('style');
emptyStateStyles.textContent = `
    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        grid-column: 1 / -1;
    }
    
    .empty-state i {
        font-size: 4rem;
        color: hsl(var(--muted-foreground));
        margin-bottom: 1.5rem;
    }
    
    .empty-state h3 {
        margin-bottom: 0.5rem;
        color: hsl(var(--foreground));
    }
    
    .empty-state p {
        color: hsl(var(--muted-foreground));
        margin-bottom: 2rem;
    }
`;
document.head.appendChild(emptyStateStyles);

// Add notification styles if not already added
if (!document.querySelector('#notification-styles')) {
    const notificationStyles = document.createElement('style');
    notificationStyles.id = 'notification-styles';
    notificationStyles.textContent = `
        .notification {
            position: fixed;
            top: 100px;
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
        
        .notification.error {
            border-left: 4px solid hsl(var(--error));
        }
        
        .notification.info {
            border-left: 4px solid hsl(var(--wisdom-accent));
        }
        
        .notification-close {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            margin-left: auto;
        }
    `;
    document.head.appendChild(notificationStyles);
}