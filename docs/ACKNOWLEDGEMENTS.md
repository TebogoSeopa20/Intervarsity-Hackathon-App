> *This document serves as a template for you to list all third-party repos, modules, libraries, frameworks and or datasets used and credit their authors.*

> Please fill this out to give proper credit and help judges understand external dependencies.

> List **only the external resources you used directly**. Do **not** include system libraries or standard runtimes (e.g., Python VCRuntime, Java SDK). 

# Acknowledgements

## 🌐 APIs & Services Dcumentation
### Our APP is powered by two powerful APIs, Open Food Facts API and Nutrition Guide.
I'm using AI Workout Planner Nutrition API (/analyzeFoodPlate), which has a built-in AI vision model to scan and analyze food from images.
Since my App is powered by two powerful APIs, AI Workout Planner Nutrition API. and Open Food Facts API. The Open Food Facts API is complementary, it’s a database API for barcodes and nutrition info, not an AI scanner.

```markdown
# Tutorial on using the Open Food Facts API

Welcome to this tutorial on basic usage of the Open Food Facts API.

First, be sure to see our **Introduction to the API**.

---

## 📸 Scan A Product To Get Nutri-score

This basic tutorial shows you how to get the **Nutri-score** of a product — for instance, to display it in a mobile app after scanning the product barcode.  
We'll use **Nutella Ferrero** as the product example.

To get a product Nutri-score, send a request to the **Get A Product By Barcode** endpoint.

---

## 🔑 Authentication

Usually, no authentication is required to query **Get A Product Nutri-score**.  
However, there is a basic auth to avoid content indexation in the **staging environment** (used throughout this tutorial).  

For more details, visit the [Open Food Facts API Environment](https://world.openfoodfacts.net/).

---

## 📡 Describing the GET Request

Make a **GET** request to the `Get A Product By Barcode` endpoint:

```

