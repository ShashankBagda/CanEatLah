from __future__ import annotations

from typing import Any, Dict, List


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _norm(value: Any) -> str:
    return _clean(value).lower()


def _intersects(left: List[str], right: List[str]) -> bool:
    right_set = {_norm(item) for item in (right or []) if _norm(item)}
    return any(_norm(item) in right_set for item in (left or []))


def _history_summary(order_history: List[Dict[str, Any]]) -> Dict[str, Dict[str, int]]:
    restaurant_count: Dict[str, int] = {}
    item_count: Dict[str, int] = {}

    for order in order_history or []:
        restaurant_id = _clean(order.get("restaurantId"))
        if restaurant_id:
            restaurant_count[restaurant_id] = restaurant_count.get(restaurant_id, 0) + 1

        for item in order.get("items", []) or []:
            key = _norm(item.get("name"))
            if not key:
                continue
            qty = int(item.get("quantity") or 1)
            item_count[key] = item_count.get(key, 0) + max(1, qty)

    return {"restaurant_count": restaurant_count, "item_count": item_count}


def recommend(payload: Dict[str, Any]) -> Dict[str, Any]:
    context: Dict[str, Any] = payload.get("context", {}) or {}
    restaurants: List[Dict[str, Any]] = payload.get("restaurants", []) or []
    order_history: List[Dict[str, Any]] = payload.get("orderHistory", []) or []

    allergies = context.get("allergies", []) or []
    favorite_cuisines = context.get("favoriteCuisines", []) or []
    budget = _norm(context.get("budget"))
    history = _history_summary(order_history)

    scored_results: List[Dict[str, Any]] = []
    for restaurant in restaurants:
        menu = restaurant.get("menu", []) or []
        safe_menu = [item for item in menu if not _intersects(item.get("allergyTags", []), allergies)]
        conflicts = [item for item in menu if _intersects(item.get("allergyTags", []), allergies)]

        score = 0
        reasons: List[str] = []

        cuisine_match = any(_norm(cuisine) == _norm(restaurant.get("cuisine")) for cuisine in favorite_cuisines)
        if cuisine_match:
            score += 30
            reasons.append("Cuisine match")

        if budget and budget == _norm(restaurant.get("priceBand")):
            score += 15
            reasons.append("Budget match")

        if safe_menu:
            score += 20
            reasons.append("Allergy-safe options")
        else:
            score -= 35

        rating = float(restaurant.get("rating") or 4.0)
        score += round(rating * 4)

        restaurant_id = _clean(restaurant.get("id"))
        freq = history["restaurant_count"].get(restaurant_id, 0)
        if freq > 0:
            score += min(24, freq * 6)
            reasons.append("Based on previous orders")

        recommended_items = sorted(
            safe_menu,
            key=lambda item: (
                -(history["item_count"].get(_norm(item.get("name")), 0)),
                float(item.get("price") or 0.0),
            ),
        )[:3]

        scored_results.append(
            {
                "restaurant": restaurant,
                "safeMenu": safe_menu,
                "conflicts": conflicts,
                "recommendedItems": recommended_items,
                "reasons": reasons,
                "score": score,
            }
        )

    scored_results.sort(key=lambda result: result["score"], reverse=True)
    return {
        "model": "caneatlah-local-v1",
        "results": scored_results,
    }
