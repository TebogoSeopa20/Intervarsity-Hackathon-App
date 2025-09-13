// JavaScript for Terms and Conditions Modal
document.addEventListener('DOMContentLoaded', function() {
    // Get the modal
    const modal = document.getElementById('termsModal');
    
    // Get buttons that open the modal
    const showTermsBtn = document.getElementById('showTerms');
    const showPrivacyBtn = document.getElementById('showPrivacy');
    const showTermsFooter = document.getElementById('showTermsFooter');
    
    // Get elements that close the modal
    const closeModalBtn = document.querySelector('.close-modal');
    const closeTermsBtn = document.getElementById('closeTerms');
    const acceptTermsBtn = document.getElementById('acceptTerms');
    
    // Get the terms agreement checkbox
    const termsAgreeCheckbox = document.getElementById('termsAgree');
    
    // Function to open the modal
    function openModal() {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
    
    // Function to close the modal
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Re-enable scrolling
    }
    
    // Event listeners for opening the modal
    if (showTermsBtn) {
        showTermsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal();
        });
    }
    
    if (showPrivacyBtn) {
        showPrivacyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal();
        });
    }
    
    if (showTermsFooter) {
        showTermsFooter.addEventListener('click', function(e) {
            e.preventDefault();
            openModal();
        });
    }
    
    // Event listeners for closing the modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (closeTermsBtn) {
        closeTermsBtn.addEventListener('click', closeModal);
    }
    
    if (acceptTermsBtn) {
        acceptTermsBtn.addEventListener('click', function() {
            if (termsAgreeCheckbox) {
                termsAgreeCheckbox.checked = true;
            }
            closeModal();
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
});
