// add-knowledge.js - JavaScript for Imbewu Add Knowledge Page

// API base URL
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
    initKnowledgeTypeSelector();
    initFormInteractions();
    initFileUploads();
    initDynamicFormElements();
    loadRelatedContent();
    
    // Set up form submissions
    document.getElementById('plant-form').addEventListener('submit', handlePlantSubmission);
    document.getElementById('practice-form').addEventListener('submit', handlePracticeSubmission);
    
    // Set up draft saving
    document.getElementById('save-draft').addEventListener('click', () => saveAsDraft('plant'));
    document.getElementById('save-practice-draft').addEventListener('click', () => saveAsDraft('practice'));
    
    // Modal actions
    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('success-modal').classList.remove('active');
        window.location.href = 'my-contributions.html';
    });
    
    document.getElementById('add-another').addEventListener('click', () => {
        document.getElementById('success-modal').classList.remove('active');
        resetForms();
    });
    
    // Update user name in navbar
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement && user.full_name) {
        userNameElement.textContent = user.full_name;
    }
});

// Initialize knowledge type selector
function initKnowledgeTypeSelector() {
    const typeOptions = document.querySelectorAll('.type-option');
    
    typeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            typeOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Show the corresponding form
            const type = this.getAttribute('data-type');
            document.querySelectorAll('.knowledge-form').forEach(form => form.classList.remove('active'));
            document.getElementById(`${type}-form`).classList.add('active');
        });
    });
}

// Initialize form interactions
function initFormInteractions() {
    // Multi-select styling
    const multiSelects = document.querySelectorAll('select[multiple]');
    multiSelects.forEach(select => {
        select.addEventListener('change', function() {
            if (this.selectedOptions.length > 0) {
                this.style.backgroundColor = 'hsl(var(--nature-primary) / 0.05)';
            } else {
                this.style.backgroundColor = '';
            }
        });
    });
}

// Initialize file uploads
function initFileUploads() {
    // Plant photo upload
    const plantUploadArea = document.getElementById('plant-upload-area');
    const plantPhotoInput = document.getElementById('plant_photo');
    const plantPreview = document.getElementById('plant-preview');
    
    setupFileUpload(plantUploadArea, plantPhotoInput, plantPreview, 'image');
    
    // Practice media upload
    const practiceUploadArea = document.getElementById('practice-upload-area');
    const practiceMediaInput = document.getElementById('practice_media');
    const practiceMediaPreview = document.getElementById('practice-media-preview');
    
    setupFileUpload(practiceUploadArea, practiceMediaInput, practiceMediaPreview, 'mixed');
}

// Setup file upload functionality
function setupFileUpload(uploadArea, fileInput, previewArea, type) {
    // Handle drag and drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = 'hsl(var(--nature-primary))';
        this.style.backgroundColor = 'hsl(var(--nature-primary) / 0.1)';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '';
        this.style.backgroundColor = '';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '';
        this.style.backgroundColor = '';
        
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files, previewArea, type);
        }
    });
    
    // Handle file input change
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFiles(this.files, previewArea, type);
        }
    });
}

// Handle uploaded files
function handleFiles(files, previewArea, type) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file type
        if (type === 'image' && !file.type.startsWith('image/')) {
            showNotification('Please upload only image files', 'error');
            continue;
        }
        
        // Create preview
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            previewItem.appendChild(img);
        } else if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = URL.createObjectURL(file);
            previewItem.appendChild(audio);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.controls = true;
            video.src = URL.createObjectURL(file);
            previewItem.appendChild(video);
        } else {
            // Unsupported file type
            showNotification('Unsupported file type: ' + file.type, 'error');
            continue;
        }
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-media';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', function() {
            previewItem.remove();
        });
        
        previewItem.appendChild(removeBtn);
        previewArea.appendChild(previewItem);
    }
}

