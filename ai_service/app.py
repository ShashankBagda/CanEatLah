from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from recommender import recommend


class Context(BaseModel):
    allergies: List[str] = Field(default_factory=list)
    favoriteCuisines: List[str] = Field(default_factory=list)
    budget: Optional[str] = None


class MenuItem(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    ingredients: Optional[str] = None
    allergyTags: List[str] = Field(default_factory=list)
    dishTags: List[str] = Field(default_factory=list)
    availability: Optional[str] = None
    verificationStatus: Optional[str] = None


class Restaurant(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    cuisine: Optional[str] = None
    location: Optional[str] = None
    rating: Optional[float] = None
    priceBand: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    menu: List[MenuItem] = Field(default_factory=list)


class OrderItem(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = 1


class OrderHistoryItem(BaseModel):
    restaurantId: Optional[str] = None
    items: List[OrderItem] = Field(default_factory=list)


class RecommendRequest(BaseModel):
    context: Context = Field(default_factory=Context)
    restaurants: List[Restaurant] = Field(default_factory=list)
    orderHistory: List[OrderHistoryItem] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


app = FastAPI(title="CanEatLah Local AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "caneatlah-local-ai"}


@app.post("/recommend")
def recommend_route(request: RecommendRequest) -> Dict[str, Any]:
    payload = request.model_dump()
    return recommend(payload)
