// seeker-appointments.js
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let currentTab = 'book';
let contributors = [];
let appointments = [];
let currentFilters = {};

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
    
    // Load initial data based on active tab
    loadActiveTabData();
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

function getInitials(name) {
    if (!name) return '?';
    
    const names = name.trim().split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

function initEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Search and filter events
    document.getElementById('contributor-search').addEventListener('input', debounce(filterContributors, 300));
    document.getElementById('expertise-filter').addEventListener('change', filterContributors);
    document.getElementById('cultural-filter').addEventListener('change', filterContributors);
    
    document.getElementById('status-filter').addEventListener('change', filterAppointments);
    document.getElementById('date-filter').addEventListener('change', filterAppointments);
    
    // Modal events
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });
    
    // Appointment type change
    document.getElementById('appointment-type').addEventListener('change', function() {
        document.getElementById('location-field').style.display = 
            this.value === 'in-person' ? 'block' : 'none';
    });
    
    document.getElementById('edit-appointment-type').addEventListener('change', function() {
        document.getElementById('edit-location-field').style.display = 
            this.value === 'in-person' ? 'block' : 'none';
    });
    
    // Form submissions
    document.getElementById('appointment-form').addEventListener('submit', handleAppointmentBooking);
    document.getElementById('edit-appointment-form').addEventListener('submit', handleAppointmentUpdate);
    
    // Cancel buttons
    document.getElementById('cancel-appointment-btn').addEventListener('click', () => {
        closeAllModals();
    });
    
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        closeAllModals();
    });
}

function switchTab(tabId) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabId}-appointment-tab`).classList.add('active');
    
    currentTab = tabId;
    loadActiveTabData();
}

function loadActiveTabData() {
    if (currentTab === 'book') {
        loadContributors();
    } else {
        loadAppointments();
    }
}

async function loadContributors() {
    try {
        showContributorsLoading(true);
        
        // Use the correct API endpoint for contributors
        const response = await fetch(`${API_BASE_URL}/users/role/contributor`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            contributors = data.data || [];
            displayContributors(contributors);
        } else {
            throw new Error('Failed to load contributors');
        }
    } catch (error) {
        console.error('Error loading contributors:', error);
        showNotification('Failed to load contributors', 'error');
    } finally {
        showContributorsLoading(false);
    }
}

function displayContributors(contributorsList) {
    const container = document.getElementById('contributors-list');
    
    if (contributorsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-times"></i>
                <h3>No contributors found</h3>
                <p>Try adjusting your search filters</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    contributorsList.forEach(contributor => {
        const card = createContributorCard(contributor);
        container.appendChild(card);
    });
}

function createContributorCard(contributor) {
    const card = document.createElement('div');
    card.className = 'contributor-card';
    
    // Create avatar with initials fallback
    let avatarHTML = '';
    if (contributor.avatar_url) {
        avatarHTML = `
            <img src="${contributor.avatar_url}" alt="${contributor.full_name}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="avatar-initials" style="display: none;">
                ${getInitials(contributor.full_name)}
            </div>
        `;
    } else {
        avatarHTML = `
            <div class="avatar-initials">
                ${getInitials(contributor.full_name)}
            </div>
        `;
    }
    
    // Use cultural_affiliation as expertise since the API response doesn't have expertise field
    const expertise = contributor.cultural_affiliation ? [contributor.cultural_affiliation] : ['Cultural Knowledge'];
    
    // Create expertise tags
    let expertiseTags = '';
    if (expertise && expertise.length > 0) {
        expertiseTags = expertise.slice(0, 3).map(expertise => 
            `<span class="expertise-tag">${expertise}</span>`
        ).join('');
        
        if (expertise.length > 3) {
            expertiseTags += `<span class="expertise-tag">+${expertise.length - 3}</span>`;
        }
    }
    
card.innerHTML = `
    <div class="contributor-header">
        <div class="contributor-avatar">
            ${avatarHTML}
        </div>
        <div class="contributor-info">
            <h3 class="contributor-name">${contributor.full_name || 'Unknown Contributor'}</h3>
            <p class="contributor-role">Healing Plants & Remedies Contributor</p>
            <div class="contributor-expertise">
                ${expertiseTags || '<span class="expertise-tag">Herbal Knowledge</span>'}
            </div>
        </div>
    </div>
    <div class="contributor-details">
        <p class="contributor-bio">${contributor.bio || 'This contributor shares knowledge about healing plants, safe plants to use, and natural remedy preparations.'}</p>
        <div class="contributor-stats">
            <div class="stat">
                <span class="stat-value">${contributor.rating || '4.8'}</span>
                <span class="stat-label">Rating</span>
            </div>
            <div class="stat">
                <span class="stat-value">${contributor.session_count || '24'}</span>
                <span class="stat-label">Sessions</span>
            </div>
            <div class="stat">
                <span class="stat-value">${contributor.specialization || 'Herbal Remedies'}</span>
                <span class="stat-label">Focus</span>
            </div>
        </div>
        <div class="contributor-actions">
            <button class="btn-book" data-contributor-id="${contributor.id}">
                <i class="fas fa-calendar-plus"></i> Book Appointment
            </button>
            <button class="btn-view" data-contributor-id="${contributor.id}">
                <i class="fas fa-eye"></i> View Profile
            </button>
        </div>
    </div>