// Initialize dynamic form elements
function initDynamicFormElements() {
    // Cultural uses
    document.getElementById('add-cultural-use').addEventListener('click', function() {
        const container = document.getElementById('traditional-uses-container');
        const newEntry = document.createElement('div');
        newEntry.className = 'cultural-use-entry';
        newEntry.innerHTML = `
            <select class="cultural-group-select" name="cultural_group">
                <option value="">Select cultural group</option>
                <option value="Zulu">Zulu</option>
                <option value="Xhosa">Xhosa</option>
                <option value="Pedi">Pedi</option>
                <option value="Tswana">Tswana</option>
                <option value="Sotho">Sotho</option>
                <option value="Tsonga">Tsonga</option>
                <option value="Swazi">Swazi</option>
                <option value="Venda">Venda</option>
                <option value="Ndebele">Ndebele</option>
            </select>
            <input type="text" class="use-description" placeholder="Description of use">
            <button type="button" class="btn-remove-use"><i class="fas fa-times"></i></button>
        `;
        
        newEntry.querySelector('.btn-remove-use').addEventListener('click', function() {
            newEntry.remove();
        });
        
        container.appendChild(newEntry);
    });
    
    // Materials
    document.getElementById('add-material').addEventListener('click', function() {
        const container = document.getElementById('materials-container');
        addMaterialEntry(container);
    });
    
    // Ritual objects
    document.getElementById('add-ritual-object').addEventListener('click', function() {
        const container = document.getElementById('ritual-objects-container');
        addRitualObjectEntry(container);
    });
    
    // Procedure steps
    document.getElementById('add-procedure-step').addEventListener('click', function() {
        const container = document.getElementById('procedure-steps-container');
        addProcedureStepEntry(container);
    });
    
    // Purposes
    document.getElementById('add-purpose').addEventListener('click', function() {
        const container = document.getElementById('purposes-container');
        addPurposeEntry(container);
    });
}

// Add material entry
function addMaterialEntry(container) {
    const newEntry = document.createElement('div');
    newEntry.className = 'material-entry';
    newEntry.innerHTML = `
        <input type="text" class="material-item" placeholder="Item name">
        <textarea class="material-preparation" placeholder="Special preparations (optional)" rows="1"></textarea>
        <button type="button" class="btn-remove-material"><i class="fas fa-times"></i></button>
    `;
    
    newEntry.querySelector('.btn-remove-material').addEventListener('click', function() {
        newEntry.remove();
    });
    
    container.appendChild(newEntry);
}

// Add ritual object entry
function addRitualObjectEntry(container) {
    const newEntry = document.createElement('div');
    newEntry.className = 'ritual-object-entry';
    newEntry.innerHTML = `
        <input type="text" class="ritual-object-name" placeholder="Object name">
        <textarea class="ritual-object-significance" placeholder="Significance (optional)" rows="1"></textarea>
        <button type="button" class="btn-remove-ritual-object"><i class="fas fa-times"></i></button>
    `;
    
    newEntry.querySelector('.btn-remove-ritual-object').addEventListener('click', function() {
        newEntry.remove();
    });
    
    container.appendChild(newEntry);
}

// Add procedure step entry
function addProcedureStepEntry(container) {
    const stepNumber = container.children.length + 1;
    const newEntry = document.createElement('div');
    newEntry.className = 'procedure-step-entry';
    newEntry.innerHTML = `
        <input type="number" class="step-number" placeholder="${stepNumber}" min="1" value="${stepNumber}">
        <textarea class="step-description" placeholder="Description of this step" rows="2"></textarea>
        <input type="text" class="step-duration" placeholder="Duration (optional)">
        <button type="button" class="btn-remove-step"><i class="fas fa-times"></i></button>
    `;
    
    newEntry.querySelector('.btn-remove-step').addEventListener('click', function() {
        newEntry.remove();
        // Renumber remaining steps
        const steps = container.querySelectorAll('.procedure-step-entry');
        steps.forEach((step, index) => {
            step.querySelector('.step-number').value = index + 1;
        });
    });
    
    container.appendChild(newEntry);
}

// Add purpose entry
function addPurposeEntry(container) {
    const newEntry = document.createElement('div');
    newEntry.className = 'purpose-entry';
    newEntry.innerHTML = `
        <input type="text" class="purpose-item" placeholder="Purpose">
        <button type="button" class="btn-remove-purpose"><i class="fas fa-times"></i></button>
    `;
    
    newEntry.querySelector('.btn-remove-purpose').addEventListener('click', function() {
        newEntry.remove();
    });
    
    container.appendChild(newEntry);
}

