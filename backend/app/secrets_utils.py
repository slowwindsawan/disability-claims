"""
Utility functions for retrieving secrets from the database.
Includes caching to avoid repeated DB queries.
"""
import logging
from typing import Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Simple in-memory cache for secrets
_secrets_cache = {}
_cache_ttl = timedelta(minutes=5)  # Cache for 5 minutes


def get_openai_api_key() -> Optional[str]:
    """
    Retrieve OpenAI API key from database with caching.
    Falls back to environment variable if DB fetch fails.
    Returns None if key is not found in DB or environment.
    """
    import os
    from .supabase_client import get_secret
    
    # Check cache first
    cache_key = 'openai'
    if cache_key in _secrets_cache:
        cached_data = _secrets_cache[cache_key]
        if datetime.now() - cached_data['timestamp'] < _cache_ttl:
            return cached_data['key']
    
    # Fetch from database
    try:
        secret_record = get_secret('openai')
        if secret_record and secret_record.get('key'):
            key = secret_record['key']
            # Update cache
            _secrets_cache[cache_key] = {
                'key': key,
                'timestamp': datetime.now()
            }
            logger.debug('Retrieved OpenAI API key from database')
            return key
    except Exception as e:
        logger.warning(f'Failed to fetch OpenAI key from database: {e}')
    
    # Fallback to environment variable
    env_key = os.getenv('OPENAI_API_KEY')
    if env_key:
        logger.debug('Using OpenAI API key from environment variable')
        return env_key
    
    logger.error('OpenAI API key not found in database or environment')
    return None


def clear_secrets_cache():
    """Clear the secrets cache (useful for testing or after updating secrets)."""
    global _secrets_cache
    _secrets_cache.clear()
    logger.info('Secrets cache cleared')
