// community-engagements.js
// community-engagements.js
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = isProduction 
  ? 'https://imbewu-dehthyfyfhb9dmhn.southafricanorth-01.azurewebsites.net/api' 
  : 'http://localhost:3000/api';

// Global variables
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentFilters = {};

// Function to get initials from a name
function getInitials(name) {
    if (!name) return '?';
    
    const names = name.trim().split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update user info
    updateUserInfo();
    
    // Initialize event listeners
    initEventListeners();
    
    // Load engagements
    loadEngagements();
});

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
        
        // Create avatar with initials fallback
        if (user.avatar_url) {
            userAvatarContainer.innerHTML = `
                <img src="${user.avatar_url}" alt="${user.full_name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="avatar-initials" style="display: none;">
                    ${getInitials(user.full_name)}
                </div>
            `;
        } else {
            userAvatarContainer.innerHTML = `
                <div class="avatar-initials">
                    ${getInitials(user.full_name)}
                </div>
            `;
        }
    }
}

function initEventListeners() {
    // Create engagement button
    document.getElementById('create-engagement-btn').addEventListener('click', showCreateForm);
    
    // Close form button
    document.getElementById('close-form-btn').addEventListener('click', hideCreateForm);
    
    // Cancel engagement button
    document.getElementById('cancel-engagement-btn').addEventListener('click', hideCreateForm);
    
    // Submit engagement button
    document.getElementById('submit-engagement-btn').addEventListener('click', createEngagement);
    
    // Filters
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    
    // Load more
    document.getElementById('load-more-btn').addEventListener('click', loadMoreEngagements);
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Infinite scroll
    window.addEventListener('scroll', handleScroll);
}

function showCreateForm() {
    document.getElementById('create-engagement-form').style.display = 'block';
    document.getElementById('create-engagement-btn').style.display = 'none';
}

function hideCreateForm() {
    document.getElementById('create-engagement-form').style.display = 'none';
    document.getElementById('create-engagement-btn').style.display = 'block';
    
    // Reset form fields
    document.getElementById('engagement-title').value = '';
    document.getElementById('engagement-content').value = '';
    document.getElementById('engagement-tags').value = '';
    document.getElementById('engagement-type').value = 'post';
}

