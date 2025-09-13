// contributor-reports.js
// Contributor Product Reporting and Management System

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Update user info
    updateUserInfo();

    // API Configuration
    const API_BASE_URL = window.location.origin; // Assuming API is on same origin
    const user = auth.getCurrentUser();

    // DOM Elements
    const reportForm = document.getElementById('contributorReportForm');
    const reportsList = document.getElementById('reportsList');
    const statusFilter = document.getElementById('statusFilter');
    const reportsSearchInput = document.getElementById('reportsSearchInput');
    const reportsSearchBtn = document.getElementById('reportsSearchBtn');
    const scanBarcodeBtn = document.getElementById('scanBarcodeBtn');
    const evidenceUpload = document.getElementById('evidenceUpload');
    const triggerEvidenceUpload = document.getElementById('triggerEvidenceUpload');
    const uploadedFilesList = document.getElementById('uploadedFilesList');
    const reportDetailModal = document.getElementById('reportDetailModal');
    const reportDetailContent = document.getElementById('reportDetailContent');
    const confirmModal = document.getElementById('confirmModal');
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');

    // State variables
    let uploadedFiles = [];
    let currentReports = [];
    let reportToDelete = null;

    // Initialize the page
    initPage();

    // Event Listeners
    reportForm.addEventListener('submit', handleReportSubmit);
    statusFilter.addEventListener('change', loadUserReports);
    reportsSearchBtn.addEventListener('click', filterReports);
    reportsSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') filterReports();
    });
    scanBarcodeBtn.addEventListener('click', openBarcodeScanner);
    triggerEvidenceUpload.addEventListener('click', () => evidenceUpload.click());
    evidenceUpload.addEventListener('change', handleEvidenceUpload);
    modalCloseButtons.forEach(btn => btn.addEventListener('click', closeModals));
    cancelDeleteBtn.addEventListener('click', closeModals);
    confirmDeleteBtn.addEventListener('click', confirmDeleteReport);
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === reportDetailModal) closeModals();
        if (e.target === confirmModal) closeModals();
    });

    // Functions
    function initPage() {
        // Load user reports
        loadUserReports();
        
        // Set up user info
        updateUserInfo();
    }

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

    async function loadUserReports() {
        try {
            reportsList.innerHTML = `
                <div class="loading-reports">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading your reports...</p>
                </div>
            `;

            const status = statusFilter.value === 'all' ? '' : statusFilter.value;
            const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/contributor-reports?status=${status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            currentReports = data.data || [];
            
            displayReports(currentReports);
        } catch (error) {
            console.error('Error loading reports:', error);
            reportsList.innerHTML = `
                <div class="empty-reports">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load reports. Please try again.</p>
                    <button class="btn btn-outline" onclick="loadUserReports()">Retry</button>
                </div>
            `;
        }
    }

    function displayReports(reports) {
        if (reports.length === 0) {
            reportsList.innerHTML = `
                <div class="empty-reports">
                    <i class="fas fa-flag"></i>
                    <p>No reports found</p>
                    <small>Submit your first report using the form on the left</small>
                </div>
            `;
            return;
        }
        
        let html = '';
        reports.forEach(report => {
            const reportDate = new Date(report.created_at).toLocaleDateString();
            const statusClass = getStatusClass(report.status);
            
            html += `
                <div class="report-item" data-report-id="${report.report_id}">
                    <div class="report-header">
                        <div>
                            <div class="report-product">${report.product_name}</div>
                            <div class="report-batch">Batch: ${report.batch_number}</div>
                            <div class="report-distributor">${report.distributor_name}</div>
                        </div>
                        <span class="report-status ${statusClass}">${formatStatus(report.status)}</span>
                    </div>
                    
                    <span class="report-reason">${formatReason(report.reason)}</span>
                    
                    <div class="report-description">${report.description}</div>
                    
                    <div class="report-footer">
                        <div class="report-date">Reported on ${reportDate}</div>
                        <div class="report-actions">
                            <button class="report-action-btn view" onclick="viewReport('${report.report_id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="report-action-btn delete" onclick="confirmDelete('${report.report_id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        reportsList.innerHTML = html;
    }

    function filterReports() {
        const searchTerm = reportsSearchInput.value.toLowerCase().trim();
        
        if (!searchTerm) {
            displayReports(currentReports);
            return;
        }
        
        const filteredReports = currentReports.filter(report => {
            return (
                report.product_name.toLowerCase().includes(searchTerm) ||
                report.batch_number.toLowerCase().includes(searchTerm) ||
                report.distributor_name.toLowerCase().includes(searchTerm) ||
                report.reason.toLowerCase().includes(searchTerm) ||
                report.description.toLowerCase().includes(searchTerm)
            );
        });
        
        displayReports(filteredReports);
    }

    function getStatusClass(status) {
        switch (status) {
            case 'PENDING_REVIEW': return 'status-pending';
            case 'AWAITING_DISTRIBUTOR_RESPONSE': return 'status-awaiting';
            case 'UNDER_INVESTIGATION': return 'status-investigation';
            case 'RESOLVED': return 'status-resolved';
            default: return '';
        }
    }

    function formatStatus(status) {
        return status.toLowerCase().replace(/_/g, ' ');
    }

    function formatReason(reason) {
        return reason.toLowerCase().replace(/_/g, ' ');
    }

    async function handleReportSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(reportForm);
        const submitBtn = reportForm.querySelector('button[type="submit"]');
        
        // Basic validation
        if (!formData.get('businessId') || !formData.get('productName') || 
            !formData.get('batchNumber') || !formData.get('distributorName') || 
            !formData.get('reportReason') || !formData.get('reportDescription')) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            // Update button state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            
            // Prepare report data
            const reportData = {
                user_id: user.id,
                business_id: formData.get('businessId'),
                business_name: formData.get('businessName') || null,
                product_name: formData.get('productName'),
                product_brand: formData.get('productBrand') || null,
                product_barcode: formData.get('productBarcode') || null,
                batch_number: formData.get('batchNumber'),
                distributor_name: formData.get('distributorName'),
                distributor_address: formData.get('distributorAddress') || null,
                reason: formData.get('reportReason'),
                description: formData.get('reportDescription'),
                evidence_urls: [] // This would be populated after file upload in a real implementation
            };
            
            // Add expiry date if provided
            const expiryDate = formData.get('expiryDate');
            if (expiryDate) {
                reportData.expiry_date = expiryDate;
            }
            
            // Submit report
            const response = await fetch(`${API_BASE_URL}/api/contributor-reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reportData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Reset form
            reportForm.reset();
            uploadedFiles = [];
            uploadedFilesList.innerHTML = '';
            
            // Show success message
            alert('Report submitted successfully!');
            
            // Reload reports
            loadUserReports();
            
        } catch (error) {
            console.error('Error submitting report:', error);
            alert(`Failed to submit report: ${error.message}`);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Report';
        }
    }

    function handleEvidenceUpload(e) {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;
        
        // Validate files (in a real app, you'd check size, type, etc.)
        files.forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert('Please upload only image files');
                return;
            }
            
            uploadedFiles.push(file);
            displayUploadedFile(file);
        });
        
        // Reset the file input
        evidenceUpload.value = '';
    }

    function displayUploadedFile(file) {
        const fileElement = document.createElement('div');
        fileElement.className = 'uploaded-file';
        fileElement.innerHTML = `
            <i class="fas fa-file-image"></i>
            <span>${file.name}</span>
            <i class="fas fa-times remove-file" data-filename="${file.name}"></i>
        `;
        
        uploadedFilesList.appendChild(fileElement);
        
        // Add event listener to remove button
        fileElement.querySelector('.remove-file').addEventListener('click', function() {
            const filename = this.dataset.filename;
            removeUploadedFile(filename);
            fileElement.remove();
        });
    }

    function removeUploadedFile(filename) {
        uploadedFiles = uploadedFiles.filter(file => file.name !== filename);
    }

    function openBarcodeScanner() {
        // Redirect to food scanner page with barcode scanning activated
        window.location.href = 'contributor-foodId.html?mode=barcode&returnTo=reports';
    }

    async function viewReport(reportId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/contributor-reports/${reportId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const report = await response.json();
            displayReportDetail(report);
            
        } catch (error) {
            console.error('Error fetching report details:', error);
            alert('Failed to load report details. Please try again.');
        }
    }

    function displayReportDetail(report) {
        const reportDate = new Date(report.created_at).toLocaleDateString();
        const updatedDate = new Date(report.updated_at).toLocaleDateString();
        const statusClass = getStatusClass(report.status);
        
        let expiryDateHTML = '';
        if (report.expiry_date) {
            const expiryDate = new Date(report.expiry_date).toLocaleDateString();
            expiryDateHTML = `
                <div class="report-detail-item">
                    <div class="report-detail-label">Expiry Date</div>
                    <div class="report-detail-value">${expiryDate}</div>
                </div>
            `;
        }
        
        let evidenceHTML = '';
        if (report.evidence_urls && report.evidence_urls.length > 0) {
            evidenceHTML = `
                <div class="report-detail-item">
                    <div class="report-detail-label">Evidence</div>
                    <div class="report-evidence">
                        ${report.evidence_urls.map(url => `
                            <div class="evidence-item">
                                <img src="${url}" alt="Evidence image">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        reportDetailContent.innerHTML = `
            <div class="report-detail-item">
                <div class="report-detail-label">Business</div>
                <div class="report-detail-value">${report.business_name || report.business_id}</div>
            </div>
            
            <div class="report-detail-item">
                <div class="report-detail-label">Product</div>
                <div class="report-detail-value">${report.product_name} ${report.product_brand ? `(${report.product_brand})` : ''}</div>
            </div>
            
            ${report.product_barcode ? `
            <div class="report-detail-item">
                <div class="report-detail-label">Barcode</div>
                <div class="report-detail-value">${report.product_barcode}</div>
            </div>
            ` : ''}
            
            <div class="report-detail-item">
                <div class="report-detail-label">Batch Number</div>
                <div class="report-detail-value">${report.batch_number}</div>
            </div>
            
            ${expiryDateHTML}
            
            <div class="report-detail-item">
                <div class="report-detail-label">Distributor</div>
                <div class="report-detail-value">${report.distributor_name} ${report.distributor_address ? `<br>${report.distributor_address}` : ''}</div>
            </div>
            
            <div class="report-detail-item">
                <div class="report-detail-label">Issue Type</div>
                <div class="report-detail-value">${formatReason(report.reason)}</div>
            </div>
            
            <div class="report-detail-item">
                <div class="report-detail-label">Description</div>
                <div class="report-detail-value">${report.description}</div>
            </div>
            
            ${evidenceHTML}
            
            <div class="report-detail-item">
                <div class="report-detail-label">Status</div>
                <div class="report-detail-value">
                    <span class="report-status ${statusClass}">${formatStatus(report.status)}</span>
                </div>
            </div>
            
            <div class="report-detail-item">
                <div class="report-detail-label">Report Date</div>
                <div class="report-detail-value">${reportDate}</div>
            </div>
            
            <div class="report-detail-item">
                <div class="report-detail-label">Last Updated</div>
                <div class="report-detail-value">${updatedDate}</div>
            </div>
        `;
        
        reportDetailModal.style.display = 'block';
    }

    function confirmDelete(reportId) {
        reportToDelete = reportId;
        confirmModal.style.display = 'block';
    }

    async function confirmDeleteReport() {
        if (!reportToDelete) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/contributor-reports/${reportToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: user.id })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            // Remove the report from the UI
            const reportElement = document.querySelector(`.report-item[data-report-id="${reportToDelete}"]`);
            if (reportElement) {
                reportElement.remove();
            }
            
            // Remove from currentReports array
            currentReports = currentReports.filter(report => report.report_id !== reportToDelete);
            
            // Show message if no reports left
            if (currentReports.length === 0) {
                reportsList.innerHTML = `
                    <div class="empty-reports">
                        <i class="fas fa-flag"></i>
                        <p>No reports found</p>
                        <small>Submit your first report using the form on the left</small>
                    </div>
                `;
            }
            
            alert('Report deleted successfully');
            
        } catch (error) {
            console.error('Error deleting report:', error);
            alert(`Failed to delete report: ${error.message}`);
        } finally {
            closeModals();
            reportToDelete = null;
        }
    }

    function closeModals() {
        reportDetailModal.style.display = 'none';
        confirmModal.style.display = 'none';
        reportToDelete = null;
    }

    // Make functions available globally for onclick handlers
    window.viewReport = viewReport;
    window.confirmDelete = confirmDelete;
});