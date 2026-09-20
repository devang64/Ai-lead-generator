"""
Utility helper functions for string normalization, logging, and data formatting.
"""

import re
import logging

def setup_logger(name: str = "lead_generator", verbose: bool = False) -> logging.Logger:
    logger = logging.getLogger(name)
    level = logging.DEBUG if verbose else logging.INFO
    logger.setLevel(level)

    if not logger.handlers:
        ch = logging.StreamHandler()
        ch.setLevel(level)
        formatter = logging.Formatter("[%(levelname)s] %(message)s")
        ch.setFormatter(formatter)
        logger.addHandler(ch)

    return logger

def normalize_text(text: str) -> str:
    """Normalize string for deduplication comparison (lowercase, strip punctuation and extra whitespace)."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def normalize_phone(phone: str) -> str:
    """Normalize Indian phone numbers into standard format."""
    if not phone or phone == "N/A":
        return "N/A"
    digits = re.sub(r"[^\d]", "", phone)
    if len(digits) == 10:
        return f"+91 {digits[:5]} {digits[5:]}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+91 {digits[2:7]} {digits[7:]}"
    return phone