async function createEngagement() {
    const title = document.getElementById('engagement-title').value.trim();
    const content = document.getElementById('engagement-content').value.trim();
    const tags = document.getElementById('engagement-tags').value.trim();
    const engagementType = document.getElementById('engagement-type').value;
    
    if (!content) {
        showNotification('Please write something to post', 'error');
        return;
    }
    
    try {
        const user = auth.getCurrentUser();
        const engagementData = {
            user_id: user.id,
            content: content,
            engagement_type: engagementType,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : []
        };
        
        // Add title if provided
        if (title) {
            engagementData.title = title;
        }
        
        const response = await fetch(`${API_BASE_URL}/engagements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify(engagementData)
        });
        
        if (response.ok) {
            hideCreateForm();
            showNotification('Engagement created successfully', 'success');
            loadEngagements(); // Reload feed
        } else {
            throw new Error('Failed to create engagement');
        }
    } catch (error) {
        console.error('Error creating engagement:', error);
        showNotification('Failed to create engagement', 'error');
    }
}

async function loadEngagements() {
    try {
        showLoading(true);
        currentPage = 1;
        hasMore = true;
        
        const queryParams = new URLSearchParams({
            limit: 10,
            offset: 0,
            ...currentFilters
        });
        
        const response = await fetch(`${API_BASE_URL}/engagements?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayEngagements(data.data);
            hasMore = data.data.length === 10;
        } else {
            throw new Error('Failed to load engagements');
        }
    } catch (error) {
        console.error('Error loading engagements:', error);
        showNotification('Failed to load engagements', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadMoreEngagements() {
    if (isLoading || !hasMore) return;
    
    try {
        isLoading = true;
        const loadMoreBtn = document.getElementById('load-more-btn');
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        
        const queryParams = new URLSearchParams({
            limit: 10,
            offset: currentPage * 10,
            ...currentFilters
        });
        
        const response = await fetch(`${API_BASE_URL}/engagements?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            appendEngagements(data.data);
            currentPage++;
            hasMore = data.data.length === 10;
        }
    } catch (error) {
        console.error('Error loading more engagements:', error);
        showNotification('Failed to load more engagements', 'error');
    } finally {
        isLoading = false;
        const loadMoreBtn = document.getElementById('load-more-btn');
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More';
        
        if (!hasMore) {
            loadMoreBtn.style.display = 'none';
        }
    }
}

function handleScroll() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const bottomThreshold = 100;
    
    if (scrollTop + clientHeight >= scrollHeight - bottomThreshold && !isLoading && hasMore) {
        loadMoreEngagements();
    }
}

function displayEngagements(engagements) {
    const feed = document.getElementById('engagements-feed');
    feed.innerHTML = '';
    
    if (engagements.length === 0) {
        feed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments fa-3x"></i>
                <h3>No engagements yet</h3>
                <p>Be the first to start a conversation!</p>
                <button class="btn btn-primary" onclick="showCreateForm()">Create First Engagement</button>
            </div>
        `;
        return;
    }
    
    engagements.forEach(engagement => {
        const engagementCard = createEngagementCard(engagement);
        feed.appendChild(engagementCard);
    });
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn.style.display = hasMore ? 'block' : 'none';
}

function appendEngagements(engagements) {
    const feed = document.getElementById('engagements-feed');
    
    engagements.forEach(engagement => {
        const engagementCard = createEngagementCard(engagement);
        feed.appendChild(engagementCard);
    });
}

function createEngagementCard(engagement) {
    const card = document.createElement('div');
    card.className = 'engagement-card';
    card.dataset.id = engagement.id;
    
    const user = engagement.profiles || {};
    const mediaCount = engagement.media_urls ? engagement.media_urls.length : 0;
    const currentUser = auth.getCurrentUser();
    
    // Create avatar HTML with initials fallback
    let avatarHTML = '';
    if (user.avatar_url) {
        avatarHTML = `
            <div class="card-avatar">
                <img src="${user.avatar_url}" alt="${user.full_name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="avatar-initials" style="display: none;">
                    ${getInitials(user.full_name)}
                </div>
            </div>
        `;
    } else {
        avatarHTML = `
            <div class="card-avatar">
                <div class="avatar-initials">
                    ${getInitials(user.full_name)}
                </div>
            </div>
        `;
    }
    
    // Create comment avatar HTML with initials fallback
    let commentAvatarHTML = '';
    if (currentUser.avatar_url) {
        commentAvatarHTML = `
            <img src="${currentUser.avatar_url}" alt="Your Avatar" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="avatar-initials" style="display: none;">
                ${getInitials(currentUser.full_name)}
            </div>
        `;
    } else {
        commentAvatarHTML = `
            <div class="avatar-initials">
                ${getInitials(currentUser.full_name)}
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="card-header">
            ${avatarHTML}
            <div class="card-user-info">
                <div class="card-user-name">${user.full_name || 'Unknown User'}</div>
                <div class="card-meta">
                    <span>${formatTime(engagement.created_at)}</span>
                    <span class="card-type ${engagement.engagement_type}">${engagement.engagement_type}</span>
                    ${user.cultural_affiliation ? `<span>${user.cultural_affiliation}</span>` : ''}
                </div>
            </div>
            ${user.id === currentUser.id ? `
                <div class="card-actions-menu">
                    <button class="menu-btn"><i class="fas fa-ellipsis-v"></i></button>
                    <div class="dropdown-menu">
                        <button class="dropdown-item edit-btn">Edit</button>
                        <button class="dropdown-item delete-btn">Delete</button>
                    </div>
                </div>
            ` : ''}
        </div>
        
        <div class="card-content">
            ${engagement.title ? `<h3 class="card-title">${engagement.title}</h3>` : ''}
            <div class="card-text">${formatContent(engagement.content)}</div>
            
            ${mediaCount > 0 ? `
                <div class="card-media">
                    <div class="media-grid">
                        ${engagement.media_urls.slice(0, 4).map((media, index) => `
                            <div class="media-item" data-media-index="${index}">
                                <img src="${media}" alt="Media ${index + 1}" onerror="this.style.display='none'">
                                ${mediaCount > 4 && index === 3 ? `
                                    <div class="media-overlay">
                                        <span class="media-count">+${mediaCount - 3}</span>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${engagement.tags && engagement.tags.length > 0 ? `
                <div class="card-tags">
                    ${engagement.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
        
        <div class="card-stats">
            <div class="stat-item like-stat ${engagement.user_has_liked ? 'active' : ''}">
                <i class="fas fa-heart"></i>
                <span>${engagement.like_count || 0} likes</span>
            </div>
            <div class="stat-item comment-stat">
                <i class="fas fa-comment"></i>
                <span>${engagement.comment_count || 0} comments</span>
            </div>
        </div>
        
        <div class="card-actions">
            <button class="action-btn like-btn ${engagement.user_has_liked ? 'active' : ''}">
                <i class="fas fa-heart"></i>
                ${engagement.user_has_liked ? 'Like' : 'Like'}
            </button>
            <button class="action-btn comment-btn">
                <i class="fas fa-comment"></i>
                Comment
            </button>
            <button class="action-btn share-btn">
                <i class="fas fa-share"></i>
                Share
            </button>
        </div>
        
        <div class="comments-section" style="display: none;">
            <div class="comment-form">
                <div class="comment-avatar">
                    ${commentAvatarHTML}
                </div>
                <div class="comment-input">
                    <input type="text" placeholder="Write a comment..." class="comment-input-field">
                    <button class="comment-submit-btn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
            <div class="comments-list">
                <div class="loading-comments">Loading comments...</div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const likeBtn = card.querySelector('.like-btn');
    const commentBtn = card.querySelector('.comment-btn');
    const commentSection = card.querySelector('.comments-section');
    const commentSubmitBtn = card.querySelector('.comment-submit-btn');
    const commentInput = card.querySelector('.comment-input-field');
    const shareBtn = card.querySelector('.share-btn');
    
    likeBtn.addEventListener('click', () => toggleLike(engagement.id, likeBtn, card.querySelector('.like-stat')));
    commentBtn.addEventListener('click', () => toggleComments(commentSection, engagement.id));
    commentSubmitBtn.addEventListener('click', () => addComment(engagement.id, commentInput));
    commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addComment(engagement.id, commentInput);
        }
    });
    shareBtn.addEventListener('click', () => shareEngagement(engagement));
    
    // Media click handler
    if (mediaCount > 0) {
        card.querySelectorAll('.media-item').forEach(item => {
            item.addEventListener('click', () => showMedia(engagement.media_urls, parseInt(item.dataset.mediaIndex)));
        });
    }
    
    // Menu actions for post owner
    if (user.id === currentUser.id) {
        const menuBtn = card.querySelector('.menu-btn');
        const dropdownMenu = card.querySelector('.dropdown-menu');
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        editBtn.addEventListener('click', () => editEngagement(engagement));
        deleteBtn.addEventListener('click', () => deleteEngagement(engagement.id));
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
    
    return card;
}

async function toggleLike(engagementId, button, statElement) {
    try {
        const user = auth.getCurrentUser();
        const isLiked = button.classList.contains('active');
        
        const response = await fetch(`${API_BASE_URL}/engagements/${engagementId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify({
                user_id: user.id,
                action: isLiked ? 'unlike' : 'like'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            button.classList.toggle('active');
            button.innerHTML = `
                <i class="fas fa-heart"></i>
                ${result.liked ? 'Liked' : 'Like'}
            `;
            
            // Update like count
            const likeCount = statElement.querySelector('span');
            const currentCount = parseInt(likeCount.textContent.split(' ')[0]);
            likeCount.textContent = `${currentCount + (result.liked ? 1 : -1)} likes`;
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        showNotification('Failed to update like', 'error');
    }
}

function toggleComments(section, engagementId) {
    const isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        loadComments(engagementId, section.querySelector('.comments-list'));
    }
}

async function loadComments(engagementId, container) {
    try {
        container.innerHTML = '<div class="loading-comments">Loading comments...</div>';
        
        const response = await fetch(`${API_BASE_URL}/engagements/${engagementId}/comments`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayComments(data.data, container);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        container.innerHTML = '<div class="error-loading">Failed to load comments</div>';
    }
}

function displayComments(comments, container) {
    container.innerHTML = '';
    
    if (comments.length === 0) {
        container.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';
        
        // Create avatar with initials fallback for comments
        let avatarHTML = '';
        if (comment.profiles?.avatar_url) {
            avatarHTML = `
                <div class="comment-avatar">
                    <img src="${comment.profiles.avatar_url}" alt="${comment.profiles.full_name}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="avatar-initials" style="display: none;">
                        ${getInitials(comment.profiles.full_name)}
                    </div>
                </div>
            `;
        } else {
            avatarHTML = `
                <div class="comment-avatar">
                    <div class="avatar-initials">
                        ${getInitials(comment.profiles?.full_name)}
                    </div>
                </div>
            `;
        }
        
        commentElement.innerHTML = `
            ${avatarHTML}
            <div class="comment-content">
                <div class="comment-author">${comment.profiles?.full_name || 'Unknown User'}</div>
                <div class="comment-text">${comment.content}</div>
                <div class="comment-meta">
                    <span>${formatTime(comment.created_at)}</span>
                    ${comment.is_edited ? '<span>Edited</span>' : ''}
                </div>
            </div>
        `;
        container.appendChild(commentElement);
    });
}

async function addComment(engagementId, input) {
    const content = input.value.trim();
    if (!content) return;
    
    try {
        const user = auth.getCurrentUser();
        const response = await fetch(`${API_BASE_URL}/engagements/${engagementId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify({
                user_id: user.id,
                content: content
            })
        });
        
        if (response.ok) {
            input.value = '';
            const commentsSection = input.closest('.comments-section');
            loadComments(engagementId, commentsSection.querySelector('.comments-list'));
            
            // Update comment count
            const engagementCard = input.closest('.engagement-card');
            const commentStat = engagementCard.querySelector('.comment-stat span');
            const currentCount = parseInt(commentStat.textContent.split(' ')[0]);
            commentStat.textContent = `${currentCount + 1} comments`;
            
            showNotification('Comment added successfully', 'success');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        showNotification('Failed to add comment', 'error');
    }
}

function applyFilters() {
    const contentType = document.getElementById('content-type').value;
    const sortBy = document.getElementById('sort-by').value;
    const culturalGroup = document.getElementById('cultural-group').value;
    
    currentFilters = {};
    
    if (contentType !== 'all') {
        currentFilters.engagement_type = contentType;
    }
    
    if (culturalGroup !== 'all') {
        currentFilters.cultural_group = culturalGroup;
    }
    
    currentFilters.sort_by = sortBy;
    currentFilters.sort_order = sortBy === 'oldest' ? 'asc' : 'desc';
    
    showNotification('Filters applied', 'success');
    loadEngagements();
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

function formatContent(content) {
    // Convert URLs to links
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // Convert hashtags
    content = content.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
    
    // Convert line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

function showMedia(mediaUrls, startIndex) {
    // Simple media viewer implementation
    const modal = document.createElement('div');
    modal.className = 'modal media-viewer active';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">&times;</button>
            <div class="media-container">
                <img src="${mediaUrls[startIndex]}" alt="Media">
            </div>
            <div class="media-controls">
                <button class="nav-btn prev" ${startIndex === 0 ? 'disabled' : ''}>←</button>
                <span class="media-counter">${startIndex + 1} / ${mediaUrls.length}</span>
                <button class="nav-btn next" ${startIndex === mediaUrls.length - 1 ? 'disabled' : ''}>→</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add navigation
    const prevBtn = modal.querySelector('.prev');
    const nextBtn = modal.querySelector('.next');
    const mediaImg = modal.querySelector('img');
    const counter = modal.querySelector('.media-counter');
    
    prevBtn.addEventListener('click', () => {
        const newIndex = Math.max(0, startIndex - 1);
        mediaImg.src = mediaUrls[newIndex];
        counter.textContent = `${newIndex + 1} / ${mediaUrls.length}`;
        prevBtn.disabled = newIndex === 0;
        nextBtn.disabled = newIndex === mediaUrls.length - 1;
        startIndex = newIndex;
    });
    
    nextBtn.addEventListener('click', () => {
        const newIndex = Math.min(mediaUrls.length - 1, startIndex + 1);
        mediaImg.src = mediaUrls[newIndex];
        counter.textContent = `${newIndex + 1} / ${mediaUrls.length}`;
        prevBtn.disabled = newIndex === 0;
        nextBtn.disabled = newIndex === mediaUrls.length - 1;
        startIndex = newIndex;
    });
    
    // Close modal
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function shareEngagement(engagement) {
    if (navigator.share) {
        navigator.share({
            title: engagement.title || 'Community Engagement',
            text: engagement.content,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        const shareUrl = `${window.location.origin}/engagement/${engagement.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification('Link copied to clipboard', 'success');
        }).catch(console.error);
    }
}

function editEngagement(engagement) {
    // Implementation for editing engagement
    showNotification('Edit functionality coming soon', 'info');
}

async function deleteEngagement(engagementId) {
    if (!confirm('Are you sure you want to delete this engagement?')) return;
    
    try {
        const user = auth.getCurrentUser();
        const response = await fetch(`${API_BASE_URL}/engagements/${engagementId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify({ user_id: user.id })
        });
        
        if (response.ok) {
            showNotification('Engagement deleted successfully', 'success');
            loadEngagements(); // Reload feed
        }
    } catch (error) {
        console.error('Error deleting engagement:', error);
        showNotification('Failed to delete engagement', 'error');
    }
}

function showLoading(show) {
    const feed = document.getElementById('engagements-feed');
    if (show) {
        feed.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading engagements...</span>
            </div>
        `;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Add notification styles if not already added
if (!document.querySelector('#notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
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
    document.head.appendChild(styles);
}

// Add media viewer styles
const mediaViewerStyles = document.createElement('style');
mediaViewerStyles.textContent = `
    .media-viewer .modal-content {
        max-width: 90vw;
        max-height: 90vh;
        background: rgba(0, 0, 0, 0.9);
    }
    
    .media-viewer .media-container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 70vh;
    }
    
    .media-viewer img,
    .media-viewer video {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
    
    .media-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        padding: 1rem;
        color: white;
    }
    
    .nav-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: var(--radius);
        cursor: pointer;
    }
    
    .nav-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .media-counter {
        font-weight: 600;
    }
`;
document.head.appendChild(mediaViewerStyles);

// Add avatar initials styles
const avatarStyles = document.createElement('style');
avatarStyles.textContent = `
    .user-avatar {
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: hsl(var(--wisdom-accent));
        color: white;
        font-weight: 600;
    }
    
    .user-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .user-avatar .avatar-initials {
        display: none;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
    }
    
    .card-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: hsl(var(--wisdom-accent));
        color: white;
        font-weight: 600;
        font-size: 16px;
    }
    
    .card-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .card-avatar .avatar-initials {
        display: none;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
    }
    
    .comment-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: hsl(var(--wisdom-accent));
        color: white;
        font-weight: 600;
        font-size: 12px;
        flex-shrink: 0;
    }
    
    .comment-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .comment-avatar .avatar-initials {
        display: none;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
    }
`;
document.head.appendChild(avatarStyles);

// Make functions available globally for HTML onclick attributes
window.showCreateForm = showCreateForm;