// Load related content for dropdowns
function loadRelatedContent() {
    // This would typically make API calls to get plants and practices
    // For now, we'll simulate this with a timeout
    
    setTimeout(() => {
        // Simulate loading plants
        const plantSelect = document.getElementById('related_plants');
        const practiceSelect = document.getElementById('related_practices');
        
        const samplePlants = [
            { id: '1', name: 'Umhlonyane (Artemisia afra)' },
            { id: '2', name: 'Impila (Callilepis laureola)' },
            { id: '3', name: 'African Potato (Hypoxis hemerocallidea)' },
            { id: '4', name: 'Devil\'s Claw (Harpagophytum procumbens)' },
            { id: '5', name: 'Buchu (Agathosma betulina)' }
        ];
        
        const samplePractices = [
            { id: '1', name: 'Traditional Harvesting Ceremony' },
            { id: '2', name: 'Ancestral Communication Ritual' },
            { id: '3', name: 'Seasonal Cleansing Practice' },
            { id: '4', name: 'Healing Plant Preparation' },
            { id: '5', name: 'Lunar Planting Guidance' }
        ];
        
        // Add plants to select
        samplePlants.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant.id;
            option.textContent = plant.name;
            plantSelect.appendChild(option);
        });
        
        // Add practices to select
        samplePractices.forEach(practice => {
            const option = document.createElement('option');
            option.value = practice.id;
            option.textContent = practice.name;
            practiceSelect.appendChild(option);
        });
    }, 1000);
}

