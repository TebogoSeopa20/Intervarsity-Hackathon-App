// moderator-reports.js
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = isProduction 
  ? 'https://imbewu-dehthyfyfhb9dmhn.southafricanorth-01.azurewebsites.net/api' 
  : 'http://localhost:3000/api';

// Global state
let currentReportType = 'seeker-reports';
let currentSeekerPage = 1;
let currentContributorPage = 1;
let seekerReportsTotal = 0;
let contributorReportsTotal = 0;
let currentReportId = null;
let currentReportData = null;

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const reportSections = document.querySelectorAll('.reports-section');
const seekerReportsList = document.getElementById('seeker-reports-list');
const contributorReportsList = document.getElementById('contributor-reports-list');
const seekerPagination = document.getElementById('seeker-pagination');
const contributorPagination = document.getElementById('contributor-pagination');
const seekerPrevBtn = document.getElementById('seeker-prev');
const seekerNextBtn = document.getElementById('seeker-next');
const contributorPrevBtn = document.getElementById('contributor-prev');
const contributorNextBtn = document.getElementById('contributor-next');
const seekerPageInfo = document.getElementById('seeker-page-info');
const contributorPageInfo = document.getElementById('contributor-page-info');
const statusFilter = document.getElementById('status-filter');
const dateFilter = document.getElementById('date-filter');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const applyFiltersBtn = document.getElementById('apply-filters');
const resetFiltersBtn = document.getElementById('reset-filters');
const modal = document.getElementById('report-detail-modal');
const modalTitle = document.getElementById('modal-report-title');
const modalContent = document.getElementById('modal-report-content');
const statusUpdateSelect = document.getElementById('status-update');
const updateStatusBtn = document.getElementById('update-status-btn');
const modalCloseBtn = document.getElementById('modal-close');
const modalCloseBtn2 = document.getElementById('modal-close-btn');

// Function to get initials from a name
function getInitials(name) {
    if (!name) return '?';
    
    const names = name.trim().split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isModerator()) {
        window.location.href = '../auth/login.html';
        return;
    }

    // Update user info
    updateUserInfo();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadSeekerReports();
    loadContributorReports();
    loadAnalytics();
});

