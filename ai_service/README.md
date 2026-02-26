# CanEatLah Local AI Service

This is a fully local, self-hosted recommendation service for CanEatLah.

## What it does
- Suggests **where to eat** (ranked restaurants)
- Suggests **what to eat** (safe menu items)
- Uses only your app data:
  - allergies
  - food preferences
  - budget
  - previous order history
  - group context (if provided by frontend)

No external AI API is required.

## Run locally (Windows PowerShell)

```powershell
cd ai_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

## Endpoints
- `GET /health`
- `POST /recommend`

## Payload shape

```json
{
  "context": {
    "allergies": ["peanut", "fish"],
    "favoriteCuisines": ["Indian", "Vegan"],
    "budget": "medium"
  },
  "restaurants": [
    {
      "id": "res_1",
      "name": "Example",
      "cuisine": "Indian",
      "priceBand": "medium",
      "rating": 4.5,
      "menu": [
        { "name": "Dish A", "price": 10, "allergyTags": ["peanut"] }
      ]
    }
  ],
  "orderHistory": [
    {
      "restaurantId": "res_1",
      "items": [{ "name": "Dish A", "quantity": 2 }]
    }
  ]
}
```

## Frontend integration
Frontend now auto-tries `http://127.0.0.1:8000/recommend`.
If unavailable, it falls back to local JS scoring.

Optional override:

```html
<script>
  window.CANEATLAH_RECOMMENDER_URL = "http://127.0.0.1:8000/recommend";
</script>
```
