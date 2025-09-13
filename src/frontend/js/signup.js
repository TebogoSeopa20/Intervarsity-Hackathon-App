// signup.js - JavaScript for Imbewu Signup Page

document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation toggle
    const mobileMenuButton = document.querySelector('.mobile-menu');
    const mobileNavClose = document.querySelector('.mobile-nav-close');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            mobileNav.classList.add('active');
        });
    }
    
    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', function() {
            mobileNav.classList.remove('active');
        });
    }

    // Form elements
    const form = document.getElementById('signupForm');
    const steps = document.querySelectorAll('.form-step');
    const nextButtons = document.querySelectorAll('.next-btn');
    const prevButtons = document.querySelectorAll('.prev-btn');
    const formStatus = document.getElementById('formStatus');
    const passwordToggles = document.querySelectorAll('.toggle-password-visibility');
    
    // Initialize current step
    let currentStep = 0;
    
    // Show the current step
    function showStep(stepIndex) {
        steps.forEach((step, index) => {
            step.classList.remove('active');
            if (index === stepIndex) {
                step.classList.add('active');
            }
        });
        currentStep = stepIndex;
    }
    
    // Next button functionality
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (validateStep(currentStep)) {
                showStep(currentStep + 1);
                window.scrollTo(0, 0);
            }
        });
    });
    
    // Previous button functionality
    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            showStep(currentStep - 1);
            window.scrollTo(0, 0);
        });
    });
    
    // Password visibility toggle
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
    
    // Password validation
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', validatePassword);
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
    
    // Validate current step
    function validateStep(stepIndex) {
        const step = steps[stepIndex];
        const inputs = step.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });
        
        // Special validation for password confirmation
        if (stepIndex === 2) {
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirmPassword');
            
            if (password.value !== confirmPassword.value) {
                showError(confirmPassword, 'Passwords do not match');
                isValid = false;
            } else {
                clearError(confirmPassword);
            }
        }
        
        // Special validation for checkboxes in step 4
        if (stepIndex === 3) {
            const termsAgree = document.getElementById('termsAgree');
            const ethicsAgree = document.getElementById('ethicsAgree');
            const safetyAgree = document.getElementById('safetyAgree');
            
            if (!termsAgree.checked) {
                showError(termsAgree, 'You must agree to the Terms of Service and Privacy Policy');
                isValid = false;
            } else {
                clearError(termsAgree);
            }
            
            if (!ethicsAgree.checked) {
                showError(ethicsAgree, 'You must agree to respect cultural protocols');
                isValid = false;
            } else {
                clearError(ethicsAgree);
            }
            
            if (safetyAgree && !safetyAgree.checked) {
                showError(safetyAgree, 'You must acknowledge this platform provides educational information only');
                isValid = false;
            } else if (safetyAgree) {
                clearError(safetyAgree);
            }
        }
        
        return isValid;
    }
    
    // Validate individual field
    function validateField(field) {
        let isValid = true;
        let errorMessage = '';
        
        // Clear previous error
        clearError(field);
        
        // Check if required field is empty
        if (field.hasAttribute('required') && !field.value.trim()) {
            errorMessage = 'This field is required';
            isValid = false;
        }
        
        // Email validation
        if (field.type === 'email' && field.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                errorMessage = 'Please enter a valid email address';
                isValid = false;
            }
        }
        
        // Phone validation
        if (field.id === 'phone' && field.value) {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (!phoneRegex.test(field.value.replace(/[\s\-\(\)]/g, ''))) {
                errorMessage = 'Please enter a valid phone number';
                isValid = false;
            }
        }
        
        // Password validation
        if (field.id === 'password' && field.value) {
            if (!validatePasswordStrength(field.value)) {
                errorMessage = 'Password does not meet requirements';
                isValid = false;
            }
        }
        
        // Cultural affiliation validation
        if (field.id === 'cultural_affiliation' && field.value) {
            if (field.value === '') {
                errorMessage = 'Please select your cultural background';
                isValid = false;
            }
        }
        
        // Display error if validation failed
        if (!isValid) {
            showError(field, errorMessage);
        }
        
        return isValid;
    }
    
    // Validate password strength
    function validatePasswordStrength(password) {
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        
        // Update requirement indicators
        document.getElementById('length').classList.toggle('valid', hasMinLength);
        document.getElementById('uppercase').classList.toggle('valid', hasUpperCase);
        document.getElementById('lowercase').classList.toggle('valid', hasLowerCase);
        document.getElementById('number').classList.toggle('valid', hasNumber);
        document.getElementById('special').classList.toggle('valid', hasSpecialChar);
        
        return hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
    }
    
    // Real-time password validation
    function validatePassword() {
        const password = this.value;
        validatePasswordStrength(password);
    }
    
    // Show error message
    function showError(field, message) {
        clearError(field);
        field.classList.add('error');
        
        const errorElement = document.getElementById(field.id + '_error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
        }
    }
    
    // Clear error message
    function clearError(field) {
        field.classList.remove('error');
        
        const errorElement = document.getElementById(field.id + '_error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('visible');
        }
    }
    
