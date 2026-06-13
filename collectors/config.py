"""
Configuration loader for PriceHunt collectors.
Uses pydantic-settings to load and validate environment variables.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, AliasChoices
from typing import Literal


class Config(BaseSettings):
    """Application configuration loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra='ignore'
    )
    
    # BijakBeli API
    pricehunt_api_url: str = Field(
        default="https://www.bijakbeli.app",
        description="Base URL for BijakBeli API"
    )
    ingestion_secret: str = Field(
        ...,
        min_length=32,
        description="Secret key for ingestion API authentication"
    )
    
    # Supabase
    supabase_url: str = Field(
        ...,
        validation_alias=AliasChoices('supabase_url', 'NEXT_PUBLIC_SUPABASE_URL'),
        description="Supabase project URL"
    )
    supabase_key: str = Field(
        ...,
        validation_alias=AliasChoices('supabase_key', 'SUPABASE_SERVICE_ROLE_KEY'),
        description="Supabase service role key"
    )
    
    # Collector Settings
    collector_name: str = Field(
        default="python_playwright_collector",
        description="Name identifier for this collector"
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        description="Logging level"
    )
    scrape_timeout: int = Field(
        default=60,
        ge=10,
        le=300,
        description="Timeout for scraping operations in seconds"
    )
    retry_count: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Number of retries for failed requests"
    )
    retry_delay: int = Field(
        default=5,
        ge=1,
        le=60,
        description="Delay between retries in seconds"
    )
    
    # Browser Settings
    headless: bool = Field(
        default=True,
        description="Run browser in headless mode"
    )
    browser_type: Literal["chromium", "firefox", "webkit"] = Field(
        default="chromium",
        description="Browser engine to use"
    )
    
    # Rate Limiting
    request_delay_min: float = Field(
        default=2.0,
        ge=0.5,
        description="Minimum delay between requests in seconds"
    )
    request_delay_max: float = Field(
        default=5.0,
        ge=1.0,
        description="Maximum delay between requests in seconds"
    )
    max_concurrent_requests: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum concurrent scraping requests"
    )
    
    # Data Quality
    min_confidence_score: int = Field(
        default=70,
        ge=0,
        le=100,
        description="Minimum confidence score to accept scraped data"
    )
    enable_price_validation: bool = Field(
        default=True,
        description="Enable price validation checks"
    )
    
    @field_validator("request_delay_max")
    def validate_delays(cls, v, info):
        """Ensure max delay is greater than min delay."""
        if "request_delay_min" in info.data:
            if v < info.data["request_delay_min"]:
                raise ValueError("request_delay_max must be >= request_delay_min")
        return v


# Global config instance
config: Config | None = None


def get_config() -> Config:
    """Get or create the global config instance."""
    global config
    if config is None:
        config = Config()
    return config


def reload_config() -> Config:
    """Force reload configuration from environment."""
    global config
    config = Config()
    return config


# Convenience function
def get_ingestion_url() -> str:
    """Get the full ingestion API URL."""
    cfg = get_config()
    return f"{cfg.pricehunt_api_url}/api/ingestion"


if __name__ == "__main__":
    # Test configuration loading
    try:
        cfg = get_config()
        print("✅ Configuration loaded successfully!")
        print(f"   API URL: {cfg.pricehunt_api_url}")
        print(f"   Collector: {cfg.collector_name}")
        print(f"   Headless: {cfg.headless}")
        print(f"   Ingestion URL: {get_ingestion_url()}")
    except Exception as e:
        print(f"❌ Configuration error: {e}")
