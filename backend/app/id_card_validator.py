"""
ID Card Validator Agent
Validates ID card OCR text using OpenAI to extract and verify required fields.
"""
import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from openai import OpenAI
from .secrets_utils import get_openai_api_key

logger = logging.getLogger(__name__)

# Initialize OpenAI client with key from database
_openai_key = get_openai_api_key()
client = OpenAI(api_key=_openai_key) if _openai_key else None


def validate_id_card(ocr_text: str, id_type: str) -> Dict[str, Any]:
    """
    Validate ID card OCR text and extract required fields.
    
    Args:
        ocr_text: Text extracted from ID card via Google Vision OCR
        id_type: Type of ID card - "driving_license" or "state_id"
    
    Returns:
        Dict with validation result:
        {
            "is_valid": bool,
            "full_name": str or None,
            "dob": str or None (format: DD/MM/YYYY),
            "id_number": str or None (9-digit number),
            "error_message": str or None
        }
    """
    try:
        logger.info(f"🔍 Validating {id_type} with OCR text length: {len(ocr_text)} chars")
        
        # Prepare the system prompt
        system_prompt = f"""You are an expert at extracting information from Israeli ID cards and driver's licenses. Your task is to analyze OCR text and extract:

1. Full Name (PREFERABLY IN HEBREW - if Hebrew is visible, keep it as-is) - can be in format "lastname firstname" or "firstname lastname"
2. Date of Birth - MUST BE IN DD/MM/YYYY FORMAT (e.g., 30/10/1991)
3. ID Number - exactly 9 digits

ISRAELI ID CARD SPECIFICS:
- NAMES IN HEBREW: Extract as-is if possible (e.g., קרבי שקד) - DO NOT convert to English
- If only English names available, use those (e.g., KARBY SHAKED)
- Hebrew names often appear as "lastname firstname" (e.g., קרבי שקד)
- Dates are usually in DD.MM.YYYY format (e.g., 30.10.1991 = October 30, 1991)
- ID numbers are 9 digits (e.g., 203488051)
- Driver's licenses show "DRIVING LICENCE" or "רשיון נהיגה"
- Look for field markers like "3." for DOB, "4d.ID" or "5." for ID number

EXTRACTION RULES:
- Extract the name in HEBREW if available - this is critical
- Convert date to DD/MM/YYYY format (30.10.1991 becomes 30/10/1991) - THIS IS CRITICAL
- Extract 9-digit ID number (remove any text like "ID" or "4d.ID")
- Be flexible with OCR artifacts and formatting
- Only mark as invalid if you truly cannot find the required information

Return JSON:
{{
    "is_valid": true or false,
    "full_name": "extracted name (PREFERABLY HEBREW like קרבי שקד)" or null,
    "dob": "DD/MM/YYYY" or null,
    "id_number": "9-digit number" or null,
    "error_message": "specific error" or null
}}

ERROR MESSAGES (only if truly unable to extract):
- "Cannot clearly identify the full name. Please upload a clearer image."
- "Cannot identify the date of birth. Please upload a clearer image."
- "Cannot identify a valid 9-digit ID number. Please upload a clearer image."
- "Multiple fields are unclear. Please upload a clearer image showing all details."

IMPORTANT: Only return the JSON object, nothing else. KEEP HEBREW NAMES IN HEBREW. DATES MUST BE DD/MM/YYYY FORMAT."""

        user_prompt = f"""Extract information from this Israeli {id_type.replace('_', ' ')} OCR text. IMPORTANT: Keep Hebrew names in Hebrew! Format dates as DD/MM/YYYY!

{ocr_text}

Look for:
- Full name in HEBREW (like קרבי שקד) if visible, otherwise English
- Date of birth in DD/MM/YYYY format (e.g., 30/10/1991 for October 30, 1991)
- 9-digit ID number (like 203488051)

Be smart about Israeli formats and extract the data even if the layout is unconventional."""

        # Call OpenAI
        logger.debug(f"🤖 Calling OpenAI for ID validation...")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,  # Low temperature for consistent extraction
            max_tokens=500
        )
        
        # Parse response
        response_text = response.choices[0].message.content.strip()
        logger.debug(f"📄 OpenAI response: {response_text}")
        
        # Extract JSON from response (in case there's markdown formatting)
        if response_text.startswith("```json"):
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif response_text.startswith("```"):
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(response_text)
        
        # Validate the result structure
        required_keys = ["is_valid", "full_name", "dob", "id_number", "error_message"]
        if not all(key in result for key in required_keys):
            logger.error(f"❌ Invalid response structure from OpenAI: {result}")
            return {
                "is_valid": False,
                "full_name": None,
                "dob": None,
                "id_number": None,
                "error_message": "Internal validation error. Please try again."
            }
        
        # Additional validation: if is_valid is True, ensure all fields are present
        if result["is_valid"]:
            if not result["dob"] or not result["id_number"]:
                logger.warning(f"⚠️  OpenAI marked as valid but missing critical fields: {result}")
                result["is_valid"] = False
                result["error_message"] = "Extracted data is incomplete. Please upload a clearer image."
            
            # Validate ID number is exactly 9 digits (allow leading zeros to be stripped)
            if result["id_number"]:
                id_clean = result["id_number"].strip().replace(" ", "")
                if not id_clean.isdigit():
                    logger.warning(f"⚠️  ID number contains non-digits: {result['id_number']}")
                    result["is_valid"] = False
                    result["error_message"] = "ID number must be exactly 9 digits. Please upload a clearer image."
                elif len(id_clean) != 9:
                    logger.warning(f"⚠️  ID number is not 9 digits: {result['id_number']} (length: {len(id_clean)})")
                    result["is_valid"] = False
                    result["error_message"] = "ID number must be exactly 9 digits. Please upload a clearer image."
                else:
                    # Normalize the ID number
                    result["id_number"] = id_clean
            
            # Validate age: person must be 18+ years old
            if result["dob"] and result["is_valid"]:
                try:
                    dob_parts = result["dob"].split("/")
                    if len(dob_parts) == 3:
                        day, month, year = int(dob_parts[0]), int(dob_parts[1]), int(dob_parts[2])
                        dob_date = datetime(year, month, day)
                        today = datetime.now()
                        age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
                        
                        logger.info(f"📅 Age calculation: DOB={result['dob']}, Age={age}")
                        
                        if age < 18:
                            logger.warning(f"⚠️  Person is underage: {age} years old")
                            result["is_valid"] = False
                            result["error_message"] = f"You must be at least 18 years old. Current age: {age} years."
                        else:
                            logger.info(f"✅ Age validation passed: {age} years old")
                except (ValueError, IndexError) as e:
                    logger.warning(f"⚠️  Failed to parse or calculate age from DOB {result['dob']}: {e}")
                    result["is_valid"] = False
                    result["error_message"] = "Unable to validate date of birth. Please upload a clearer image."
                    result["id_number"] = id_clean
        
        logger.info(f"✅ Validation result: is_valid={result['is_valid']}")
        return result
        
    except json.JSONDecodeError as e:
        logger.exception(f"❌ Failed to parse OpenAI response as JSON: {e}")
        return {
            "is_valid": False,
            "full_name": None,
            "dob": None,
            "id_number": None,
            "error_message": "Failed to process the ID card. Please try again with a clearer image."
        }
    except Exception as e:
        logger.exception(f"❌ Error validating ID card: {e}")
        return {
            "is_valid": False,
            "full_name": None,
            "dob": None,
            "id_number": None,
            "error_message": "An error occurred during validation. Please try again."
        }
