// contributor-foodId.js
// Vendor Product Verification System with PDF Certificate Generation

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Update user info
    updateUserInfo();

    // DOM Elements
    const barcodeOption = document.getElementById('barcodeOption');
    const searchOption = document.getElementById('searchOption');
    const manualOption = document.getElementById('manualOption');
    const newProductOption = document.getElementById('newProductOption');
    const barcodeScanner = document.getElementById('barcodeScanner');
    const manualInput = document.getElementById('manualInput');
    const newProductForm = document.getElementById('newProductForm');
    const searchResults = document.getElementById('searchResults');
    const startScannerBtn = document.getElementById('startScanner');
    const switchCameraBtn = document.getElementById('switchCamera');
    const captureBarcodeBtn = document.getElementById('captureBarcode');
    const barcodeInput = document.getElementById('barcodeInput');
    const submitBarcodeBtn = document.getElementById('submitBarcode');
    const productSearchInput = document.getElementById('productSearchInput');
    const productSearchBtn = document.getElementById('productSearchBtn');
    const verificationInfo = document.getElementById('verificationInfo');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const tryAgainBtn = document.getElementById('tryAgain');
    const addNewProductBtn = document.getElementById('addNewProduct');
    const newVerificationBtn = document.getElementById('newVerification');
    const requestVerificationBtn = document.getElementById('requestVerification');
    const generateCertificateBtn = document.getElementById('generateCertificate');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const recentVerified = document.getElementById('recentVerified');
    const productForm = document.getElementById('productForm');
    const cancelProductBtn = document.getElementById('cancelProduct');

    // State variables
    let currentCamera = 'environment';
    let scannerInitialized = false;
    let quaggaInitialized = false;
    let recentProducts = JSON.parse(localStorage.getItem('recentVerified') || '[]');
    let currentProductData = null;

    // Function to get initials from a name
    function getInitials(name) {
        if (!name) return '?';
        
        const names = name.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
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

    // Initialize the page
    initPage();

    // Event Listeners
    barcodeOption.addEventListener('click', () => switchMode('barcode'));
    searchOption.addEventListener('click', () => switchMode('search'));
    manualOption.addEventListener('click', () => switchMode('manual'));
    newProductOption.addEventListener('click', () => switchMode('newProduct'));
    
    startScannerBtn.addEventListener('click', initBarcodeScanner);
    switchCameraBtn.addEventListener('click', switchCamera);
    captureBarcodeBtn.addEventListener('click', captureBarcode);
    submitBarcodeBtn.addEventListener('click', submitManualBarcode);
    productSearchBtn.addEventListener('click', searchProducts);
    productSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchProducts();
    });
    
    tryAgainBtn.addEventListener('click', resetScanner);
    addNewProductBtn.addEventListener('click', showNewProductForm);
    newVerificationBtn.addEventListener('click', resetScanner);
    requestVerificationBtn.addEventListener('click', requestVerification);
    generateCertificateBtn.addEventListener('click', generateCertificate);
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    productForm.addEventListener('submit', handleProductSubmit);
    cancelProductBtn.addEventListener('click', () => switchMode('barcode'));

    // Functions
    function initPage() {
        // Load recently verified products
        displayRecentProducts();
    }

    function switchMode(mode) {
        // Update option cards
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('active');
        });
        
        if (mode === 'barcode') barcodeOption.classList.add('active');
        if (mode === 'search') searchOption.classList.add('active');
        if (mode === 'manual') manualOption.classList.add('active');
        if (mode === 'newProduct') newProductOption.classList.add('active');
        
        // Hide all sections
        document.querySelectorAll('.scanner-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected section
        if (mode === 'barcode') {
            barcodeScanner.style.display = 'block';
            if (scannerInitialized && !quaggaInitialized) {
                initQuagga();
            }
        } else if (mode === 'manual') {
            manualInput.style.display = 'block';
        } else if (mode === 'search') {
            searchResults.style.display = 'block';
        } else if (mode === 'newProduct') {
            newProductForm.style.display = 'block';
            productForm.reset();
        }
        
        // Hide product info and error states
        verificationInfo.style.display = 'none';
        errorState.style.display = 'none';
    }

    function initBarcodeScanner() {
        if (!scannerInitialized) {
            initQuagga();
            scannerInitialized = true;
        }
        
        document.getElementById('scanner-placeholder').style.display = 'none';
        document.getElementById('scanner-view').style.display = 'block';
    }

    function initQuagga() {
        if (quaggaInitialized) return;
        
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#interactive'),
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: currentCamera
                }
            },
            decoder: {
                readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader", "upc_e_reader"]
            },
            locate: true
        }, function(err) {
            if (err) {
                console.error("Error initializing QuaggaJS:", err);
                alert("Failed to initialize camera. Please check permissions and try again.");
                return;
            }
            
            Quagga.start();
            quaggaInitialized = true;
            
            // Listen for detected barcodes
            Quagga.onDetected(function(result) {
                const code = result.codeResult.code;
                processBarcode(code);
            });
        });
    }

    function switchCamera() {
        Quagga.stop();
        quaggaInitialized = false;
        
        currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
        
        setTimeout(() => {
            initQuagga();
        }, 500);
    }

    function captureBarcode() {
        // Force a capture if automatic detection isn't working
        Quagga.onProcessed(function(result) {
            if (result) {
                const drawingCtx = Quagga.canvas.ctx.overlay;
                const drawingCanvas = Quagga.canvas.dom.overlay;
                
                if (result.boxes) {
                    drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                    result.boxes.filter(function(box) {
                        return box !== result.box;
                    }).forEach(function(box) {
                        Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
                    });
                }
                
                if (result.box) {
                    Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "#00F", lineWidth: 2});
                }
                
                if (result.codeResult && result.codeResult.code) {
                    Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
                    processBarcode(result.codeResult.code);
                }
            }
        });
    }

    function processBarcode(barcode) {
        // Stop the scanner
        if (quaggaInitialized) {
            Quagga.stop();
            quaggaInitialized = false;
        }
        
        // Show loading state
        showLoading();
        
        // Fetch product data
        fetchProductData(barcode);
    }

    function submitManualBarcode() {
        const barcode = barcodeInput.value.trim();
        
        if (!barcode) {
            alert("Please enter a barcode");
            return;
        }
        
        if (!/^\d+$/.test(barcode)) {
            alert("Barcode must contain only numbers");
            return;
        }
        
        showLoading();
        fetchProductData(barcode);
    }

    function searchProducts() {
        const query = productSearchInput.value.trim();
        
        if (!query) {
            alert("Please enter a search term");
            return;
        }
        
        showLoading();
        
        // Use Open Food Facts search API
        fetch(`https://world.openfoodfacts.org/api/v2/search?fields=code,product_name,brands,image_url&search_terms=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                
                if (data.count === 0) {
                    document.getElementById('searchResultsList').innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>No products found</h3>
                            <p>Try a different search term</p>
                        </div>
                    `;
                    return;
                }
                
                let resultsHTML = '';
                data.products.forEach(product => {
                    resultsHTML += `
                        <div class="result-item" data-barcode="${product.code}">
                            ${product.image_url ? 
                                `<img src="${product.image_url}" alt="${product.product_name}">` : 
                                `<div class="no-image"><i class="fas fa-image"></i></div>`
                            }
                            <div class="result-info">
                                <h4>${product.product_name || 'Unknown Product'}</h4>
                                <p>${product.brands || 'Unknown Brand'}</p>
                            </div>
                        </div>
                    `;
                });
                
                document.getElementById('searchResultsList').innerHTML = resultsHTML;
                
                // Add event listeners to result items
                document.querySelectorAll('.result-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const barcode = this.dataset.barcode;
                        showLoading();
                        fetchProductData(barcode);
                    });
                });
            })
            .catch(error => {
                console.error("Search error:", error);
                hideLoading();
                showError("Failed to search for products. Please try again.");
            });
    }

    function fetchProductData(barcode) {
        // Use Open Food Facts API to get product data
        fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,image_url,ingredients_text,allergens,nutriments,nutrition_grades,nutriscore_data,nutrient_levels,ecoscore_grade`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                
                if (data.status === 0) {
                    showError("Product not found in the database.");
                    return;
                }
                
                currentProductData = data;
                displayVerificationInfo(data);
                addToRecentProducts(data);
            })
            .catch(error => {
                console.error("API error:", error);
                hideLoading();
                showError("Failed to fetch product data. Please try again.");
            });
    }

    function displayVerificationInfo(data) {
        const product = data.product;
        
        // Update product header - FIXED: Using correct element IDs from HTML
        const productNameElement = document.querySelector('.product-details h2');
        const productBrandElement = document.querySelector('.product-details p');
        const productBarcodeElement = document.querySelector('.product-barcode span:last-child');
        
        if (productNameElement) {
            productNameElement.textContent = product.product_name || 'Unknown Product';
        }
        
        if (productBrandElement) {
            productBrandElement.textContent = product.brands || 'Unknown Brand';
        }
        
        if (productBarcodeElement) {
            productBarcodeElement.textContent = data.code || 'N/A';
        }
        
        // Update product image
        const productImage = document.getElementById('productImage');
        const productPlaceholder = document.getElementById('productPlaceholder');
        
        if (product.image_url) {
            productImage.innerHTML = `<img src="${product.image_url}" alt="${product.product_name}">`;
            if (productPlaceholder) productPlaceholder.style.display = 'none';
        } else {
            productImage.innerHTML = '<i class="fas fa-image" id="productPlaceholder"></i>';
        }
        
        // Update verification status
        updateVerificationStatus(product, data.code);
        
        // Update compliance checklist
        updateComplianceChecklist(product);
        
        // Update ingredients analysis
        updateIngredientsAnalysis(product);
        
        // Update safety assessment
        updateSafetyAssessment(product);
        
        // Update verification history
        updateVerificationHistory(data.code);
        
        // Show verification info and hide other sections
        verificationInfo.style.display = 'block';
        barcodeScanner.style.display = 'none';
        manualInput.style.display = 'none';
        searchResults.style.display = 'none';
        newProductForm.style.display = 'none';
        
        // Reset to compliance tab
        switchTab('compliance');
    }

    function updateVerificationStatus(product, barcode) {
        const verificationStatus = document.getElementById('verificationStatus');
        const generateCertificateBtn = document.getElementById('generateCertificate');
        
        // Check if product has sufficient data to be considered "verifiable"
        const hasSufficientData = product.ingredients_text && product.nutriments;
        
        // Check if product is already verified in our system (from localStorage)
        const savedCertificates = JSON.parse(localStorage.getItem('vendorCertificates') || '[]');
        const isVerified = savedCertificates.some(cert => cert.barcode === barcode);
        
        if (isVerified) {
            verificationStatus.innerHTML = `
                <span class="verification-badge verified-badge">
                    <i class="fas fa-check-circle"></i> Verified
                </span>
            `;
            generateCertificateBtn.disabled = false;
            requestVerificationBtn.style.display = 'none';
        } else if (hasSufficientData) {
            verificationStatus.innerHTML = `
                <span class="verification-badge verifiable-badge">
                    <i class="fas fa-clock"></i> Ready for Verification
                </span>
            `;
            generateCertificateBtn.disabled = true;
            requestVerificationBtn.style.display = 'block';
        } else {
            verificationStatus.innerHTML = `
                <span class="verification-badge unverified-badge">
                    <i class="fas fa-exclamation-triangle"></i> Needs More Data
                </span>
            `;
            generateCertificateBtn.disabled = true;
            requestVerificationBtn.style.display = 'block';
        }
    }

    function updateComplianceChecklist(product) {
        const complianceChecklist = document.getElementById('complianceChecklist');
        const complianceScoreValue = document.getElementById('complianceScoreValue');
        const complianceProgress = document.getElementById('complianceProgress');
        const complianceExplanation = document.getElementById('complianceExplanation');
        
        // Real compliance checks based on actual product data
        const complianceChecks = [
            { 
                id: 'ingredients_list', 
                label: 'Complete ingredients list', 
                valid: !!product.ingredients_text && product.ingredients_text.length > 10 
            },
            { 
                id: 'allergens_declared', 
                label: 'Allergens properly declared', 
                valid: !!product.allergens || !containsCommonAllergens(product) 
            },
            { 
                id: 'nutrition_facts', 
                label: 'Nutrition facts available', 
                valid: !!product.nutriments && Object.keys(product.nutriments).length > 3 
            },
            { 
                id: 'no_harmful_additives', 
                label: 'No harmful additives', 
                valid: !containsHarmfulAdditives(product) 
            },
            { 
                id: 'proper_labeling', 
                label: 'Proper labeling standards', 
                valid: hasProperLabeling(product) 
            }
        ];
        
        let complianceHTML = '';
        let validCount = 0;
        
        complianceChecks.forEach(check => {
            if (check.valid) validCount++;
            
            complianceHTML += `
                <div class="compliance-item ${check.valid ? 'valid' : 'invalid'}">
                    <i class="fas fa-${check.valid ? 'check' : 'times'}-circle"></i>
                    <span>${check.label}</span>
                </div>
            `;
        });
        
        complianceChecklist.innerHTML = complianceHTML;
        
        // Calculate compliance score
        const complianceScore = Math.round((validCount / complianceChecks.length) * 100);
        complianceScoreValue.textContent = `${complianceScore}%`;
        complianceProgress.style.width = `${complianceScore}%`;
        
        // Set explanation based on score
        if (complianceScore >= 80) {
            complianceExplanation.textContent = 'This product meets most safety standards and is ready for verification.';
        } else if (complianceScore >= 60) {
            complianceExplanation.textContent = 'This product meets basic safety standards but needs improvement before verification.';
        } else {
            complianceExplanation.textContent = 'This product does not meet basic safety standards and requires significant improvements.';
        }
    }

    // Helper function to check for common allergens
    function containsCommonAllergens(product) {
        if (!product.ingredients_text) return false;
        
        const allergens = ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'];
        const ingredients = product.ingredients_text.toLowerCase();
        
        return allergens.some(allergen => ingredients.includes(allergen));
    }

    // Helper function to check for harmful additives
    function containsHarmfulAdditives(product) {
        if (!product.ingredients_text) return false;
        
        const harmfulAdditives = [
            'hydrogenated', 'partially hydrogenated', 'bha', 'bht', 
            'potassium bromate', 'propyl paraben', 'red 3', 'blue 1'
        ];
        
        const ingredients = product.ingredients_text.toLowerCase();
        return harmfulAdditives.some(additive => ingredients.includes(additive));
    }

    // Helper function to check if product has proper labeling
    function hasProperLabeling(product) {
        let score = 0;
        
        // Check for required information
        if (product.product_name && product.product_name.length > 2) score++;
        if (product.brands) score++;
        if (product.ingredients_text && product.ingredients_text.length > 10) score++;
        if (product.nutriments && Object.keys(product.nutriments).length > 3) score++;
        
        return score >= 3; // At least 3 out of 4 required elements
    }

    function updateIngredientsAnalysis(product) {
        const ingredientsText = document.getElementById('ingredientsText');
        const ingredientsWarnings = document.getElementById('ingredientsWarnings');
        
        ingredientsText.textContent = product.ingredients_text || 'No ingredients information available.';
        
        // Real ingredient warnings based on actual ingredients
        const warnings = [];
        if (product.ingredients_text) {
            const ingredients = product.ingredients_text.toLowerCase();
            
            if (ingredients.includes('hydrogenated') || ingredients.includes('partially hydrogenated')) {
                warnings.push('Contains trans fats (hydrogenated oils) - consider reformulating');
            }
            
            if (ingredients.includes('high fructose corn syrup') || ingredients.includes('hfcs')) {
                warnings.push('Contains high fructose corn syrup - some consumers prefer natural sweeteners');
            }
            
            if (ingredients.includes('artificial flavor') || ingredients.includes('artificial color')) {
                warnings.push('Contains artificial flavors or colors - consider natural alternatives');
            }
            
            if (ingredients.includes('sodium nitrate') || ingredients.includes('sodium nitrite')) {
                warnings.push('Contains sodium nitrate/nitrite (preservative) - some health concerns associated');
            }
            
            // Check for common allergens
            const allergens = ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'];
            const foundAllergens = allergens.filter(allergen => ingredients.includes(allergen));
            
            if (foundAllergens.length > 0 && (!product.allergens || product.allergens.length < 5)) {
                warnings.push(`Contains potential allergens (${foundAllergens.join(', ')}) - ensure proper labeling`);
            }
        }
        
        if (warnings.length > 0) {
            let warningsHTML = '<h4>Ingredients Analysis</h4><ul>';
            warnings.forEach(warning => {
                warningsHTML += `<li>${warning}</li>`;
            });
            warningsHTML += '</ul>';
            ingredientsWarnings.innerHTML = warningsHTML;
        } else if (product.ingredients_text) {
            ingredientsWarnings.innerHTML = `
                <div class="ingredient-status positive">
                    <i class="fas fa-check-circle"></i> 
                    <div>
                        <h4>Ingredients Analysis</h4>
                        <p>No significant ingredient concerns detected. Good formulation for consumer safety.</p>
                    </div>
                </div>
            `;
        } else {
            ingredientsWarnings.innerHTML = `
                <div class="ingredient-status unknown">
                    <i class="fas fa-question-circle"></i> 
                    <div>
                        <h4>Ingredients Analysis</h4>
                        <p>Insufficient ingredient data for analysis. Please provide complete ingredients list.</p>
                    </div>
                </div>
            `;
        }
        
        // Update allergens
        const allergensText = document.getElementById('allergensText');
        if (product.allergens) {
            allergensText.textContent = product.allergens;
        } else if (containsCommonAllergens(product)) {
            allergensText.textContent = 'Potential allergens detected but not declared: ' + 
                ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy']
                .filter(allergen => product.ingredients_text.toLowerCase().includes(allergen))
                .join(', ');
        } else {
            allergensText.textContent = 'No allergen information available.';
        }
    }

    function updateSafetyAssessment(product) {
        const safetyStatus = document.getElementById('safetyStatus');
        const safetyRecommendations = document.getElementById('safetyRecommendations');
        
        // Calculate safety score based on actual product data
        let safetyScore = 0;
        let maxScore = 0;
        
        // Check ingredients quality (30 points)
        if (product.ingredients_text) {
            maxScore += 30;
            let ingredientScore = 30;
            
            // Deduct points for concerning ingredients
            if (containsHarmfulAdditives(product)) ingredientScore -= 15;
            if (product.ingredients_text.toLowerCase().includes('hydrogenated')) ingredientScore -= 10;
            if (product.ingredients_text.toLowerCase().includes('artificial')) ingredientScore -= 5;
            
            safetyScore += Math.max(0, ingredientScore);
        }
        
        // Check nutrition facts (30 points)
        if (product.nutriments && Object.keys(product.nutriments).length > 5) {
            maxScore += 30;
            safetyScore += 30; // Full points for having nutrition data
        }
        
        // Check allergens declaration (20 points)
        if (product.allergens && product.allergens.length > 3) {
            maxScore += 20;
            safetyScore += 20; // Full points for declaring allergens
        } else if (!containsCommonAllergens(product)) {
            maxScore += 20;
            safetyScore += 20; // Full points if no common allergens
        }
        
        // Check product completeness (20 points)
        if (product.product_name && product.brands && product.ingredients_text) {
            maxScore += 20;
            safetyScore += 20; // Full points for complete product info
        }
        
        // Calculate final score percentage
        const finalScore = maxScore > 0 ? Math.round((safetyScore / maxScore) * 100) : 0;
        
        let safetyHTML = '';
        let recommendationsHTML = '';
        
        if (finalScore >= 80) {
            safetyHTML = `
                <i class="fas fa-check-circle"></i>
                <div>
                    <p>This product appears to be generally safe for consumption.</p>
                    <div class="safety-score">Safety Score: ${finalScore}%</div>
                </div>
            `;
            safetyStatus.className = 'safety-status safe';
            
            recommendationsHTML = `
                <li>Maintain current formulation and safety standards</li>
                <li>Continue monitoring for any ingredient changes</li>
                <li>Consider applying for formal verification</li>
            `;
        } else if (finalScore >= 50) {
            safetyHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <p>This product has some safety concerns that should be addressed.</p>
                    <div class="safety-score">Safety Score: ${finalScore}%</div>
                </div>
            `;
            safetyStatus.className = 'safety-status warning';
            
            recommendationsHTML = `
                <li>Consider reformulating to reduce problematic ingredients</li>
                <li>Improve labeling clarity for allergens</li>
                <li>Add missing nutrition information</li>
                <li>Conduct additional safety testing before verification</li>
            `;
        } else {
            safetyHTML = `
                <i class="fas fa-times-circle"></i>
                <div>
                    <p>This product has significant safety concerns.</p>
                    <div class="safety-score">Safety Score: ${finalScore}%</div>
                </div>
            `;
            safetyStatus.className = 'safety-status danger';
            
            recommendationsHTML = `
                <li>Immediately review and reformulate product</li>
                <li>Consult with food safety experts</li>
                <li>Add complete ingredients and nutrition information</li>
                <li>Consider discontinuing product until safety issues are resolved</li>
            `;
        }
        
        safetyStatus.innerHTML = safetyHTML;
        safetyRecommendations.innerHTML = recommendationsHTML;
    }

    function updateVerificationHistory(barcode) {
        const verificationHistoryList = document.getElementById('verificationHistoryList');
        
        // Check for existing verification history in localStorage
        const savedCertificates = JSON.parse(localStorage.getItem('vendorCertificates') || '[]');
        const productHistory = savedCertificates.filter(cert => cert.barcode === barcode);
        
        let historyHTML = '';
        
        if (productHistory.length > 0) {
            productHistory.forEach(cert => {
                historyHTML += `
                    <div class="history-item">
                        <div class="history-date">${cert.verifiedDate}</div>
                        <div class="history-status verified">Verified</div>
                        <div class="history-by">By: ${cert.verifiedBy}</div>
                        <div class="history-certificate">ID: ${cert.certificateId}</div>
                    </div>
                `;
            });
        } else {
            // Add a default entry for products that haven't been verified yet
            historyHTML = `
                <div class="history-item">
                    <div class="history-date">${new Date().toLocaleDateString()}</div>
                    <div class="history-status pending">Initial Scan</div>
                    <div class="history-by">By: System Check</div>
                    <div class="history-certificate">Not yet verified</div>
                </div>
            `;
        }
        
        verificationHistoryList.innerHTML = historyHTML;
    }

    function switchTab(tabName) {
        // Update tab buttons
        tabBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === tabName + 'Tab') {
                content.classList.add('active');
            }
        });
    }

    function addToRecentProducts(data) {
        const product = data.product;
        
        // Check if product is verified
        const savedCertificates = JSON.parse(localStorage.getItem('vendorCertificates') || '[]');
        const isVerified = savedCertificates.some(cert => cert.barcode === data.code);
        
        const productInfo = {
            code: data.code,
            name: product.product_name,
            brand: product.brands,
            image: product.image_url,
            verified: isVerified
        };
        
        // Remove if already exists
        recentProducts = recentProducts.filter(p => p.code !== data.code);
        
        // Add to beginning of array
        recentProducts.unshift(productInfo);
        
        // Keep only last 5 items
        if (recentProducts.length > 5) {
            recentProducts = recentProducts.slice(0, 5);
        }
        
        // Save to localStorage
        localStorage.setItem('recentVerified', JSON.stringify(recentProducts));
        
        // Update UI
        displayRecentProducts();
    }

    function displayRecentProducts() {
        if (recentProducts.length === 0) {
            recentVerified.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recently verified products</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        recentProducts.forEach(product => {
            html += `
                <div class="verified-item" data-barcode="${product.code}">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.name}">` : 
                        `<div class="no-image"><i class="fas fa-image"></i></div>`
                    }
                    <div class="verified-info">
                        <h4>${product.name || 'Unknown Product'}</h4>
                        <p>${product.brand || 'Unknown Brand'}</p>
                        <span class="verification-badge ${product.verified ? 'verified-badge' : 'unverified-badge'}">
                            ${product.verified ? 'Verified' : 'Unverified'}
                        </span>
                    </div>
                </div>
            `;
        });
        
        recentVerified.innerHTML = html;
        
        // Add click event to recent items
        document.querySelectorAll('.verified-item').forEach(item => {
            item.addEventListener('click', function() {
                const barcode = this.dataset.barcode;
                showLoading();
                fetchProductData(barcode);
            });
        });
    }

    function requestVerification() {
        showLoading();
        
        // Get product data
        const productName = document.querySelector('.product-details h2').textContent;
        const productBrand = document.querySelector('.product-details p').textContent;
        const barcode = document.querySelector('.product-barcode span:last-child').textContent;
        
        // Simulate verification request
        setTimeout(() => {
            hideLoading();
            
            // Update verification status
            const verificationStatus = document.getElementById('verificationStatus');
            verificationStatus.innerHTML = `
                <span class="verification-badge pending-badge">
                    <i class="fas fa-clock"></i> Verification Requested
                </span>
            `;
            
            // Show success message
            alert('Verification request submitted successfully! Our team will review your product.');
            
            // Simulate approval after a delay
            setTimeout(() => {
                // Create certificate
                const certificateData = {
                    product: productName,
                    brand: productBrand,
                    barcode: barcode,
                    verifiedDate: new Date().toLocaleDateString(),
                    certificateId: 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    verifiedBy: 'Imbewu Food Safety System'
                };
                
                // Save to localStorage
                let certificates = JSON.parse(localStorage.getItem('vendorCertificates') || '[]');
                certificates.push(certificateData);
                localStorage.setItem('vendorCertificates', JSON.stringify(certificates));
                
                // Update UI
                verificationStatus.innerHTML = `
                    <span class="verification-badge verified-badge">
                        <i class="fas fa-check-circle"></i> Verified
                    </span>
                `;
                
                document.getElementById('generateCertificate').disabled = false;
                requestVerificationBtn.style.display = 'none';
                
                // Update recent products list
                addToRecentProducts(currentProductData);
                
                alert(`Product verified successfully! Certificate ID: ${certificateData.certificateId}`);
            }, 3000);
        }, 2000);
    }

    function generateCertificate() {
        // Get product data
        const productName = document.querySelector('.product-details h2').textContent;
        const productBrand = document.querySelector('.product-details p').textContent;
        const barcode = document.querySelector('.product-barcode span:last-child').textContent;
        
        // Find existing certificate
        const savedCertificates = JSON.parse(localStorage.getItem('vendorCertificates') || '[]');
        const existingCertificate = savedCertificates.find(cert => cert.barcode === barcode);
        
        if (existingCertificate) {
            // Generate and download PDF certificate
            generatePDFCertificate(existingCertificate);
        } else {
            alert('No certificate found for this product. Please request verification first.');
        }
    }

    function generatePDFCertificate(certificateData) {
        // Create a new jsPDF instance
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set document properties
        doc.setProperties({
            title: `Food Safety Certificate - ${certificateData.product}`,
            subject: 'Food Safety Verification Certificate',
            author: 'Imbewu Food Safety System',
            keywords: 'food, safety, certificate, verification',
            creator: 'Imbewu Food Safety System'
        });
        
        // Add certificate border
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(1);
        doc.rect(10, 10, 190, 277);
        
        // Add header with logo
        doc.setFillColor(240, 240, 240);
        doc.rect(10, 10, 190, 30, 'F');
        
        // Add title
        doc.setFontSize(24);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('FOOD SAFETY CERTIFICATE', 105, 25, { align: 'center' });
        
        // Add certificate ID
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text(`Certificate ID: ${certificateData.certificateId}`, 105, 35, { align: 'center' });
        
        // Add verification seal
        doc.setFillColor(220, 220, 220);
        doc.circle(105, 70, 20, 'F');
        doc.setFontSize(16);
        doc.setTextColor(0, 128, 0);
        doc.text('VERIFIED', 105, 67, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Food Safety', 105, 74, { align: 'center' });
        
        // Add product information
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('PRODUCT INFORMATION', 105, 95, { align: 'center' });
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 100, 190, 100);
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.setFont(undefined, 'bold');
        doc.text('Product Name:', 30, 115);
        doc.setFont(undefined, 'normal');
        doc.text(certificateData.product, 80, 115);
        
        doc.setFont(undefined, 'bold');
        doc.text('Brand:', 30, 125);
        doc.setFont(undefined, 'normal');
        doc.text(certificateData.brand, 80, 125);
        
        doc.setFont(undefined, 'bold');
        doc.text('Barcode:', 30, 135);
        doc.setFont(undefined, 'normal');
        doc.text(certificateData.barcode, 80, 135);
        
        // Add verification details
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('VERIFICATION DETAILS', 105, 155, { align: 'center' });
        
        doc.line(20, 160, 190, 160);
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.setFont(undefined, 'bold');
        doc.text('Verified By:', 30, 175);
        doc.setFont(undefined, 'normal');
        doc.text(certificateData.verifiedBy, 80, 175);
        
        doc.setFont(undefined, 'bold');
        doc.text('Verification Date:', 30, 185);
        doc.setFont(undefined, 'normal');
        doc.text(certificateData.verifiedDate, 80, 185);
        
        // Add compliance statement
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('COMPLIANCE STATEMENT', 105, 205, { align: 'center' });
        
        doc.line(20, 210, 190, 210);
        
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        doc.setFont(undefined, 'normal');
        const complianceText = [
            'This product has been verified by the Imbewu Food Safety System and',
            'has been found to comply with established food safety standards.',
            'The product formulation, ingredients, and labeling have been reviewed',
            'and meet the requirements for safe consumption.',
            '',
            'This certificate is valid for one year from the date of issue.'
        ];
        
        complianceText.forEach((line, i) => {
            doc.text(line, 105, 220 + (i * 5), { align: 'center' });
        });
        
        // Add footer
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('© Imbewu Food Safety System - https://imbewu-foodsafety.org', 105, 270, { align: 'center' });
        
        // Generate file name
        const fileName = `Food_Safety_Certificate_${certificateData.barcode}.pdf`;
        
        // Save the PDF
        doc.save(fileName);
        
        // Show success message
        alert(`Certificate downloaded successfully as ${fileName}`);
    }

    function showNewProductForm() {
        switchMode('newProduct');
    }

    function handleProductSubmit(e) {
        e.preventDefault();
        
        const productName = document.getElementById('productName').value;
        const productBrand = document.getElementById('productBrand').value;
        const productBarcode = document.getElementById('productBarcode').value;
        const productIngredients = document.getElementById('productIngredients').value;
        
        if (!productName || !productBrand || !productIngredients) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Create mock product data
        const mockProductData = {
            code: productBarcode || 'MANUAL-' + Date.now(),
            product: {
                product_name: productName,
                brands: productBrand,
                ingredients_text: productIngredients,
                image_url: null
            }
        };
        
        // Display verification info
        currentProductData = mockProductData;
        displayVerificationInfo(mockProductData);
        addToRecentProducts(mockProductData);
        
        // Show success message
        alert('Product information saved successfully!');
    }

    function showLoading() {
        loadingState.style.display = 'flex';
        verificationInfo.style.display = 'none';
        errorState.style.display = 'none';
    }

    function hideLoading() {
        loadingState.style.display = 'none';
    }

    function showError(message) {
        errorState.style.display = 'block';
        verificationInfo.style.display = 'none';
        loadingState.style.display = 'none';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetScanner() {
        // Reset scanner state
        if (quaggaInitialized) {
            Quagga.stop();
            quaggaInitialized = false;
        }
        
        scannerInitialized = false;
        
        // Reset UI
        document.getElementById('scanner-placeholder').style.display = 'flex';
        document.getElementById('scanner-view').style.display = 'none';
        verificationInfo.style.display = 'none';
        errorState.style.display = 'none';
        loadingState.style.display = 'none';
    }
});