[https://world.openfoodfacts.net/api/v2/product/{barcode}](https://world.openfoodfacts.net/api/v2/product/{barcode})

```

For Nutella Ferrero (`3017624010701`), the request path will look like this:

```

[https://world.openfoodfacts.net/api/v2/product/3017624010701](https://world.openfoodfacts.net/api/v2/product/3017624010701)

```

The response returns **all product data** in the database.  
To only get the Nutri-score, limit the response with query parameters.

---

## ⚙️ Query Parameters

To limit the response fields, use the `fields` parameter.  
For Nutella Ferrero, request only `product_name` and `nutriscore_data`:

```

[https://world.openfoodfacts.net/api/v2/product/3017624010701?fields=product\_name,nutriscore\_data](https://world.openfoodfacts.net/api/v2/product/3017624010701?fields=product_name,nutriscore_data)

````

---

## 📥 Nutri-Score Response

```json
{
    "code": "3017624010701",
    "product": {
        "nutrition_grades": "e",
        "product_name": "Nutella"
    },
    "status": 1,
    "status_verbose": "product found"
}
````

---

## 🧮 Nutri-Score Computation

To show **how the score is computed**, add extra fields (`nutriscore_data` and `nutriments`):

```
https://world.openfoodfacts.net/api/v2/product/3017624010701?fields=product_name,nutriscore_data,nutriments,nutrition_grades
```

Example response:

```json
{
    "code": "3017624010701",
    "product": {
        "nutriments": {
            "carbohydrates": 57.5,
            "energy-kcal": 539,
            "sugars": 56.3
        },
        "nutriscore_data": {
            "energy": 2255,
            "energy_points": 6,
            "sugars_points": 10,
            "sugars_value": 56.3
        },
        "nutrition_grades": "e",
        "product_name": "Nutella"
    },
    "status": 1,
    "status_verbose": "product found"
}
```

---

## 🚫 Products Without a Nutri-Score

When Nutri-Score data is missing, it means required fields are incomplete.
Example: **100% Real Orange Juice** (`0180411000803`).

Check `misc_tags` to know missing fields:

```
https://world.openfoodfacts.net/api/v2/product/0180411000803/100-real-orange-juice?fields=misc_tags
```

Response:

```json
{
    "code": "0180411000803",
    "product": {
        "misc_tags": [
            "en:nutriscore-not-computed",
            "en:nutriscore-missing-category",
            "en:nutriscore-missing-nutrition-data-sodium"
        ]
    },
    "status": 1,
    "status_verbose": "product found"
}
```

---

## ✍️ Writing Data to Compute Nutri-Score

To add missing fields, use the **Add or Edit A Product** endpoint:

```
https://world.openfoodfacts.net/cgi/product_jqm2.pl
```

Authentication is required: provide `user_id` and `password`.

Example `curl` request:

```bash
curl -XPOST https://world.openfoodfacts.net/cgi/product_jqm2.pl \
  -F user_id=your_user_id -F password=your_password \
  -F code=0180411000803 \
  -F nutriment_sodium=0.015 \
  -F nutriment_sodium_unit=g \
  -F categories="Orange Juice"
```

Successful response:

```json
{
    "status_verbose": "fields saved",
    "status": 1
}
```

---

## ✅ Read Newly Computed Nutri-Score

After updating, check again:

```
https://world.openfoodfacts.net/api/v2/product/0180411000803?fields=product_name,nutriscore_data,nutriments,nutrition_grades
```

Response:

```json
{
    "code": "0180411000803",
    "product": {
        "nutriments": {
            "carbohydrates": 11.86,
            "sugars_value": 11.86
        },
        "nutriscore_data": {
            "energy": 195,
            "energy_points": 7,
            "sugars_value": 11.86
        },
        "nutrition_grades": "c",
        "product_name": "100% Real Orange Juice"
    },
    "status": 1,
    "status_verbose": "product found"
}
```

---

## 🔎 Search for a Product by Nutri-score

You can also **search/filter products** by category and Nutri-score.

Search Orange Juice with `nutrition_grades=c`:

```
https://world.openfoodfacts.net/api/v2/search?categories_tags_en=Orange Juice&nutrition_grades_tags=c&fields=code,nutrition_grades,categories_tags_en
```

Sample response:

```json
{
    "count": 1629,
    "products": [
        {
            "code": "3123340008288",
            "nutrition_grades": "c",
            "categories_tags_en": ["Orange juices"]
        },
        {
            "code": "3608580844136",
            "nutrition_grades": "c",
            "categories_tags_en": ["Orange juices"]
        }
    ]
}
```

---

## 📑 Sorting Search Results

You can sort results by last modification date:

```
https://world.openfoodfacts.net/api/v2/search?nutrition_grades_tags=c&fields=code,nutrition_grades,categories_tags_en&categories_tags_en=Orange Juice&sort_by=last_modified_t
```

---

Perfect 👍 thanks for sharing that full API spec.
From this documentation, the **nutrition-related parts** are the ones that deal with analyzing food and generating nutrition insights. I’ll strip out the workout-only sections and keep only the **Nutrition API**.

Here’s the **Nutrition API Documentation** in Markdown:

````markdown
# 🥗 AI Workout Planner | Nutrition API Documentation

This section of the API focuses only on **nutrition analysis and guidance**.

---

## 🔑 Base Configuration

- **Base URL**: `https://ai-workout-planner-exercise-fitness-nutrition-guide.p.rapidapi.com`
- **API Key**: `566b36e871mshf136eda735af7d0p15faa2jsneeec1b98f446`
- **Host**: `ai-workout-planner-exercise-fitness-nutrition-guide.p.rapidapi.com`
- **Provider**: RapidAPI

### Authentication
All requests require the following headers:
```json
{
  "x-rapidapi-key": "566b36e871mshf136eda735af7d0p15faa2jsneeec1b98f446",
  "x-rapidapi-host": "ai-workout-planner-exercise-fitness-nutrition-guide.p.rapidapi.com"
}
````

---

## 📸 1. Food Plate Analysis

Analyzes food images and provides detailed **nutritional breakdown**.

### Endpoint

```
POST /analyzeFoodPlate
```

### Parameters

* `imageUrl` (string, required): URL of the food image
* `lang` (string, optional): Language code (default: `en`)
* `noqueue` (number, optional): Skip queue processing (default: `1`)

### Example Request

```javascript
const url = 'https://ai-workout-planner-exercise-fitness-nutrition-guide.p.rapidapi.com/analyzeFoodPlate?imageUrl=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fb%2Fbd%2FBreakfast_foods.jpg&lang=en&noqueue=1';

const options = {
  method: 'POST',
  headers: {
    'x-rapidapi-key': '566b36e871mshf136eda735af7d0p15faa2jsneeec1b98f446',
    'x-rapidapi-host': 'ai-workout-planner-exercise-fitness-nutrition-guide.p.rapidapi.com',
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({})
};

const response = await fetch(url, options);
const result = await response.json();
console.log(result);
```

### Example Response

```json
{
  "status": "success",
  "result": {
    "foods_identified": [
      {
        "name": "Grilled Chicken Breast",
        "portion_size": "100 grams",
        "calories": "165",
        "protein": "31 grams",
        "carbs": "0 grams",
        "fats": "3.6 grams"
      },
      {
        "name": "White Rice",
        "portion_size": "1 cup (158 grams)",
        "calories": "205",
        "protein": "4.3 grams",
        "carbs": "44.5 grams",
        "fats": "0.4 grams"
      }
    ],
    "total_nutrition": {
      "total_calories": "416",
      "total_protein": "37.5 grams",
      "total_carbs": "55.1 grams",
      "total_fats": "4.4 grams",
      "fiber": "4 grams",
      "vitamins_minerals": ["Vitamin C", "Vitamin K", "Potassium"]
    },
    "meal_analysis": {
      "meal_type": "lunch",
      "balance_score": "8",
      "protein_ratio": "36%",
      "carb_ratio": "53%",
      "fat_ratio": "11%"
    },
    "health_insights": {
      "meal_balance": "This meal has a good balance of protein, carbohydrates, and fats.",
      "positive_aspects": ["High protein content", "Includes vegetables"],
      "improvement_areas": ["Increase fiber intake"],
      "suggestions": ["Add nuts or avocado for healthy fats"]
    },
    "dietary_flags": {
      "is_vegetarian": false,
      "is_vegan": false,
      "is_gluten_free": true,
      "is_dairy_free": true
    }
  }
}
```

---

## 🥦 2. Nutrition Guidance

Provides **nutrition recommendations** based on food items.

### Endpoint

```
POST /nutritionGuidance
```

### Request Body

```json
{
  "foods": ["chicken", "rice", "vegetables"]
}
```

### Example Request

```javascript
const options = {
  method: 'POST',
  headers: {
    'x-rapidapi-key': 'myKey',
    'x-rapidapi-host': 'ai-workout-planner-exercise-fitness-nutrition-guide.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    foods: ["chicken", "rice", "vegetables"]
  })
};

const response = await fetch("https://ai-workout-planner-exercise-fitness-nutrition-guide.p.rapidapi.com/nutritionGuidance", options);
const result = await response.json();
console.log(result);
```

---

## 📑 Response Data Structure

### Food Analysis Response Fields

* **foods\_identified**: Array of recognized foods with nutrition breakdown
* **total\_nutrition**: Aggregated calories, protein, carbs, fats, fiber, vitamins
* **meal\_analysis**: Meal type + macronutrient ratios
* **health\_insights**: Suggestions, positives, improvement areas
* **dietary\_flags**: Dietary compatibility (vegetarian, vegan, gluten-free, etc.)

---

## ⚠️ Error Handling

```javascript
try {
  const result = await fitnessApiService.analyzeFoodPlate(imageUrl);
  // handle success
} catch (error) {
  console.error("API Error:", error);
}
```

---