// Handle plant form submission
async function handlePlantSubmission(e) {
    e.preventDefault();
    
    const user = auth.getCurrentUser();
    if (!user) {
        showNotification('Please log in to submit knowledge', 'error');
        return;
    }
    
    // Get form data
    const formData = new FormData(e.target);
    const plantData = {
        user_id: user.id,
        common_name: formData.get('common_name'),
        scientific_name: formData.get('scientific_name'),
        local_names: formData.get('local_names') ? formData.get('local_names').split(',').map(name => name.trim()) : [],
        description: formData.get('description'),
        identifying_features: formData.get('identifying_features'),
        similar_plants: formData.get('similar_plants'),
        regions_found: Array.from(formData.getAll('regions_found')),
        habitat: formData.get('habitat'),
        growing_conditions: formData.get('growing_conditions'),
        seasonality: formData.get('seasonality'),
        conservation_status: formData.get('conservation_status'),
        preparation_methods: formData.get('preparation_methods'),
        dosage_guidelines: formData.get('dosage_guidelines'),
        administration_methods: formData.get('administration_methods'),
        contraindications: formData.get('contraindications'),
        safety_precautions: formData.get('safety_precautions'),
        active_compounds: formData.get('active_compounds'),
        pharmacological_properties: formData.get('pharmacological_properties'),
        scientific_references: formData.get('scientific_references'),
        modern_applications: formData.get('modern_applications'),
        cultural_significance: formData.get('cultural_significance'),
        rituals_associated: formData.get('rituals_associated'),
        spiritual_uses: formData.get('spiritual_uses'),
        harvesting_protocols: formData.get('harvesting_protocols'),
        verification_status: 'pending'
    };
    
    // Process traditional uses
    const useEntries = document.querySelectorAll('.cultural-use-entry');
    plantData.traditional_uses = [];
    
    useEntries.forEach(entry => {
        const culturalGroup = entry.querySelector('.cultural-group-select').value;
        const useDescription = entry.querySelector('.use-description').value;
        
        if (culturalGroup && useDescription) {
            plantData.traditional_uses.push({
                cultural_group: culturalGroup,
                use: useDescription
            });
        }
    });
    
    // Process uploaded images
    const imagePreviews = document.getElementById('plant-preview').querySelectorAll('img');
    if (imagePreviews.length > 0) {
        plantData.photo_url = URL.createObjectURL(await getBlobFromSrc(imagePreviews[0].src));
        
        if (imagePreviews.length > 1) {
            plantData.additional_photos = [];
            for (let i = 1; i < imagePreviews.length; i++) {
                plantData.additional_photos.push(URL.createObjectURL(await getBlobFromSrc(imagePreviews[i].src)));
            }
        }
    }
    
    try {
        // Submit to API
        const response = await fetch(`${API_BASE_URL}/plants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify(plantData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccessModal();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error submitting plant knowledge', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Handle practice form submission
async function handlePracticeSubmission(e) {
    e.preventDefault();
    
    const user = auth.getCurrentUser();
    if (!user) {
        showNotification('Please log in to submit knowledge', 'error');
        return;
    }
    
    // Get form data
    const formData = new FormData(e.target);
    const practiceData = {
        user_id: user.id,
        title: formData.get('title'),
        type: formData.get('type'),
        cultural_group: formData.get('cultural_group'),
        short_description: formData.get('short_description'),
        detailed_description: formData.get('detailed_description'),
        time_of_year: formData.get('time_of_year'),
        lunar_phase: formData.get('lunar_phase'),
        time_of_day: formData.get('time_of_day'),
        duration: formData.get('duration'),
        frequency: formData.get('frequency'),
        location_context: formData.get('location_context'),
        required_participants: formData.get('required_participants'),
        cultural_significance: formData.get('cultural_significance'),
        historical_context: formData.get('historical_context'),
        preparation_steps: formData.get('preparation_steps'),
        songs_chants: formData.get('songs_chants'),
        prayers_invocations: formData.get('prayers_invocations'),
        expected_outcomes: formData.get('expected_outcomes'),
        symbolic_meanings: formData.get('symbolic_meanings'),
        modern_adaptations: formData.get('modern_adaptations'),
        relevance_today: formData.get('relevance_today'),
        youth_engagement_strategies: formData.get('youth_engagement_strategies'),
        cultural_sensitivity_level: formData.get('cultural_sensitivity_level'),
        verification_level: formData.get('verification_level'),
        verification_status: 'pending',
        related_plants: Array.from(formData.getAll('related_plants')),
        related_practices: Array.from(formData.getAll('related_practices'))
    };
    
    // Process materials needed
    const materialEntries = document.querySelectorAll('.material-entry');
    practiceData.materials_needed = { items: [] };
    
    materialEntries.forEach(entry => {
        const item = entry.querySelector('.material-item').value;
        const preparation = entry.querySelector('.material-preparation').value;
        
        if (item) {
            practiceData.materials_needed.items.push({
                item: item,
                preparation: preparation || ''
            });
        }
    });
    
    // Process ritual objects
    const ritualObjectEntries = document.querySelectorAll('.ritual-object-entry');
    practiceData.ritual_objects = { objects: [] };
    
    ritualObjectEntries.forEach(entry => {
        const object = entry.querySelector('.ritual-object-name').value;
        const significance = entry.querySelector('.ritual-object-significance').value;
        
        if (object) {
            practiceData.ritual_objects.objects.push({
                object: object,
                significance: significance || ''
            });
        }
    });
    
    // Process procedure steps
    const stepEntries = document.querySelectorAll('.procedure-step-entry');
    practiceData.procedure_steps = [];
    
    stepEntries.forEach(entry => {
        const stepNumber = entry.querySelector('.step-number').value;
        const description = entry.querySelector('.step-description').value;
        const duration = entry.querySelector('.step-duration').value;
        
        if (stepNumber && description) {
            practiceData.procedure_steps.push({
                step_number: parseInt(stepNumber),
                description: description,
                duration: duration || ''
            });
        }
    });
    
    // Process purposes
    const purposeEntries = document.querySelectorAll('.purpose-entry');
    practiceData.purposes = [];
    
    purposeEntries.forEach(entry => {
        const purpose = entry.querySelector('.purpose-item').value;
        
        if (purpose) {
            practiceData.purposes.push(purpose);
        }
    });
    
    // Process uploaded media
    const mediaPreviews = document.getElementById('practice-media-preview').children;
    if (mediaPreviews.length > 0) {
        practiceData.image_urls = [];
        practiceData.audio_urls = [];
        practiceData.video_urls = [];
        
        for (let i = 0; i < mediaPreviews.length; i++) {
            const preview = mediaPreviews[i];
            const mediaElement = preview.querySelector('img, audio, video');
            
            if (mediaElement) {
                const blob = await getBlobFromSrc(mediaElement.src);
                const url = URL.createObjectURL(blob);
                
                if (mediaElement.tagName === 'IMG') {
                    practiceData.image_urls.push(url);
                } else if (mediaElement.tagName === 'AUDIO') {
                    practiceData.audio_urls.push(url);
                } else if (mediaElement.tagName === 'VIDEO') {
                    practiceData.video_urls.push(url);
                }
            }
        }
    }
    
    try {
        // Submit to API
        const response = await fetch(`${API_BASE_URL}/cultural-practices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify(practiceData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccessModal();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error submitting cultural practice', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Save as draft
function saveAsDraft(type) {
    // This would typically save the form data to local storage or a drafts API
    showNotification(`${type === 'plant' ? 'Plant' : 'Practice'} saved as draft`, 'success');
}

// Show success modal
function showSuccessModal() {
    document.getElementById('success-modal').classList.add('active');
}

// Reset forms
function resetForms() {
    document.getElementById('plant-form').reset();
    document.getElementById('practice-form').reset();
    
    // Clear dynamic entries
    document.getElementById('traditional-uses-container').innerHTML = `
        <div class="cultural-use-entry">
            <select class="cultural-group-select" name="cultural_group">
                <option value="">Select cultural group</option>
                <option value="Zulu">Zulu</option>
                <option value="Xhosa">Xhosa</option>
                <option value="Pedi">Pedi</option>
                <option value="Tswana">Tswana</option>
                <option value="Sotho">Sotho</option>
                <option value="Tsonga">Tsonga</option>
                <option value="Swazi">Swazi</option>
                <option value="Venda">Venda</option>
                <option value="Ndebele">Ndebele</option>
            </select>
            <input type="text" class="use-description" placeholder="Description of use">
            <button type="button" class="btn-remove-use"><i class="fas fa-times"></i></button>
        </div>
    `;
    
    document.getElementById('materials-container').innerHTML = `
        <div class="material-entry">
            <input type="text" class="material-item" placeholder="Item name">
            <textarea class="material-preparation" placeholder="Special preparations (optional)" rows="1"></textarea>
            <button type="button" class="btn-remove-material"><i class="fas fa-times"></i></button>
        </div>
    `;
    
    document.getElementById('ritual-objects-container').innerHTML = `
        <div class="ritual-object-entry">
            <input type="text" class="ritual-object-name" placeholder="Object name">
            <textarea class="ritual-object-significance" placeholder="Significance (optional)" rows="1"></textarea>
            <button type="button" class="btn-remove-ritual-object"><i class="fas fa-times"></i></button>
        </div>
    `;
    
    document.getElementById('procedure-steps-container').innerHTML = `
        <div class="procedure-step-entry">
            <input type="number" class="step-number" placeholder="1" min="1" value="1">
            <textarea class="step-description" placeholder="Description of this step" rows="2"></textarea>
            <input type="text" class="step-duration" placeholder="Duration (optional)">
            <button type="button" class="btn-remove-step"><i class="fas fa-times"></i></button>
        </div>
    `;
    
    document.getElementById('purposes-container').innerHTML = `
        <div class="purpose-entry">
            <input type="text" class="purpose-item" placeholder="Purpose">
            <button type="button" class="btn-remove-purpose"><i class="fas fa-times"></i></button>
        </div>
    `;
    
    // Clear previews
    document.getElementById('plant-preview').innerHTML = '';
    document.getElementById('practice-media-preview').innerHTML = '';
    
    // Reinitialize event listeners
    initDynamicFormElements();
}

// Helper function to get blob from src
function getBlobFromSrc(src) {
    return fetch(src)
        .then(response => response.blob());
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

// Add notification styles
const notificationStyles = document.createElement('style');
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