// Handle form submission
function handleFormSubmission(e) {
    e.preventDefault();
    
    // Validate all steps
    let allValid = true;
    for (let i = 0; i < steps.length; i++) {
        if (!validateStep(i)) {
            allValid = false;
            showStep(i); // Show the first step with errors
            break;
        }
    }
    
    if (!allValid) {
        showFormStatus('Please correct the errors above.', 'error');
        return;
    }
    
    // Prepare form data with correct field names for server
    const formData = {
        role: document.querySelector('input[name="role"]:checked').value,
        full_name: document.getElementById('full_name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        phone: document.getElementById('phone').value || '',
        cultural_affiliation: document.getElementById('cultural_affiliation').value,
        terms_agreed: document.getElementById('termsAgree').checked,
        ethics_agreed: document.getElementById('ethicsAgree').checked,
        safety_agreed: document.getElementById('safetyAgree') ? document.getElementById('safetyAgree').checked : true,
        newsletter_agreed: document.getElementById('newsletterAgree').checked
    };
    
    // Show loading state
    const submitButton = document.querySelector('.submit-btn');
    submitButton.disabled = true;
    submitButton.classList.add('loading');
    
    // Submit form data to server
    fetch('/api/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Server error occurred');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.message && data.user) {
            showFormStatus(data.message, 'success');
            
            // Store user data using auth.js if available
            if (typeof auth !== 'undefined' && auth.handleLogin) {
                auth.handleLogin(data.user);
            }
            
            // Redirect after successful signup
            setTimeout(() => {
                window.location.href = getDashboardUrl(data.user.role);
            }, 2000);
        } else {
            showFormStatus(data.message || 'An unexpected error occurred.', 'error');
        }
    })
    .catch(error => {
        console.error('Signup error:', error);
        
        // Handle specific error cases
        if (error.message.includes('email') || error.message.includes('Email')) {
            showError(document.getElementById('email'), error.message);
            showStep(1); // Go back to personal info step
        } else if (error.message.includes('password')) {
            showError(document.getElementById('password'), error.message);
            showStep(2); // Go back to security step
        } else {
            showFormStatus(error.message || 'An error occurred. Please try again later.', 'error');
        }
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
    });
}
    
    // Show form status message
    function showFormStatus(message, type) {
        if (formStatus) {
            formStatus.textContent = message;
            formStatus.className = 'form-status-message ' + type;
            formStatus.style.display = 'block';
            formStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // Get dashboard URL based on user role
    function getDashboardUrl(role) {
        switch(role) {
            case 'moderator':
                return '/login.html';
            case 'contributor':
                return '/login.html';
            case 'learner':
            default:
                return '/login.html';
        }
    }
    
    // Real-time validation for fields
    const validationFields = document.querySelectorAll('input[required], select[required]');
    validationFields.forEach(field => {
        field.addEventListener('blur', function() {
            validateField(this);
        });
        
        field.addEventListener('input', function() {
            // Clear error when user starts typing
            if (this.classList.contains('error')) {
                clearError(this);
            }
        });
    });
    
    // Checkbox validation
    const checkboxes = document.querySelectorAll('input[type="checkbox"][required]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                clearError(this);
            } else {
                let errorMessage = '';
                switch(this.id) {
                    case 'termsAgree':
                        errorMessage = 'You must agree to the Terms of Service and Privacy Policy';
                        break;
                    case 'ethicsAgree':
                        errorMessage = 'You must agree to respect cultural protocols';
                        break;
                    case 'safetyAgree':
                        errorMessage = 'You must acknowledge this platform provides educational information only';
                        break;
                }
                showError(this, errorMessage);
            }
        });
    });
});