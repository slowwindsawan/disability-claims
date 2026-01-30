"""
Speech-to-Text (STT) utilities using OpenAI Whisper API
"""
import os
import logging
from typing import Optional
from openai import AsyncOpenAI
import tempfile

logger = logging.getLogger('stt_utils')
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


async def transcribe_audio(audio_bytes: bytes, language: Optional[str] = None) -> str:
    """
    Transcribe audio using OpenAI Whisper API.
    
    Args:
        audio_bytes: Raw audio file bytes
        language: Optional language code (e.g., 'he' for Hebrew, 'en' for English)
    
    Returns:
        Transcribed text
    """
    try:
        logger.info("🎤 Starting audio transcription with Whisper API")
        
        # Create a temporary file to store the audio
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_path = tmp_file.name
        
        try:
            # Call OpenAI Whisper API
            with open(tmp_path, "rb") as audio_file:
                transcript = await client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=language,  # Will auto-detect if not provided
                    response_format="json"
                )
            
            text = transcript.text.strip()
            logger.info(f"✅ Transcription successful: {text[:100]}...")
            return text
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_path)
            except Exception as e:
                logger.warning(f"⚠️ Failed to delete temp file: {str(e)}")
    
    except Exception as e:
        logger.error(f"❌ Transcription failed: {str(e)}")
        raise