// Update user info in navigation
function updateUserInfo() {
    const user = auth.getCurrentUser();
    const userNameElement = document.querySelector('.user-name');
    const userAvatarContainer = document.querySelector('.user-avatar');
    
    if (userNameElement && user && user.full_name) {
        userNameElement.textContent = user.full_name;
    }
    
    if (userAvatarContainer && user) {
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

// Set up event listeners
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // Pagination
    seekerPrevBtn.addEventListener('click', () => {
        if (currentSeekerPage > 1) {
            currentSeekerPage--;
            loadSeekerReports();
        }
    });

    seekerNextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(seekerReportsTotal / 10);
        if (currentSeekerPage < totalPages) {
            currentSeekerPage++;
            loadSeekerReports();
        }
    });

    contributorPrevBtn.addEventListener('click', () => {
        if (currentContributorPage > 1) {
            currentContributorPage--;
            loadContributorReports();
        }
    });

    contributorNextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(contributorReportsTotal / 10);
        if (currentContributorPage < totalPages) {
            currentContributorPage++;
            loadContributorReports();
        }
    });

    // Date filter toggle
    dateFilter.addEventListener('change', () => {
        const customDateRange = document.querySelector('.custom-date-range');
        if (dateFilter.value === 'custom') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
        }
    });

    // Filter application
    applyFiltersBtn.addEventListener('click', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);

    // Modal events
    modalCloseBtn.addEventListener('click', closeModal);
    modalCloseBtn2.addEventListener('click', closeModal);
    updateStatusBtn.addEventListener('click', updateReportStatus);

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Switch between tabs
function switchTab(tab) {
    // Update active tab button
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === tab) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // Show active section
    reportSections.forEach(section => {
        if (section.id === tab) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    currentReportType = tab;
}

// Apply filters to reports
function applyFilters() {
    if (currentReportType === 'seeker-reports') {
        currentSeekerPage = 1;
        loadSeekerReports();
    } else if (currentReportType === 'contributor-reports') {
        currentContributorPage = 1;
        loadContributorReports();
    }
}

// Reset filters
function resetFilters() {
    statusFilter.value = 'all';
    dateFilter.value = 'all';
    document.querySelector('.custom-date-range').style.display = 'none';
    startDateInput.value = '';
    endDateInput.value = '';
    
    applyFilters();
}

// Load seeker reports
async function loadSeekerReports() {
    try {
        showLoading(seekerReportsList);
        
        // Build query parameters
        const params = new URLSearchParams({
            limit: 10,
            offset: (currentSeekerPage - 1) * 10
        });
        
        // Add status filter
        if (statusFilter.value !== 'all') {
            params.append('status', statusFilter.value);
        }
        
        // Add date filter
        if (dateFilter.value !== 'all') {
            let startDate, endDate;
            const today = new Date();
            
            switch (dateFilter.value) {
                case 'today':
                    startDate = new Date(today.setHours(0, 0, 0, 0));
                    endDate = new Date(today.setHours(23, 59, 59, 999));
                    break;
                case 'week':
                    startDate = new Date(today.setDate(today.getDate() - today.getDay()));
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today.setDate(today.getDate() - today.getDay() + 6));
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'month':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'custom':
                    if (startDateInput.value && endDateInput.value) {
                        startDate = new Date(startDateInput.value);
                        endDate = new Date(endDateInput.value);
                        endDate.setHours(23, 59, 59, 999);
                    }
                    break;
            }
            
            if (startDate && endDate) {
                params.append('start_date', startDate.toISOString());
                params.append('end_date', endDate.toISOString());
            }
        }
        
        const response = await fetch(`${API_BASE_URL}/seeker-reports?${params}`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        seekerReportsTotal = data.pagination.total;
        
        // Update pagination info
        const totalPages = Math.ceil(seekerReportsTotal / 10);
        seekerPageInfo.textContent = `Page ${currentSeekerPage} of ${totalPages}`;
        
        // Enable/disable pagination buttons
        seekerPrevBtn.disabled = currentSeekerPage === 1;
        seekerNextBtn.disabled = currentSeekerPage === totalPages;
        
        // Render reports
        renderSeekerReports(data.data);
        
        // Update count badge
        document.getElementById('seeker-reports-count').textContent = seekerReportsTotal;
        
    } catch (error) {
        console.error('Error loading seeker reports:', error);
        showError(seekerReportsList, 'Failed to load seeker reports. Please try again.');
    }
}

// Load contributor reports
async function loadContributorReports() {
    try {
        showLoading(contributorReportsList);
        
        // Build query parameters
        const params = new URLSearchParams({
            limit: 10,
            offset: (currentContributorPage - 1) * 10
        });
        
        // Add status filter
        if (statusFilter.value !== 'all') {
            params.append('status', statusFilter.value);
        }
        
        // Add date filter
        if (dateFilter.value !== 'all') {
            let startDate, endDate;
            const today = new Date();
            
            switch (dateFilter.value) {
                case 'today':
                    startDate = new Date(today.setHours(0, 0, 0, 0));
                    endDate = new Date(today.setHours(23, 59, 59, 999));
                    break;
                case 'week':
                    startDate = new Date(today.setDate(today.getDate() - today.getDay()));
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today.setDate(today.getDate() - today.getDay() + 6));
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'month':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'custom':
                    if (startDateInput.value && endDateInput.value) {
                        startDate = new Date(startDateInput.value);
                        endDate = new Date(endDateInput.value);
                        endDate.setHours(23, 59, 59, 999);
                    }
                    break;
            }
            
            if (startDate && endDate) {
                params.append('start_date', startDate.toISOString());
                params.append('end_date', endDate.toISOString());
            }
        }
        
        const response = await fetch(`${API_BASE_URL}/contributor-reports?${params}`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        contributorReportsTotal = data.pagination.total;
        
        // Update pagination info
        const totalPages = Math.ceil(contributorReportsTotal / 10);
        contributorPageInfo.textContent = `Page ${currentContributorPage} of ${totalPages}`;
        
        // Enable/disable pagination buttons
        contributorPrevBtn.disabled = currentContributorPage === 1;
        contributorNextBtn.disabled = currentContributorPage === totalPages;
        
        // Render reports
        renderContributorReports(data.data);
        
        // Update count badge
        document.getElementById('contributor-reports-count').textContent = contributorReportsTotal;
        
    } catch (error) {
        console.error('Error loading contributor reports:', error);
        showError(contributorReportsList, 'Failed to load contributor reports. Please try again.');
    }
}

// Render seeker reports
function renderSeekerReports(reports) {
    if (!reports || reports.length === 0) {
        seekerReportsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No seeker reports found</p>
            </div>
        `;
        return;
    }
    
    const reportsHtml = reports.map(report => `
        <div class="report-item ${report.status.toLowerCase().replace('_', '-')}">
            <div class="report-header">
                <h3 class="report-title">${escapeHtml(report.product_name)}</h3>
                <span class="report-status status-${report.status.toLowerCase().replace('_', '_')}">
                    ${formatStatus(report.status)}
                </span>
            </div>
            <div class="report-meta">
                <div class="report-meta-item">
                    <i class="fas fa-store"></i>
                    <span>${escapeHtml(report.shop_name)}</span>
                </div>
                <div class="report-meta-item">
                    <i class="fas fa-tag"></i>
                    <span>${formatReason(report.reason)}</span>
                </div>
                <div class="report-meta-item">
                    <i class="fas fa-user"></i>
                    <span>${report.profiles ? escapeHtml(report.profiles.full_name) : 'Unknown User'}</span>
                </div>
            </div>
            <div class="report-description">
                <p>${escapeHtml(report.description)}</p>
            </div>
            ${report.evidence_urls && report.evidence_urls.length > 0 ? `
            <div class="report-evidence">
                <div class="evidence-title">Evidence:</div>
                <div class="evidence-images">
                    ${report.evidence_urls.map(url => `
                        <img src="${url}" alt="Evidence" class="evidence-image" onclick="openImageModal('${url}')">
                    `).join('')}
                </div>
            </div>
            ` : ''}
            <div class="report-footer">
                <div class="report-date">
                    Reported on ${formatDate(report.created_at)}
                </div>
                <div class="report-actions">
                    <button class="btn btn-sm btn-primary" onclick="openReportModal('seeker', '${report.report_id}')">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    seekerReportsList.innerHTML = reportsHtml;
}

// Render contributor reports
function renderContributorReports(reports) {
    if (!reports || reports.length === 0) {
        contributorReportsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No contributor reports found</p>
            </div>
        `;
        return;
    }
    
    const reportsHtml = reports.map(report => `
        <div class="report-item ${report.status.toLowerCase().replace('_', '-')}">
            <div class="report-header">
                <h3 class="report-title">${escapeHtml(report.product_name)}</h3>
                <span class="report-status status-${report.status.toLowerCase().replace('_', '_')}">
                    ${formatStatus(report.status)}
                </span>
            </div>
            <div class="report-meta">
                <div class="report-meta-item">
                    <i class="fas fa-building"></i>
                    <span>${escapeHtml(report.business_name)}</span>
                </div>
                <div class="report-meta-item">
                    <i class="fas fa-tag"></i>
                    <span>${formatReason(report.reason)}</span>
                </div>
                <div class="report-meta-item">
                    <i class="fas fa-barcode"></i>
                    <span>Batch: ${escapeHtml(report.batch_number)}</span>
                </div>
                <div class="report-meta-item">
                    <i class="fas fa-user"></i>
                    <span>${report.profiles ? escapeHtml(report.profiles.full_name) : 'Unknown User'}</span>
                </div>
            </div>
            <div class="report-description">
                <p>${escapeHtml(report.description)}</p>
            </div>
            ${report.evidence_urls && report.evidence_urls.length > 0 ? `
            <div class="report-evidence">
                <div class="evidence-title">Evidence:</div>
                <div class="evidence-images">
                    ${report.evidence_urls.map(url => `
                        <img src="${url}" alt="Evidence" class="evidence-image" onclick="openImageModal('${url}')">
                    `).join('')}
                </div>
            </div>
            ` : ''}
            <div class="report-footer">
                <div class="report-date">
                    Reported on ${formatDate(report.created_at)}
                </div>
                <div class="report-actions">
                    <button class="btn btn-sm btn-primary" onclick="openReportModal('contributor', '${report.report_id}')">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    contributorReportsList.innerHTML = reportsHtml;
}

// Open report detail modal
async function openReportModal(type, reportId) {
    try {
        showModalLoading();
        
        const endpoint = type === 'seeker' ? 'seeker-reports' : 'contributor-reports';
        const response = await fetch(`${API_BASE_URL}/${endpoint}/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const report = await response.json();
        currentReportId = reportId;
        currentReportData = report;
        currentReportType = type;
        
        // Set modal title
        modalTitle.textContent = `${type === 'seeker' ? 'Seeker' : 'Contributor'} Report Details`;
        
        // Set status update options based on report type
        statusUpdateSelect.innerHTML = '';
        let statusOptions;
        
        if (type === 'seeker') {
            statusOptions = [
                { value: 'PENDING_REVIEW', text: 'Pending Review' },
                { value: 'UNDER_INVESTIGATION', text: 'Under Investigation' },
                { value: 'RESOLVED', text: 'Resolved' }
            ];
        } else {
            statusOptions = [
                { value: 'PENDING_REVIEW', text: 'Pending Review' },
                { value: 'UNDER_INVESTIGATION', text: 'Under Investigation' },
                { value: 'AWAITING_DISTRIBUTOR_RESPONSE', text: 'Awaiting Distributor Response' },
                { value: 'RESOLVED', text: 'Resolved' }
            ];
        }
        
        statusOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            if (report.status === option.value) {
                optionElement.selected = true;
            }
            statusUpdateSelect.appendChild(optionElement);
        });
        
        // Generate modal content
        let modalHtml = '';
        
        if (type === 'seeker') {
            modalHtml = `
                <div class="report-detail">
                    <div class="detail-section">
                        <h3>Product Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Product Name:</label>
                                <span>${escapeHtml(report.product_name)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Brand:</label>
                                <span>${escapeHtml(report.product_brand || 'N/A')}</span>
                            </div>
                            <div class="detail-item">
                                <label>Barcode:</label>
                                <span>${escapeHtml(report.product_barcode || 'N/A')}</span>
                            </div>
                            <div class="detail-item">
                                <label>Description:</label>
                                <span>${escapeHtml(report.product_description || 'N/A')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Shop Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Shop Name:</label>
                                <span>${escapeHtml(report.shop_name)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Address:</label>
                                <span>${escapeHtml(report.shop_address || 'N/A')}</span>
                            </div>
                            ${report.shop_latitude && report.shop_longitude ? `
                            <div class="detail-item">
                                <label>Location:</label>
                                <span>${report.shop_latitude}, ${report.shop_longitude}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Report Details</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Reason:</label>
                                <span>${formatReason(report.reason)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Status:</label>
                                <span class="status-${report.status.toLowerCase().replace('_', '_')}">
                                    ${formatStatus(report.status)}
                                </span>
                            </div>
                            <div class="detail-item full-width">
                                <label>Description:</label>
                                <p>${escapeHtml(report.description)}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${report.evidence_urls && report.evidence_urls.length > 0 ? `
                    <div class="detail-section">
                        <h3>Evidence</h3>
                        <div class="evidence-grid">
                            ${report.evidence_urls.map(url => `
                                <div class="evidence-item">
                                    <img src="${url}" alt="Evidence" onclick="openImageModal('${url}')">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="detail-section">
                        <h3>Reporter Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>User ID:</label>
                                <span>${report.user_id}</span>
                            </div>
                            <div class="detail-item">
                                <label>Reported On:</label>
                                <span>${formatDate(report.created_at)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Last Updated:</label>
                                <span>${formatDate(report.updated_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            modalHtml = `
                <div class="report-detail">
                    <div class="detail-section">
                        <h3>Product Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Product Name:</label>
                                <span>${escapeHtml(report.product_name)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Brand:</label>
                                <span>${escapeHtml(report.product_brand || 'N/A')}</span>
                            </div>
                            <div class="detail-item">
                                <label>Barcode:</label>
                                <span>${escapeHtml(report.product_barcode || 'N/A')}</span>
                            </div>
                            <div class="detail-item">
                                <label>Batch Number:</label>
                                <span>${escapeHtml(report.batch_number)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Expiry Date:</label>
                                <span>${report.expiry_date ? formatDate(report.expiry_date) : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Business Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Business ID:</label>
                                <span>${escapeHtml(report.business_id)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Business Name:</label>
                                <span>${escapeHtml(report.business_name || 'N/A')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Distributor Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Distributor Name:</label>
                                <span>${escapeHtml(report.distributor_name)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Distributor Address:</label>
                                <span>${escapeHtml(report.distributor_address || 'N/A')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Report Details</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Reason:</label>
                                <span>${formatReason(report.reason)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Status:</label>
                                <span class="status-${report.status.toLowerCase().replace('_', '_')}">
                                    ${formatStatus(report.status)}
                                </span>
                            </div>
                            <div class="detail-item full-width">
                                <label>Description:</label>
                                <p>${escapeHtml(report.description)}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${report.evidence_urls && report.evidence_urls.length > 0 ? `
                    <div class="detail-section">
                        <h3>Evidence</h3>
                        <div class="evidence-grid">
                            ${report.evidence_urls.map(url => `
                                <div class="evidence-item">
                                    <img src="${url}" alt="Evidence" onclick="openImageModal('${url}')">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="detail-section">
                        <h3>Reporter Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>User ID:</label>
                                <span>${report.user_id}</span>
                            </div>
                            <div class="detail-item">
                                <label>Reported On:</label>
                                <span>${formatDate(report.created_at)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Last Updated:</label>
                                <span>${formatDate(report.updated_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        modalContent.innerHTML = modalHtml;
        modal.classList.add('active');
        
    } catch (error) {
        console.error('Error loading report details:', error);
        modalContent.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load report details. Please try again.</p>
            </div>
        `;
    }
}

// Update report status
async function updateReportStatus() {
    try {
        const newStatus = statusUpdateSelect.value;
        
        if (!currentReportId || !currentReportData) {
            showNotification('No report selected for update', 'error');
            return;
        }
        
        // Determine the correct API endpoint based on report type
        const endpoint = currentReportType === 'seeker-reports' ? 'seeker-reports' : 'contributor-reports';
        
        // Update the status in the database
        const response = await fetch(`${API_BASE_URL}/${endpoint}/${currentReportId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify({
                status: newStatus
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const updatedReport = await response.json();
        
        // Update the local data
        currentReportData.status = newStatus;
        
        // Show success notification
        showNotification('Report status updated successfully', 'success');
        
        // Refresh the reports list
        if (currentReportType === 'seeker-reports') {
            loadSeekerReports();
        } else if (currentReportType === 'contributor-reports') {
            loadContributorReports();
        }
        
        // Close the modal after a short delay
        setTimeout(() => {
            closeModal();
        }, 1500);
        
    } catch (error) {
        console.error('Error updating report status:', error);
        showNotification(`Failed to update report status: ${error.message}`, 'error');
    }
}

// Load analytics data
async function loadAnalytics() {
    try {
        // In a real implementation, you would fetch analytics data from the API
        // For now, we'll simulate some data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update report statistics
        const reportStats = document.getElementById('report-stats');
        reportStats.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${seekerReportsTotal + contributorReportsTotal}</div>
                <div class="stat-label">Total Reports</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${seekerReportsTotal}</div>
                <div class="stat-label">Seeker Reports</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${contributorReportsTotal}</div>
                <div class="stat-label">Contributor Reports</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${Math.floor((seekerReportsTotal + contributorReportsTotal) * 0.3)}</div>
                <div class="stat-label">Resolved</div>
            </div>
        `;
        
        // Update status chart (simplified)
        const statusChart = document.getElementById('status-chart');
        statusChart.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-chart-pie" style="font-size: 3rem; color: hsl(var(--muted-foreground));"></i>
                <p>Status distribution chart would appear here</p>
            </div>
        `;
        
        // Update reason chart (simplified)
        const reasonChart = document.getElementById('reason-chart');
        reasonChart.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-chart-bar" style="font-size: 3rem; color: hsl(var(--muted-foreground));"></i>
                <p>Reason distribution chart would appear here</p>
            </div>
        `;
        
        // Update recent activity
        const activityList = document.getElementById('analytics-activity');
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon report">
                    <i class="fas fa-flag"></i>
                </div>
                <div class="activity-content">
                    <p>New report submitted for Maize Meal</p>
                    <div class="activity-time">2 hours ago</div>
                </div>
            </div>
            <div class="activity-item">
                <div class="activity-icon update">
                    <i class="fas fa-sync"></i>
                </div>
                <div class="activity-content">
                    <p>Report status updated to Under Investigation</p>
                    <div class="activity-time">5 hours ago</div>
                </div>
            </div>
            <div class="activity-item">
                <div class="activity-icon resolve">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="activity-content">
                    <p>Report marked as Resolved</p>
                    <div class="activity-time">Yesterday</div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Helper functions
function showLoading(element) {
    element.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading...</p>
        </div>
    `;
}

function showError(element, message) {
    element.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

function showModalLoading() {
    modalContent.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading report details...</p>
        </div>
    `;
}

function closeModal() {
    modal.classList.remove('active');
    currentReportId = null;
    currentReportData = null;
    currentReportType = 'seeker-reports';
}

function formatStatus(status) {
    return status.split('_').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
}

function formatReason(reason) {
    return reason.split('_').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 5000);
}

// Global functions for HTML onclick attributes
window.openImageModal = function(url) {
    // In a real implementation, this would open a modal with the image
    window.open(url, '_blank');
};

window.openReportModal = openReportModal;