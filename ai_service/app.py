from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pdf_intelligence import parse_medical_report, parse_menu_pdf
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


@app.post("/extract-allergies")
async def extract_allergies(file: UploadFile = File(...)) -> Dict[str, Any]:
    file_name = file.filename or "report.pdf"
    if not file_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for auto extraction.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    return parse_medical_report(pdf_bytes=pdf_bytes, filename=file_name)


@app.post("/extract-menu")
async def extract_menu(file: UploadFile = File(...)) -> Dict[str, Any]:
    file_name = file.filename or "menu.pdf"
    if not file_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for menu extraction.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    return parse_menu_pdf(pdf_bytes=pdf_bytes, filename=file_name)
