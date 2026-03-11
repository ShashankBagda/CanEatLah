from __future__ import annotations

import io
import re
from typing import Any, Dict, List, Tuple

import fitz
from pypdf import PdfReader


ALLERGEN_KEYWORDS: Dict[str, List[str]] = {
    "peanut": ["peanut", "peanuts", "groundnut"],
    "tree nut": ["tree nut", "almond", "hazelnut", "walnut", "cashew", "pistachio", "pecan", "macadamia"],
    "dairy": ["dairy", "milk", "lactose", "cheese", "milk and milk products"],
    "egg": ["egg", "eggs and egg products", "egg products"],
    "fish": ["fish", "fish and fish products"],
    "shellfish": ["shellfish", "shrimp", "prawn", "crab", "lobster", "crustacean"],
    "soy": ["soy", "soybean", "soybeans"],
    "gluten": ["gluten", "cereals containing gluten", "wheat"],
    "sesame": ["sesame"],
    "mustard": ["mustard"],
    "celery": ["celery"],
    "sulfites": ["sulfite", "sulphite", "sulfur dioxide", "sulphur dioxide"],
    "lupin": ["lupin"],
    "mollusks": ["mollusk", "mollusc"],
    "coconut": ["coconut"],
    "corn": ["corn", "maize"],
    "lentil": ["lentil"],
    "chickpea": ["chickpea"],
}

LAB_FALLBACK_ALLERGIES = ["peanut", "tree nut", "dairy", "egg", "fish", "shellfish", "soy", "gluten", "sesame"]

MENU_HEADER_STOP_WORDS = {
    "food allergens",
    "no.",
    "ingredients",
    "energy  (kcal)",
    "protein  (g)",
    "total fat (g)",
    "carbohyrate (g)",
    "sugar (g)",
}


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _normalize(value: Any) -> str:
    return _clean(value).lower()


def _title_case(value: str) -> str:
    tokens = [item for item in _clean(value).split(" ") if item]
    return " ".join(token[:1].upper() + token[1:].lower() for token in tokens)


def _dedupe_strings(values: List[str]) -> List[str]:
    seen: Dict[str, bool] = {}
    out: List[str] = []
    for item in values or []:
        key = _normalize(item)
        if not key or seen.get(key):
            continue
        seen[key] = True
        out.append(_clean(item))
    return out


