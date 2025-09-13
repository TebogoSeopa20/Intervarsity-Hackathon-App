// login.js - JavaScript for Digital Sangoma++ Login Page

document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileNavClose = document.getElementById('mobile-nav-close');
    const mobileNav = document.getElementById('mobile-nav');
    
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
    const form = document.getElementById('loginForm');
    const formStatus = document.getElementById('formStatus');
    const passwordToggles = document.querySelectorAll('.toggle-password-visibility');
    
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
    
    // Form submission
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
    
    // Check for URL parameters (success messages, errors)
    checkUrlParameters();
    
    // Handle form submission
    function handleFormSubmission(e) {
        e.preventDefault();
        
        // Validate form
        if (validateForm()) {
            // Prepare form data
            const formData = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                rememberMe: document.getElementById('rememberMe').checked
            };
            
            // Show loading state
            const submitButton = document.querySelector('.login-btn');
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            
            // Submit form data to server
            fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.message && data.user) {
                    showFormStatus(data.message, 'success');
                    
                    // Store user data using auth.js if available
                    if (typeof auth !== 'undefined' && auth.handleLogin) {
                        auth.handleLogin(data.user);
                    }
                    
                    // Redirect after successful login
                    setTimeout(() => {
                        window.location.href = data.redirectUrl || getDashboardUrl(data.user.role);
                    }, 1500);
                } else if (data.errors) {
                    // Show validation errors
                    Object.keys(data.errors).forEach(fieldName => {
                        const field = document.getElementById(fieldName);
                        if (field) {
                            showError(field, data.errors[fieldName]);
                        }
                    });
                    
                    showFormStatus(data.message || 'Please correct the errors above.', 'error');
                } else {
                    showFormStatus(data.message || 'An error occurred during login.', 'error');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                showFormStatus('An error occurred. Please try again later.', 'error');
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.classList.remove('loading');
            });
        }
    }
    
    // Validate form
    function validateForm() {
        let isValid = true;
        const email = document.getElementById('email');
        const password = document.getElementById('password');
        
        // Clear previous errors
        clearError(email);
        clearError(password);
        
        // Validate email
        if (!email.value.trim()) {
            showError(email, 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email.value)) {
            showError(email, 'Please enter a valid email address');
            isValid = false;
        }
        
        // Validate password
        if (!password.value) {
            showError(password, 'Password is required');
            isValid = false;
        }
        
        return isValid;
    }
    
    // Validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Show error message
    function showError(field, message) {
        clearError(field);
        field.classList.add('error');
        
        const errorElement = document.getElementById(field.id + '_error');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }
    
    // Clear error message
    function clearError(field) {
        field.classList.remove('error');
        
        const errorElement = document.getElementById(field.id + '_error');
        if (errorElement) {
            errorElement.textContent = '';
        }
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
                return '/moderator-dashboard.html';
            case 'contributor':
                return '/contributor-dashboard.html';
            case 'seeker':
            default:
                return '/seeker-dashboard.html';
        }
    }
    
    // Check URL parameters for messages
    function checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check for success message
        if (urlParams.has('success')) {
            showFormStatus('Login successful! Redirecting...', 'success');
        }
        
        // Check for error message
        if (urlParams.has('error')) {
            const error = urlParams.get('error');
            let errorMessage = 'An error occurred during login.';
            
            switch(error) {
                case 'invalid_credentials':
                    errorMessage = 'Invalid email or password.';
                    break;
                case 'user_not_found':
                    errorMessage = 'No account found with this email.';
                    break;
                case 'email_not_verified':
                    errorMessage = 'Please verify your email before logging in.';
                    break;
                case 'google_auth_error':
                    errorMessage = 'Google authentication failed. Please try again.';
                    break;
            }
            
            showFormStatus(errorMessage, 'error');
        }
        
        // Check for verified email
        if (urlParams.has('verified') && urlParams.get('verified') === 'true') {
            showFormStatus('Email verified successfully! You can now log in.', 'success');
        }
    }
});