`;

    
    // Add event listeners to buttons
    card.querySelector('.btn-book').addEventListener('click', () => {
        openBookAppointmentModal(contributor);
    });
    
    card.querySelector('.btn-view').addEventListener('click', () => {
        // In a real app, this would navigate to the contributor's profile
        showNotification(`Viewing profile of ${contributor.full_name}`, 'info');
    });
    
    return card;
}

async function loadAppointments() {
    try {
        showAppointmentsLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/appointments`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            appointments = data.data || [];
            displayAppointments(appointments);
        } else {
            throw new Error('Failed to load appointments');
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        showNotification('Failed to load appointments', 'error');
    } finally {
        showAppointmentsLoading(false);
    }
}

function displayAppointments(appointmentsList) {
    const container = document.getElementById('appointments-list');
    
    if (appointmentsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No appointments yet</h3>
                <p>Book your first appointment with a cultural knowledge contributor</p>
                <button class="btn btn-primary" id="book-first-appointment">
                    <i class="fas fa-calendar-plus"></i> Book Appointment
                </button>
            </div>
        `;
        
        document.getElementById('book-first-appointment').addEventListener('click', () => {
            switchTab('book');
        });
        
        return;
    }
    
    container.innerHTML = '';
    
    // Sort appointments by date (newest first)
    appointmentsList.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    
    appointmentsList.forEach(appointment => {
        const card = createAppointmentCard(appointment);
        container.appendChild(card);
    });
}

function createAppointmentCard(appointment) {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    const duration = (endTime - startTime) / (1000 * 60); // Duration in minutes
    
    // Format date and time
    const formattedDate = startTime.toLocaleDateString();
    const formattedTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Get contributor info from the user_id field in appointments
    const contributor = contributors.find(c => c.id === appointment.user_id) || {
        full_name: 'Unknown Contributor',
        avatar_url: null
    };
    
    // Create avatar with initials fallback
    let avatarHTML = '';
    if (contributor.avatar_url) {
        avatarHTML = `
            <img src="${contributor.avatar_url}" alt="${contributor.full_name}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="avatar-initials" style="display: none;">
                ${getInitials(contributor.full_name)}
            </div>
        `;
    } else {
        avatarHTML = `
            <div class="avatar-initials">
                ${getInitials(contributor.full_name)}
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="appointment-info">
            <h3 class="appointment-title">${appointment.title}</h3>
            <div class="appointment-details">
                <span><i class="fas fa-calendar-day"></i> ${formattedDate}</span>
                <span><i class="fas fa-clock"></i> ${formattedTime}</span>
                <span><i class="fas fa-hourglass-half"></i> ${duration} min</span>
                <span class="appointment-with">
                    <span class="appointment-with-avatar">
                        ${avatarHTML}
                    </span>
                    With: ${contributor.full_name}
                </span>
            </div>
            <span class="appointment-status status-${appointment.status}">${appointment.status}</span>
        </div>
        <div class="appointment-actions">
            <button class="btn-action btn-view" data-appointment-id="${appointment.id}" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-action btn-edit" data-appointment-id="${appointment.id}" title="Edit Appointment">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action btn-delete" data-appointment-id="${appointment.id}" title="Delete Appointment">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // Add event listeners to buttons
    card.querySelector('.btn-view').addEventListener('click', () => {
        viewAppointmentDetails(appointment);
    });
    
    card.querySelector('.btn-edit').addEventListener('click', () => {
        editAppointment(appointment);
    });
    
    card.querySelector('.btn-delete').addEventListener('click', () => {
        deleteAppointment(appointment.id);
    });
    
    return card;
}

function openBookAppointmentModal(contributor) {
    const modal = document.getElementById('book-appointment-modal');
    const contributorInfo = document.getElementById('modal-contributor-info');
    
    // Create avatar with initials fallback
    let avatarHTML = '';
    if (contributor.avatar_url) {
        avatarHTML = `
            <img src="${contributor.avatar_url}" alt="${contributor.full_name}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="avatar-initials" style="display: none;">
                ${getInitials(contributor.full_name)}
            </div>
        `;
    } else {
        avatarHTML = `
            <div class="avatar-initials">
                ${getInitials(contributor.full_name)}
            </div>
        `;
    }
    
    // Populate contributor info
    contributorInfo.innerHTML = `
        <div class="contributor-info-avatar">
            ${avatarHTML}
        </div>
        <div class="contributor-info-details">
            <h4 class="contributor-info-name">${contributor.full_name}</h4>
            <p class="contributor-info-role">Cultural Knowledge Contributor</p>
        </div>
    `;
    
    // Set contributor ID in form
    document.getElementById('contributor-id').value = contributor.id;
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('appointment-date').value = tomorrow.toISOString().split('T')[0];
    
    // Set default time to 10:00 AM
    document.getElementById('appointment-time').value = '10:00';
    
    // Reset form fields
    document.getElementById('appointment-title').value = '';
    document.getElementById('appointment-description').value = '';
    document.getElementById('appointment-type').value = 'virtual';
    document.getElementById('location-field').style.display = 'none';
    document.getElementById('appointment-location').value = '';
    
    // Show modal
    modal.classList.add('active');
}

async function handleAppointmentBooking(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';
        
        const user = auth.getCurrentUser();
        const contributorId = document.getElementById('contributor-id').value;
        const title = document.getElementById('appointment-title').value;
        const description = document.getElementById('appointment-description').value;
        const date = document.getElementById('appointment-date').value;
        const time = document.getElementById('appointment-time').value;
        const duration = parseInt(document.getElementById('appointment-duration').value);
        const appointmentType = document.getElementById('appointment-type').value;
        const location = document.getElementById('appointment-location').value;
        
        // Calculate start and end times
        const startTime = new Date(`${date}T${time}`);
        const endTime = new Date(startTime.getTime() + duration * 60000);
        
        const appointmentData = {
            user_id: contributorId, // This should be the contributor's ID
            title,
            description,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            appointment_type: appointmentType,
            location: appointmentType === 'in-person' ? location : null,
            status: 'scheduled'
        };
        
        const response = await fetch(`${API_BASE_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('Appointment booked successfully!', 'success');
            closeAllModals();
            
            // If we're on the appointments tab, refresh the list
            if (currentTab === 'my-appointments') {
                loadAppointments();
            }
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to book appointment');
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
        showNotification(error.message || 'Failed to book appointment', 'error');
    } finally {
        // Restore button state
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

function viewAppointmentDetails(appointment) {
    const modal = document.getElementById('appointment-detail-modal');
    const content = document.getElementById('appointment-detail-content');
    
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    const duration = (endTime - startTime) / (1000 * 60); // Duration in minutes
    
    // Format date and time
    const formattedDate = startTime.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const formattedTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Get contributor info
    const contributor = contributors.find(c => c.id === appointment.user_id) || {
        full_name: 'Unknown Contributor',
        avatar_url: null
    };
    
    // Create avatar with initials fallback
    let avatarHTML = '';
    if (contributor.avatar_url) {
        avatarHTML = `
            <img src="${contributor.avatar_url}" alt="${contributor.full_name}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="avatar-initials" style="display: none;">
                ${getInitials(contributor.full_name)}
            </div>
        `;
    } else {
        avatarHTML = `
            <div class="avatar-initials">
                ${getInitials(contributor.full_name)}
            </div>
        `;
    }
    
    content.innerHTML = `
        <div class="appointment-detail-header">
            <h4>${appointment.title}</h4>
            <span class="appointment-status status-${appointment.status}">${appointment.status}</span>
        </div>
        
        <div class="appointment-detail-info">
            <div class="detail-item">
                <i class="fas fa-user"></i>
                <div class="detail-content">
                    <span class="detail-label">With</span>
                    <span class="detail-value">
                        <span class="detail-avatar">
                            ${avatarHTML}
                        </span>
                        ${contributor.full_name}
                    </span>
                </div>
            </div>
            
            <div class="detail-item">
                <i class="fas fa-calendar-day"></i>
                <div class="detail-content">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
            </div>
            
            <div class="detail-item">
                <i class="fas fa-clock"></i>
                <div class="detail-content">
                    <span class="detail-label">Time</span>
                    <span class="detail-value">${formattedTime} - ${formattedEndTime} (${duration} minutes)</span>
                </div>
            </div>
            
            <div class="detail-item">
                <i class="fas fa-globe"></i>
                <div class="detail-content">
                    <span class="detail-label">Type</span>
                    <span class="detail-value">${appointment.appointment_type === 'in-person' ? 'In Person' : 'Virtual Meeting'}</span>
                </div>
            </div>
            
            ${appointment.location ? `
            <div class="detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <div class="detail-content">
                    <span class="detail-label">Location</span>
                    <span class="detail-value">${appointment.location}</span>
                </div>
            </div>
            ` : ''}
        </div>
        
        ${appointment.description ? `
        <div class="appointment-detail-description">
            <h5>Description</h5>
            <p>${appointment.description}</p>
        </div>
        ` : ''}
        
        <div class="appointment-detail-actions">
            <button class="btn btn-outline" id="close-detail-btn">Close</button>
            ${appointment.status === 'scheduled' ? `
            <button class="btn btn-primary" id="edit-detail-btn" data-appointment-id="${appointment.id}">
                <i class="fas fa-edit"></i> Edit Appointment
            </button>
            ` : ''}
        </div>
    `;
    
    // Add event listeners
    content.querySelector('#close-detail-btn').addEventListener('click', () => {
        closeAllModals();
    });
    
    if (content.querySelector('#edit-detail-btn')) {
        content.querySelector('#edit-detail-btn').addEventListener('click', () => {
            closeAllModals();
            editAppointment(appointment);
        });
    }
    
    // Show modal
    modal.classList.add('active');
}

function editAppointment(appointment) {
    const modal = document.getElementById('edit-appointment-modal');
    
    // Populate form with appointment data
    document.getElementById('edit-appointment-id').value = appointment.id;
    document.getElementById('edit-appointment-title').value = appointment.title;
    document.getElementById('edit-appointment-description').value = appointment.description || '';
    
    const startTime = new Date(appointment.start_time);
    document.getElementById('edit-appointment-date').value = startTime.toISOString().split('T')[0];
    document.getElementById('edit-appointment-time').value = startTime.toTimeString().slice(0, 5);
    
    const endTime = new Date(appointment.end_time);
    const duration = (endTime - startTime) / (1000 * 60);
    document.getElementById('edit-appointment-duration').value = duration;
    
    document.getElementById('edit-appointment-type').value = appointment.appointment_type || 'virtual';
    
    if (appointment.appointment_type === 'in-person') {
        document.getElementById('edit-location-field').style.display = 'block';
        document.getElementById('edit-appointment-location').value = appointment.location || '';
    } else {
        document.getElementById('edit-location-field').style.display = 'none';
    }
    
    // Show modal
    modal.classList.add('active');
}

async function handleAppointmentUpdate(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        
        const appointmentId = document.getElementById('edit-appointment-id').value;
        const title = document.getElementById('edit-appointment-title').value;
        const description = document.getElementById('edit-appointment-description').value;
        const date = document.getElementById('edit-appointment-date').value;
        const time = document.getElementById('edit-appointment-time').value;
        const duration = parseInt(document.getElementById('edit-appointment-duration').value);
        const appointmentType = document.getElementById('edit-appointment-type').value;
        const location = document.getElementById('edit-appointment-location').value;
        
        // Calculate start and end times
        const startTime = new Date(`${date}T${time}`);
        const endTime = new Date(startTime.getTime() + duration * 60000);
        
        const appointmentData = {
            title,
            description,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            appointment_type: appointmentType,
            location: appointmentType === 'in-person' ? location : null
        };
        
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('Appointment updated successfully!', 'success');
            closeAllModals();
            
            // Refresh the appointments list
            loadAppointments();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update appointment');
        }
    } catch (error) {
        console.error('Error updating appointment:', error);
        showNotification(error.message || 'Failed to update appointment', 'error');
    } finally {
        // Restore button state
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

async function deleteAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    try {
        const user = auth.getCurrentUser();
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify({ user_id: user.id })
        });
        
        if (response.ok) {
            showNotification('Appointment cancelled successfully', 'success');
            
            // Refresh the appointments list
            loadAppointments();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to cancel appointment');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showNotification(error.message || 'Failed to cancel appointment', 'error');
    }
}

function filterContributors() {
    const searchTerm = document.getElementById('contributor-search').value.toLowerCase();
    const expertiseFilter = document.getElementById('expertise-filter').value;
    const culturalFilter = document.getElementById('cultural-filter').value;
    
    const filteredContributors = contributors.filter(contributor => {
        // Search term filter
        const matchesSearch = 
            contributor.full_name?.toLowerCase().includes(searchTerm) ||
            (contributor.bio && contributor.bio.toLowerCase().includes(searchTerm)) ||
            contributor.cultural_affiliation?.toLowerCase().includes(searchTerm);
        
        // Expertise filter (using cultural_affiliation as expertise)
        const matchesExpertise = expertiseFilter === 'all' || 
            contributor.cultural_affiliation === expertiseFilter;
        
        // Cultural filter
        const matchesCultural = culturalFilter === 'all' || 
            contributor.cultural_affiliation === culturalFilter;
        
        return matchesSearch && matchesExpertise && matchesCultural;
    });
    
    displayContributors(filteredContributors);
}

function filterAppointments() {
    const statusFilter = document.getElementById('status-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    const now = new Date();
    
    const filteredAppointments = appointments.filter(appointment => {
        // Status filter
        const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
        
        // Date filter
        const appointmentDate = new Date(appointment.start_time);
        let matchesDate = true;
        
        if (dateFilter === 'upcoming') {
            matchesDate = appointmentDate >= now;
        } else if (dateFilter === 'past') {
            matchesDate = appointmentDate < now;
        }
        
        return matchesStatus && matchesDate;
    });
    
    displayAppointments(filteredAppointments);
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function showContributorsLoading(show) {
    const container = document.getElementById('contributors-list');
    
    if (show) {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading contributors...</span>
            </div>
        `;
    }
}

function showAppointmentsLoading(show) {
    const container = document.getElementById('appointments-list');
    
    if (show) {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading appointments...</span>
            </div>
        `;
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem;
                border-radius: var(--radius);
                box-shadow: var(--shadow-lg);
                background-color: white;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                z-index: 1001;
                max-width: 400px;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification-success {
                border-left: 4px solid hsl(var(--success));
            }
            
            .notification-error {
                border-left: 4px solid hsl(var(--error));
            }
            
            .notification-warning {
                border-left: 4px solid hsl(var(--warning));
            }
            
            .notification-info {
                border-left: 4px solid hsl(var(--info));
            }
            
            .notification-content {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .notification-success .notification-content i {
                color: hsl(var(--success));
            }
            
            .notification-error .notification-content i {
                color: hsl(var(--error));
            }
            
            .notification-warning .notification-content i {
                color: hsl(var(--warning));
            }
            
            .notification-info .notification-content i {
                color: hsl(var(--info));
            }
            
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                color: hsl(var(--muted-foreground));
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);
    
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

// Utility function to debounce rapid events
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