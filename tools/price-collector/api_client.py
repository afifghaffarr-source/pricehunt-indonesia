"""
API Client for PriceHunt Ingestion
"""

import requests
from typing import Dict, Any, Optional
from rich.console import Console

from config import INGESTION_ENDPOINT, INGESTION_SECRET, DEBUG

console = Console()


class IngestionClient:
    """Client for sending data to PriceHunt ingestion API"""
    
    def __init__(self):
        self.endpoint = INGESTION_ENDPOINT
        self.secret = INGESTION_SECRET
        
    def send_offer_snapshot(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send offer snapshot to ingestion API
        
        Args:
            data: Offer data matching the API schema
            
        Returns:
            Response from API
        """
        headers = {
            "Authorization": f"Bearer {self.secret}",
            "Content-Type": "application/json",
        }
        
        if DEBUG:
            console.print(f"[dim]→ POST {self.endpoint}[/dim]")
            console.print(f"[dim]  Headers: {headers}[/dim]")
            console.print(f"[dim]  Data: {data}[/dim]")
        
        try:
            response = requests.post(
                self.endpoint,
                json=data,
                headers=headers,
                timeout=30,
            )
            
            if DEBUG:
                console.print(f"[dim]← Status: {response.status_code}[/dim]")
                console.print(f"[dim]  Response: {response.text}[/dim]")
            
            # Try to parse JSON response
            try:
                result = response.json()
            except ValueError:
                result = {
                    "success": False,
                    "message": f"Invalid JSON response (status {response.status_code})",
                    "raw": response.text,
                }
            
            # Add status code to result
            result["status_code"] = response.status_code
            
            return result
            
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "message": "Request timeout (30s)",
                "code": "TIMEOUT",
            }
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "message": f"Connection error. Is PriceHunt running at {self.endpoint}?",
                "code": "CONNECTION_ERROR",
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Unexpected error: {str(e)}",
                "code": "UNKNOWN_ERROR",
            }
    
    def test_connection(self) -> bool:
        """Test API connectivity"""
        try:
            # Try GET endpoint (should return docs)
            response = requests.get(
                self.endpoint,
                timeout=10,
            )
            
            if response.status_code == 200:
                console.print("✅ API connection successful")
                return True
            else:
                console.print(f"⚠️  API responded with status {response.status_code}")
                return False
                
        except Exception as e:
            console.print(f"❌ API connection failed: {e}")
            return False