def _extract_text_with_pymupdf(pdf_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception:
        return ""
    chunks: List[str] = []
    for page in doc:
        chunks.append(page.get_text("text") or "")
    return "\n".join(chunks)


def _extract_text_with_pypdf(pdf_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception:
        return ""
    chunks: List[str] = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def extract_pdf_text(pdf_bytes: bytes) -> str:
    text = _extract_text_with_pymupdf(pdf_bytes)
    if len(_clean(text)) >= 80:
        return text
    fallback = _extract_text_with_pypdf(pdf_bytes)
    if len(_clean(fallback)) > len(_clean(text)):
        return fallback
    return text or fallback


def _extract_allergies_from_text(text: str) -> Tuple[List[str], Dict[str, List[str]]]:
    low = _normalize(text)
    detected: List[str] = []
    evidence: Dict[str, List[str]] = {}

    for tag, keys in ALLERGEN_KEYWORDS.items():
        matches: List[str] = []
        for key in keys:
            pattern = r"\b" + re.escape(key) + r"\b"
            if re.search(pattern, low):
                matches.append(key)
        if matches:
            detected.append(tag)
            evidence[tag] = sorted(set(matches))

    return _dedupe_strings(detected), evidence


def parse_medical_report(pdf_bytes: bytes, filename: str) -> Dict[str, Any]:
    text = extract_pdf_text(pdf_bytes)
    allergies, evidence = _extract_allergies_from_text(text)

    low = _normalize(text)
    notes: List[str] = []
    confidence = 0.0

    if allergies:
        confidence = min(0.95, 0.3 + 0.08 * len(allergies))
    elif "allergenius" in low or "allergy component test" in low:
        allergies = LAB_FALLBACK_ALLERGIES[:]
        confidence = 0.22
        notes.append(
            "Low-confidence extraction: report uses encoded text. Please verify before final clinical use."
        )
    else:
        notes.append("Could not confidently detect allergy terms from this PDF.")

    return {
        "sourceFile": _clean(filename),
        "allergies": [_title_case(item) for item in allergies],
        "confidence": round(confidence, 2),
        "evidence": {k: v for k, v in evidence.items()},
        "notes": " ".join(notes).strip(),
    }


def _is_item_start(line: str) -> re.Match[str] | None:
    return re.match(r"^(Dish|Side)\s+(\d+)\b", _clean(line), flags=re.IGNORECASE)


def _is_number(line: str) -> bool:
    return re.fullmatch(r"\d+(?:\.\d+)?", _clean(line)) is not None


def _looks_like_header(line: str) -> bool:
    return _normalize(line) in MENU_HEADER_STOP_WORDS


def _allergen_tags_from_lines(lines: List[str]) -> List[str]:
    tags: List[str] = []
    for line in lines:
        low = _normalize(line)
        if not low:
            continue
        for tag, keys in ALLERGEN_KEYWORDS.items():
            for key in keys:
                if key in low:
                    tags.append(tag)
                    break
    return _dedupe_strings(tags)


def _estimate_price(energy: float | None) -> float:
    if energy is None:
        return 10.5
    estimate = max(6.5, min(24.0, energy / 38.0))
    return round(estimate, 2)


def _parse_meta(lines: List[str]) -> Dict[str, str]:
    meta: Dict[str, str] = {}
    for idx, line in enumerate(lines):
        low = _normalize(line)
        if low == "food type" and idx + 1 < len(lines):
            meta["foodType"] = _clean(lines[idx + 1])
        elif low == "operator" and idx + 1 < len(lines):
            meta["operator"] = _clean(lines[idx + 1])
        elif low == "stall number" and idx + 1 < len(lines):
            meta["stallNumber"] = _clean(lines[idx + 1])
        elif low == "canteen" and idx + 1 < len(lines):
            meta["canteen"] = _clean(lines[idx + 1])
    return meta


def parse_menu_pdf(pdf_bytes: bytes, filename: str) -> Dict[str, Any]:
    text = extract_pdf_text(pdf_bytes)
    raw_lines = [_clean(line) for line in (text or "").splitlines()]
    lines = [line for line in raw_lines if line]
    meta = _parse_meta(lines)

    items: List[Dict[str, Any]] = []
    seen_names: Dict[str, bool] = {}
    duplicates_removed = 0

    i = 0
    while i < len(lines):
        match = _is_item_start(lines[i])
        if not match:
            i += 1
            continue

        item_kind = match.group(1).lower()
        item_index = match.group(2)
        i += 1

        while i < len(lines) and _looks_like_header(lines[i]):
            i += 1
        if i >= len(lines):
            break

        item_name = _clean(lines[i])
        i += 1
        if _is_number(item_name):
            item_name = item_kind.title() + " " + item_index

        metrics: List[float] = []
        while i < len(lines):
            line = lines[i]
            if _is_item_start(line):
                break
            if _looks_like_header(line):
                i += 1
                continue
            if _is_number(line) and len(metrics) < 5:
                metrics.append(float(line))
                i += 1
                continue
            break

        allergen_lines: List[str] = []
        while i < len(lines):
            line = lines[i]
            if _is_item_start(line):
                break
            if _looks_like_header(line):
                i += 1
                continue
            allergen_lines.append(line)
            i += 1

        name_key = _normalize(item_name)
        if name_key in seen_names:
            duplicates_removed += 1
            continue
        seen_names[name_key] = True

        calories = metrics[0] if metrics else None
        quantity_info = ""
        if len(metrics) >= 5:
            quantity_info = (
                "Energy {0:.1f} kcal | Protein {1:.1f}g | Fat {2:.1f}g | Carbs {3:.1f}g | Sugar {4:.1f}g"
            ).format(metrics[0], metrics[1], metrics[2], metrics[3], metrics[4])
        elif metrics:
            quantity_info = "Energy {0:.1f} kcal".format(metrics[0])

        dish_tags = ["pdf-imported", item_kind]
        if meta.get("foodType"):
            dish_tags.append(_normalize(meta["foodType"]))

        items.append(
            {
                "name": item_name,
                "price": _estimate_price(calories),
                "ingredients": "Imported from uploaded allergen PDF.",
                "quantityInfo": quantity_info,
                "allergyTags": _allergen_tags_from_lines(allergen_lines),
                "dishTags": _dedupe_strings(dish_tags),
                "availability": "available",
            }
        )

    return {
        "sourceFile": _clean(filename),
        "items": items,
        "summary": {
            "itemsDetected": len(items),
            "duplicatesRemoved": duplicates_removed,
        },
        "meta": meta,
        "notes": "" if items else "Could not detect dish rows from the PDF.",
    }
