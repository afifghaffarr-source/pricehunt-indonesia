"""
Marketplace collector modules
"""

from .tokopedia import TokopediaCollector
from .shopee import ShopeeCollector

__all__ = [
    "TokopediaCollector",
    "ShopeeCollector",
]
