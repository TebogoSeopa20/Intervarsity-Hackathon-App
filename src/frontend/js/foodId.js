// foodId.js
// Food Identification System using Open Food Facts API and Food Plate Analysis API

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Update user info
    updateUserInfo();

    // API Configuration
    const RAPIDAPI_KEY = '566b36e871mshf136eda735af7d0p15faa2jsneeec1b98f446';
    const RAPIDAPI_HOST = 'ai-workout-planner-exercise-fitness-nutrition-guide.p.rapidapi.com';

    // DOM Elements
    const barcodeOption = document.getElementById('barcodeOption');
    const searchOption = document.getElementById('searchOption');
    const manualOption = document.getElementById('manualOption');
    const plateAnalysisOption = document.getElementById('plateAnalysisOption');
    const barcodeScanner = document.getElementById('barcodeScanner');
    const manualInput = document.getElementById('manualInput');
    const plateAnalysis = document.getElementById('plateAnalysis');
    const searchResults = document.getElementById('searchResults');
    const startScannerBtn = document.getElementById('startScanner');
    const switchCameraBtn = document.getElementById('switchCamera');
    const captureBarcodeBtn = document.getElementById('captureBarcode');
    const barcodeInput = document.getElementById('barcodeInput');
    const submitBarcodeBtn = document.getElementById('submitBarcode');
    const foodSearchInput = document.getElementById('foodSearchInput');
    const foodSearchBtn = document.getElementById('foodSearchBtn');
    const productInfo = document.getElementById('productInfo');
    const foodAnalysis = document.getElementById('foodAnalysis');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const tryAgainBtn = document.getElementById('tryAgain');
    const newScanBtn = document.getElementById('newScan');
    const saveProductBtn = document.getElementById('saveProduct');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const recentScanned = document.getElementById('recentScanned');
    
    // Plate Analysis Elements
    const triggerUploadBtn = document.getElementById('triggerUpload');
    const imageUpload = document.getElementById('imageUpload');
    const startCameraBtn = document.getElementById('startCamera');
    const switchFoodCameraBtn = document.getElementById('switchFoodCamera');
    const captureFoodImageBtn = document.getElementById('captureFoodImage');
    const cancelCameraBtn = document.getElementById('cancelCamera');
    const cameraView = document.getElementById('cameraView');
    const cameraFeed = document.getElementById('cameraFeed');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const reanalyzeImageBtn = document.getElementById('reanalyzeImage');
    const analyzeImageBtn = document.getElementById('analyzeImage');
    const imageUrlInput = document.getElementById('imageUrlInput');
    const submitImageUrlBtn = document.getElementById('submitImageUrl');
    const saveAnalysisBtn = document.getElementById('saveAnalysis');
    const newAnalysisBtn = document.getElementById('newAnalysis');

    // State variables
    let currentCamera = 'environment';
    let scannerInitialized = false;
    let quaggaInitialized = false;
    let recentProducts = JSON.parse(localStorage.getItem('recentFoods') || '[]');
    let foodCameraStream = null;
    let foodCameraFacingMode = 'environment';
    let currentImageData = null;

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
    plateAnalysisOption.addEventListener('click', () => switchMode('plateAnalysis'));
    
    startScannerBtn.addEventListener('click', initBarcodeScanner);
    switchCameraBtn.addEventListener('click', switchCamera);
    captureBarcodeBtn.addEventListener('click', captureBarcode);
    submitBarcodeBtn.addEventListener('click', submitManualBarcode);
    foodSearchBtn.addEventListener('click', searchFoodProducts);
    foodSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchFoodProducts();
    });
    
    tryAgainBtn.addEventListener('click', resetScanner);
    newScanBtn.addEventListener('click', resetScanner);
    saveProductBtn.addEventListener('click', saveProduct);
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Plate Analysis Event Listeners
    triggerUploadBtn.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', handleImageUpload);
    startCameraBtn.addEventListener('click', startFoodCamera);
    switchFoodCameraBtn.addEventListener('click', switchFoodCamera);
    captureFoodImageBtn.addEventListener('click', captureFoodImage);
    cancelCameraBtn.addEventListener('click', cancelFoodCamera);
    reanalyzeImageBtn.addEventListener('click', resetImageAnalysis);
    analyzeImageBtn.addEventListener('click', analyzeFoodImage);
    submitImageUrlBtn.addEventListener('click', submitImageUrl);
    saveAnalysisBtn.addEventListener('click', saveFoodAnalysis);
    newAnalysisBtn.addEventListener('click', resetFoodAnalysis);

    // Functions
    function initPage() {
        // Load recently scanned products
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
        if (mode === 'plateAnalysis') plateAnalysisOption.classList.add('active');
        
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
        } else if (mode === 'plateAnalysis') {
            plateAnalysis.style.display = 'block';
            resetImageAnalysis();
        }
        
        // Hide product info and error states
        productInfo.style.display = 'none';
        errorState.style.display = 'none';
        foodAnalysis.style.display = 'none';
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

    function searchFoodProducts() {
        const query = foodSearchInput.value.trim();
        
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
                
                displayProductData(data);
                addToRecentProducts(data);
            })
            .catch(error => {
                console.error("API error:", error);
                hideLoading();
                showError("Failed to fetch product data. Please try again.");
            });
    }

    function displayProductData(data) {
        const product = data.product;
        
        // Update product header
        document.getElementById('productName').textContent = product.product_name || 'Unknown Product';
        document.getElementById('productBrand').textContent = product.brands || 'Unknown Brand';
        document.getElementById('productBarcode').textContent = data.code;
        
        // Update product image
        const productImage = document.getElementById('productImage');
        const productPlaceholder = document.getElementById('productPlaceholder');
        
        if (product.image_url) {
            productImage.innerHTML = `<img src="${product.image_url}" alt="${product.product_name}">`;
        } else {
            productImage.innerHTML = '<i class="fas fa-image" id="productPlaceholder"></i>';
        }
        
        // Update nutrition grade
        const nutritionGrade = document.getElementById('nutritionGrade');
        if (product.nutrition_grades) {
            nutritionGrade.textContent = product.nutrition_grades;
            nutritionGrade.className = 'product-grade grade-' + product.nutrition_grades;
        } else {
            nutritionGrade.textContent = '?';
            nutritionGrade.className = 'product-grade grade-unknown';
        }
        
        // Update nutrition facts
        updateNutritionFacts(product);
        
        // Update ingredients
        document.getElementById('ingredientsText').textContent = 
            product.ingredients_text || 'No ingredients information available.';
        
        // Update allergens
        document.getElementById('allergensText').textContent = 
            product.allergens || 'No allergen information available.';
        
        // Update safety information
        updateSafetyInfo(product);
        
        // Show product info and hide other sections
        productInfo.style.display = 'block';
        barcodeScanner.style.display = 'none';
        manualInput.style.display = 'none';
        searchResults.style.display = 'none';
        plateAnalysis.style.display = 'none';
        
        // Reset to nutrition tab
        switchTab('nutrition');
    }

    function updateNutritionFacts(product) {
        const nutritionGrid = document.getElementById('nutritionGrid');
        let nutritionHTML = '';
        
        // Common nutrients to display
        const nutrients = [
            { key: 'energy-kcal_100g', name: 'Energy', unit: 'kcal' },
            { key: 'fat_100g', name: 'Fat', unit: 'g' },
            { key: 'saturated-fat_100g', name: 'Saturated Fat', unit: 'g' },
            { key: 'carbohydrates_100g', name: 'Carbohydrates', unit: 'g' },
            { key: 'sugars_100g', name: 'Sugars', unit: 'g' },
            { key: 'fiber_100g', name: 'Fiber', unit: 'g' },
            { key: 'proteins_100g', name: 'Protein', unit: 'g' },
            { key: 'salt_100g', name: 'Salt', unit: 'g' },
            { key: 'sodium_100g', name: 'Sodium', unit: 'mg' }
        ];
        
        nutrients.forEach(nutrient => {
            if (product.nutriments && product.nutriments[nutrient.key] !== undefined) {
                const value = product.nutriments[nutrient.key];
                nutritionHTML += `
                    <div class="nutrient-item">
                        <div class="nutrient-name">${nutrient.name}</div>
                        <div class="nutrient-value">${value}</div>
                        <div class="nutrient-unit">${nutrient.unit}</div>
                    </div>
                `;
            }
        });
        
        nutritionGrid.innerHTML = nutritionHTML || '<p>No nutrition information available.</p>';
        
        // Update Nutri-Score explanation
        const nutriScoreValue = document.getElementById('nutriScoreValue');
        const scoreExplanation = document.getElementById('scoreExplanation');
        
        if (product.nutrition_grades) {
            nutriScoreValue.textContent = product.nutrition_grades.toUpperCase();
            
            let explanation = '';
            switch(product.nutrition_grades) {
                case 'a':
                    explanation = 'Excellent nutritional quality';
                    break;
                case 'b':
                    explanation = 'Good nutritional quality';
                    break;
                case 'c':
                    explanation = 'Average nutritional quality';
                    break;
                case 'd':
                    explanation = 'Poor nutritional quality';
                    break;
                case 'e':
                    explanation = 'Very poor nutritional quality';
                    break;
                default:
                    explanation = 'Nutritional quality not available';
            }
            
            scoreExplanation.textContent = explanation;
        } else {
            nutriScoreValue.textContent = 'N/A';
            scoreExplanation.textContent = 'Nutritional quality not available for this product';
        }
    }

    function updateSafetyInfo(product) {
        const safetyStatus = document.getElementById('safetyStatus');
        
        // Simple safety assessment based on nutrition grade and allergens
        if (product.nutrition_grades && ['d', 'e'].includes(product.nutrition_grades)) {
            safetyStatus.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>This product has poor nutritional quality. Consume in moderation.</p>
            `;
            safetyStatus.className = 'safety-status warning';
        } else if (product.allergens && product.allergens.length > 0) {
            safetyStatus.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <p>This product contains allergens: ${product.allergens}. Check if you have any allergies.</p>
            `;
            safetyStatus.className = 'safety-status warning';
        } else {
            safetyStatus.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <p>No specific safety concerns identified based on available data.</p>
            `;
            safetyStatus.className = 'safety-status safe';
        }
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
        const productInfo = {
            code: data.code,
            name: product.product_name,
            brand: product.brands,
            image: product.image_url,
            grade: product.nutrition_grades
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
        localStorage.setItem('recentFoods', JSON.stringify(recentProducts));
        
        // Update UI
        displayRecentProducts();
    }

    function displayRecentProducts() {
        if (recentProducts.length === 0) {
            recentScanned.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recently scanned foods</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        recentProducts.forEach(product => {
            html += `
                <div class="scanned-item" data-barcode="${product.code}">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.name}">` : 
                        `<div class="no-image"><i class="fas fa-image"></i></div>`
                    }
                    <div class="scanned-info">
                        <h4>${product.name || 'Unknown Product'}</h4>
                        <p>${product.brand || 'Unknown Brand'}</p>
                    </div>
                </div>
            `;
        });
        
        recentScanned.innerHTML = html;
        
        // Add click event to recent items
        document.querySelectorAll('.scanned-item').forEach(item => {
            item.addEventListener('click', function() {
                const barcode = this.dataset.barcode;
                showLoading();
                fetchProductData(barcode);
            });
        });
    }

    function saveProduct() {
        // Get current product data
        const productName = document.getElementById('productName').textContent;
        const productCode = document.getElementById('productBarcode').textContent;
        
        // Get saved products from localStorage or initialize empty array
        let savedProducts = JSON.parse(localStorage.getItem('savedFoods') || '[]');
        
        // Check if already saved
        if (savedProducts.some(p => p.code === productCode)) {
            alert('This product is already saved!');
            return;
        }
        
        // Add to saved products
        savedProducts.push({
            code: productCode,
            name: productName,
            date: new Date().toISOString()
        });
        
        // Save back to localStorage
        localStorage.setItem('savedFoods', JSON.stringify(savedProducts));
        
        // Visual feedback
        saveProductBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
        saveProductBtn.disabled = true;
        
        setTimeout(() => {
            saveProductBtn.innerHTML = '<i class="fas fa-bookmark"></i> Save Product';
            saveProductBtn.disabled = false;
        }, 2000);
    }

    // Food Plate Analysis Functions
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            currentImageData = e.target.result;
            imagePreview.style.display = 'block';
            document.querySelector('.upload-methods').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async function startFoodCamera() {
        try {
            foodCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: foodCameraFacingMode }
            });
            
            cameraFeed.srcObject = foodCameraStream;
            cameraView.style.display = 'block';
            document.querySelector('.upload-methods').style.display = 'none';
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Failed to access camera. Please check permissions and try again.');
        }
    }

    function switchFoodCamera() {
        if (!foodCameraStream) return;
        
        // Stop current stream
        foodCameraStream.getTracks().forEach(track => track.stop());
        
        // Switch camera
        foodCameraFacingMode = foodCameraFacingMode === 'environment' ? 'user' : 'environment';
        
        // Restart with new camera
        startFoodCamera();
    }

    function captureFoodImage() {
        if (!foodCameraStream) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = cameraFeed.videoWidth;
        canvas.height = cameraFeed.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
        
        currentImageData = canvas.toDataURL('image/jpeg');
        previewImage.src = currentImageData;
        
        // Stop camera and show preview
        foodCameraStream.getTracks().forEach(track => track.stop());
        cameraView.style.display = 'none';
        imagePreview.style.display = 'block';
    }

    function cancelFoodCamera() {
        if (foodCameraStream) {
            foodCameraStream.getTracks().forEach(track => track.stop());
            foodCameraStream = null;
        }
        
        cameraView.style.display = 'none';
        document.querySelector('.upload-methods').style.display = 'grid';
    }

    function resetImageAnalysis() {
        if (foodCameraStream) {
            foodCameraStream.getTracks().forEach(track => track.stop());
            foodCameraStream = null;
        }
        
        cameraView.style.display = 'none';
        imagePreview.style.display = 'none';
        document.querySelector('.upload-methods').style.display = 'grid';
        currentImageData = null;
        imageUpload.value = '';
        imageUrlInput.value = '';
    }

    function submitImageUrl() {
        const imageUrl = imageUrlInput.value.trim();
        
        if (!imageUrl) {
            alert('Please enter an image URL');
            return;
        }
        
        // Validate URL format
        try {
            new URL(imageUrl);
        } catch (e) {
            alert('Please enter a valid URL');
            return;
        }
        
        currentImageData = imageUrl;
        analyzeFoodImage();
    }

    async function analyzeFoodImage() {
        if (!currentImageData) {
            alert('Please select or capture an image first');
            return;
        }
        
        showLoading();
        
        try {
            let imageUrl = currentImageData;
            
            // If it's a data URL, we need to upload it to a service or convert it
            if (currentImageData.startsWith('data:')) {
                // For simplicity, we'll use the data URL directly
                // Note: Some APIs might not support data URLs
                imageUrl = currentImageData;
            }
            
            // Call the food plate analysis API
            const response = await analyzeFoodPlate(imageUrl);
            displayFoodAnalysis(response);
            
        } catch (error) {
            console.error('Error analyzing food image:', error);
            hideLoading();
            showError('Failed to analyze food image. Please try again.');
        }
    }

    async function analyzeFoodPlate(imageUrl) {
        const url = `https://${RAPIDAPI_HOST}/analyzeFoodPlate?imageUrl=${encodeURIComponent(imageUrl)}&lang=en&noqueue=1`;
        
        const options = {
            method: 'POST',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({})
        };

        try {
            const response = await fetch(url, options);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error analyzing food plate:', error);
            throw error;
        }
    }

    function displayFoodAnalysis(data) {
        hideLoading();
        
        if (data.status !== 'success') {
            showError('Failed to analyze food image: ' + (data.message || 'Unknown error'));
            return;
        }
        
        const result = data.result;
        
        // Update analyzed image
        document.getElementById('analyzedImage').src = currentImageData;
        
        // Update foods identified
        const foodsList = document.getElementById('foodsList');
        if (result.foods_identified && result.foods_identified.length > 0) {
            let foodsHTML = '';
            result.foods_identified.forEach(food => {
                foodsHTML += `
                    <div class="food-item">
                        <div class="food-item-icon">
                            <i class="fas fa-utensils"></i>
                        </div>
                        <div class="food-item-info">
                            <div class="food-item-name">${food.name}</div>
                            <div class="food-item-details">
                                ${food.portion_size} | ${food.calories} calories
                            </div>
                        </div>
                    </div>
                `;
            });
            foodsList.innerHTML = foodsHTML;
        } else {
            foodsList.innerHTML = '<p>No foods identified in the image.</p>';
        }
        
        // Update nutrition summary
        const nutritionSummary = document.getElementById('nutritionSummary');
        if (result.total_nutrition) {
            const nutrition = result.total_nutrition;
            let summaryHTML = `
                <div class="nutrient-summary-item">
                    <span class="nutrient-name">Total Calories</span>
                    <span class="nutrient-value">${nutrition.total_calories || 'N/A'}</span>
                </div>
                <div class="nutrient-summary-item">
                    <span class="nutrient-name">Protein</span>
                    <span class="nutrient-value">${nutrition.total_protein || 'N/A'}</span>
                </div>
                <div class="nutrient-summary-item">
                    <span class="nutrient-name">Carbohydrates</span>
                    <span class="nutrient-value">${nutrition.total_carbs || 'N/A'}</span>
                </div>
                <div class="nutrient-summary-item">
                    <span class="nutrient-name">Fats</span>
                    <span class="nutrient-value">${nutrition.total_fats || 'N/A'}</span>
                </div>
            `;
            
            if (nutrition.fiber) {
                summaryHTML += `
                    <div class="nutrient-summary-item">
                        <span class="nutrient-name">Fiber</span>
                        <span class="nutrient-value">${nutrition.fiber}</span>
                    </div>
                `;
            }
            
            nutritionSummary.innerHTML = summaryHTML;
        } else {
            nutritionSummary.innerHTML = '<p>No nutrition information available.</p>';
        }
        
        // Update macronutrient distribution
        if (result.meal_analysis) {
            const analysis = result.meal_analysis;
            
            // Set protein bar
            if (analysis.protein_ratio) {
                const proteinPercent = analysis.protein_ratio.replace('%', '');
                document.getElementById('proteinBar').style.width = proteinPercent + '%';
                document.getElementById('proteinPercent').textContent = analysis.protein_ratio;
            }
            
            // Set carbs bar
            if (analysis.carb_ratio) {
                const carbsPercent = analysis.carb_ratio.replace('%', '');
                document.getElementById('carbsBar').style.width = carbsPercent + '%';
                document.getElementById('carbsPercent').textContent = analysis.carb_ratio;
            }
            
            // Set fats bar
            if (analysis.fat_ratio) {
                const fatsPercent = analysis.fat_ratio.replace('%', '');
                document.getElementById('fatsBar').style.width = fatsPercent + '%';
                document.getElementById('fatsPercent').textContent = analysis.fat_ratio;
            }
        }
        
        // Update health insights
        const healthInsights = document.getElementById('healthInsights');
        if (result.health_insights) {
            const insights = result.health_insights;
            let insightsHTML = '';
            
            if (insights.meal_balance) {
                insightsHTML += `
                    <div class="insight-item">
                        <h4>Meal Balance</h4>
                        <p>${insights.meal_balance}</p>
                    </div>
                `;
            }
            
            if (insights.positive_aspects && insights.positive_aspects.length > 0) {
                insightsHTML += `
                    <div class="insight-item">
                        <h4>Positive Aspects</h4>
                        <ul>
                            ${insights.positive_aspects.map(aspect => `<li>${aspect}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            if (insights.improvement_areas && insights.improvement_areas.length > 0) {
                insightsHTML += `
                    <div class="insight-item">
                        <h4>Areas for Improvement</h4>
                        <ul>
                            ${insights.improvement_areas.map(area => `<li>${area}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            if (insights.suggestions && insights.suggestions.length > 0) {
                insightsHTML += `
                    <div class="insight-item">
                        <h4>Suggestions</h4>
                        <ul>
                            ${insights.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            healthInsights.innerHTML = insightsHTML || '<p>No health insights available.</p>';
        } else {
            healthInsights.innerHTML = '<p>No health insights available.</p>';
        }
        
        // Update dietary flags
        const dietaryFlags = document.getElementById('dietaryFlags');
        if (result.dietary_flags) {
            const flags = result.dietary_flags;
            let flagsHTML = '';
            
            for (const [key, value] of Object.entries(flags)) {
                if (typeof value === 'boolean') {
                    flagsHTML += `
                        <div class="dietary-flag ${value}">
                            ${key.replace(/_/g, ' ')}: ${value ? 'Yes' : 'No'}
                        </div>
                    `;
                } else if (Array.isArray(value) && value.length > 0) {
                    flagsHTML += `
                        <div class="dietary-flag">
                            ${key.replace(/_/g, ' ')}: ${value.join(', ')}
                        </div>
                    `;
                }
            }
            
            dietaryFlags.innerHTML = flagsHTML || '<p>No dietary information available.</p>';
        } else {
            dietaryFlags.innerHTML = '<p>No dietary information available.</p>';
        }
        
        // Show food analysis and hide other sections
        foodAnalysis.style.display = 'block';
        plateAnalysis.style.display = 'none';
        productInfo.style.display = 'none';
        
        // Reset to foods tab
        document.querySelectorAll('.analysis-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === 'foods') {
                btn.classList.add('active');
            }
        });
        
        document.querySelectorAll('#foodAnalysis .tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === 'foodsTab') {
                content.classList.add('active');
            }
        });
    }

    function saveFoodAnalysis() {
        // Get current analysis data
        const analyzedImage = document.getElementById('analyzedImage').src;
        const foodsList = document.getElementById('foodsList').innerHTML;
        
        // Get saved analyses from localStorage or initialize empty array
        let savedAnalyses = JSON.parse(localStorage.getItem('savedFoodAnalyses') || '[]');
        
        // Create analysis object
        const analysis = {
            image: analyzedImage,
            foods: foodsList,
            date: new Date().toISOString()
        };
        
        // Add to saved analyses
        savedAnalyses.push(analysis);
        
        // Save back to localStorage
        localStorage.setItem('savedFoodAnalyses', JSON.stringify(savedAnalyses));
        
        // Visual feedback
        saveAnalysisBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
        saveAnalysisBtn.disabled = true;
        
        setTimeout(() => {
            saveAnalysisBtn.innerHTML = '<i class="fas fa-save"></i> Save Analysis';
            saveAnalysisBtn.disabled = false;
        }, 2000);
    }

    function resetFoodAnalysis() {
        foodAnalysis.style.display = 'none';
        plateAnalysis.style.display = 'block';
        resetImageAnalysis();
    }

    function showLoading() {
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
    }

    function hideLoading() {
        loadingState.style.display = 'none';
    }

    function showError(message) {
        errorState.style.display = 'flex';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetScanner() {
        // Reset scanner state
        if (quaggaInitialized) {
            Quagga.stop();
            quaggaInitialized = false;
        }
        
        document.getElementById('scanner-placeholder').style.display = 'flex';
        document.getElementById('scanner-view').style.display = 'none';
        
        // Hide error state
        errorState.style.display = 'none';
        
        // Show barcode scanner
        barcodeScanner.style.display = 'block';
    }
});