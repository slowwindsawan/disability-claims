"""
Medical Committee Preparation Agent
Text-based conversational agent that trains users for their BTL medical committee examination.
Covers what to expect, how to describe symptoms, what to bring, and practice Q&A.
"""
import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from pydantic import BaseModel
from .secrets_utils import get_openai_api_key

logger = logging.getLogger('committee_prep_agent')

_openai_key = get_openai_api_key()
client = AsyncOpenAI(api_key=_openai_key) if _openai_key else None


SYSTEM_PROMPT = """
You are an expert Israeli disability-claim coach who specializes in preparing claimants for BTL (Bituach Leumi / National Insurance Institute) medical committee examinations.

Your role is to be a warm, practical, and thorough coach. You know exactly how Israeli medical committees work, what doctors look for, and how claimants can communicate their condition in the clearest and most accurate way.

────────────────────────
YOUR COACHING AGENDA (work through these naturally in conversation)
────────────────────────

PHASE 1 — UNDERSTAND THE CLAIMANT'S SITUATION
• Start by reviewing the appointment details you have been given (date, specialty, location).
• Ask about their main diagnosis and the symptoms the committee will assess.
• Understand how the condition affects their daily life RIGHT NOW.

PHASE 2 — WHAT TO EXPECT AT THE COMMITTEE
• Explain the committee structure (chair doctor, secretary, short examination).
• Explain that the committee assigns percentages based on severity:
  - 0% if the condition does not meet minimum thresholds
  - Percentages are weighted (e.g. ADHD at 20% temporary for 2 years)
• Emphasise that **clear, specific, honest descriptions** always outperform vague or exaggerated claims.

PHASE 3 — HOW TO DESCRIBE YOUR CONDITION
• Coach the claimant to use concrete examples instead of general statements.
  BAD:  "I have bad memory."
  GOOD: "I have to reread the same paragraph 5 times before it registers; it takes me 3× longer to finish a course assignment."
• Focus on the WORST days, not the typical days.
• Refer to FUNCTIONAL IMPACT in at least two domains: social, educational, occupational, self-care.
• Remind them to mention ANY medications and their side effects.

PHASE 4 — WHAT TO BRING
• Photo ID (תעודת זהות)
• Any medical records not yet submitted (including neuropsych test results, clinic notes, MRI/CT disks)
• Medication list with dosages

PHASE 5 — PRACTICE Q&A
• Role-play common committee questions:
  1. "Describe your daily experience with this condition."
  2. "How does it affect your studies / work?"
  3. "What treatments have you tried?"
  4. "What is a typical bad day like for you?"
  5. "Are your symptoms getting better, worse, or the same?"
• After each mock answer, give SPECIFIC, KIND feedback on what was strong and what could be clearer.
• Repeat practice until the claimant feels confident.

PHASE 6 — LOGISTICS & LAST-MINUTE TIPS
• Arrive 10 minutes early with documents.
• Speak Hebrew if comfortable — use simple, clear language.
• Do not minimise symptoms; do not exaggerate — describe reality and its impact.
• If the doctor asks "on a scale of 1-10 how much pain/difficulty?", give an honest number.
• It is OK to say "I don't know" or "I need to check."

────────────────────────
CRITICAL STYLE RULES
────────────────────────
• Match the user's language (Hebrew or English).
• Ask ONE question or give ONE coaching point at a time.
• Be warm, encouraging, and non-judgmental.
• Never provide legal or medical advice that contradicts a doctor.
• If the user says they feel ready, give a final motivational summary and end with [PREP_COMPLETE].
• Add [PREP_COMPLETE] as the very last line ONLY when the user is genuinely fully coached.
"""


class CommitteePrepMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


def _build_context_block(case_data: Dict[str, Any]) -> str:
    """Build a context summary to inject into the system prompt."""
    lines = []

    # Appointment details from metadata.committee_appointment
    meta = case_data.get('metadata') or {}
    appt = meta.get('committee_appointment') or {}
    if appt.get('appointment_date'):
        lines.append(f"APPOINTMENT DATE: {appt['appointment_date']}")
    if appt.get('appointment_time'):
        lines.append(f"APPOINTMENT TIME: {appt['appointment_time']}")
    if appt.get('appointment_place'):
        lines.append(f"APPOINTMENT LOCATION: {appt['appointment_place']}")
    if appt.get('appointment_specialty'):
        lines.append(f"MEDICAL SPECIALTY: {appt['appointment_specialty']}")

    # Pull diagnosis / condition summary from call_summary
    call_summary = case_data.get('call_summary') or {}
    if isinstance(call_summary, dict):
        summary_text = call_summary.get('summary') or call_summary.get('text') or ''
        if summary_text:
            lines.append(f"\nCLAIM SUMMARY (from intake interview):\n{summary_text[:1500]}")
        structured = call_summary.get('structuredData') or call_summary.get('structured_data') or {}
        conditions = structured.get('conditions') or structured.get('medical_conditions') or []
        if conditions:
            lines.append(f"DIAGNOSED CONDITIONS: {', '.join(str(c) for c in conditions)}")
        limitations = structured.get('functional_limitations') or []
        if limitations:
            lines.append(f"FUNCTIONAL LIMITATIONS: {', '.join(str(l) for l in limitations)}")

    # Document summaries (brief)
    doc_summaries = case_data.get('document_summaries') or {}
    if doc_summaries:
        lines.append("\nUPLOADED MEDICAL DOCUMENTS:")
        for doc_name, doc_info in list(doc_summaries.items())[:5]:
            ds = (doc_info or {}).get('document_summary') or ''
            if ds:
                lines.append(f"  • {doc_name}: {ds[:300]}")

    if not lines:
        return "(No case context available — coach based on general committee preparation.)"

    return "\n".join(lines)


async def process_committee_prep_message(
    message: str,
    chat_history: List[CommitteePrepMessage],
    case_data: Optional[Dict[str, Any]] = None,
    language: str = 'he'
) -> Dict[str, Any]:
    """
    Process a single user message in the committee prep conversation.

    Returns:
        {
            "message": str,       # assistant reply
            "done": bool,         # True when PREP_COMPLETE marker detected
        }
    """
    if not client:
        logger.error('[COMMITTEE_PREP] OpenAI client not initialized')
        return {'message': 'שגיאה: המנוי לא מחובר. אנא פנה לתמיכה.', 'done': False}

    # Fetch prompt from DB, fall back to hardcoded SYSTEM_PROMPT
    base_prompt = SYSTEM_PROMPT
    try:
        from .supabase_client import get_agent_prompt
        # Pass fallback_prompt=None so we can distinguish a real DB result from a not-found response
        agent_config = get_agent_prompt('medical_prep', fallback_prompt=None)
        if agent_config.get('prompt'):
            base_prompt = agent_config['prompt']
            print(f'[COMMITTEE_PREP] ✅ SOURCE: DATABASE (medical_prep) | first 300 chars:\n{base_prompt[:300]}\n', flush=True)
            logger.info('[COMMITTEE_PREP] ✅ Using prompt fetched from database (medical_prep)')
        else:
            print(f'[COMMITTEE_PREP] ⚠️ SOURCE: HARDCODED FALLBACK (medical_prep not found in DB) | first 300 chars:\n{SYSTEM_PROMPT[:300]}\n', flush=True)
            logger.info('[COMMITTEE_PREP] ℹ️ medical_prep not found in DB or prompt is empty — using hardcoded fallback')
    except Exception as e:
        print(f'[COMMITTEE_PREP] ❌ DB fetch failed, using HARDCODED FALLBACK. Error: {e}', flush=True)
        logger.warning(f'[COMMITTEE_PREP] Could not fetch prompt from DB, using fallback: {e}')

    context_block = _build_context_block(case_data or {})
    lang_instruction = (
        "Always respond in Hebrew (use formal but warm Hebrew)."
        if language == 'he'
        else "Always respond in English."
    )

    system_with_context = (
        f"{base_prompt}\n\n"
        f"────────────────────────\n"
        f"CLAIMANT CONTEXT\n"
        f"────────────────────────\n"
        f"{context_block}\n\n"
        f"LANGUAGE: {lang_instruction}"
    )

    messages = [{'role': 'system', 'content': system_with_context}]
    for msg in chat_history:
        messages.append({'role': msg.role, 'content': msg.content})
    messages.append({'role': 'user', 'content': message})

    try:
        response = await client.chat.completions.create(
            model='gpt-4o',
            messages=messages,
            temperature=0.5,
            max_tokens=1200,
        )
        reply = response.choices[0].message.content or ''
        done = '[PREP_COMPLETE]' in reply
        # Strip the marker from the reply shown to user
        clean_reply = reply.replace('[PREP_COMPLETE]', '').strip()
        return {'message': clean_reply, 'done': done}
    except Exception as e:
        logger.exception('[COMMITTEE_PREP] API call failed')
        return {'message': f'שגיאה: {str(e)}', 'done': False}


async def generate_initial_greeting(
    case_data: Optional[Dict[str, Any]] = None,
    language: str = 'he'
) -> Dict[str, Any]:
    """Generate the opening message from the committee prep coach."""
    context_block = _build_context_block(case_data or {})

    # Fetch prompt from DB, fall back to hardcoded SYSTEM_PROMPT
    base_prompt = SYSTEM_PROMPT
    try:
        from .supabase_client import get_agent_prompt
        agent_config = get_agent_prompt('medical_prep', fallback_prompt=None)
        if agent_config.get('prompt'):
            base_prompt = agent_config['prompt']
            print(f'[COMMITTEE_PREP:GREET] ✅ SOURCE: DATABASE (medical_prep) | first 300 chars:\n{base_prompt[:300]}\n', flush=True)
            logger.info('[COMMITTEE_PREP] ✅ Using prompt fetched from database (medical_prep)')
        else:
            print(f'[COMMITTEE_PREP:GREET] ⚠️ SOURCE: HARDCODED FALLBACK (medical_prep not found in DB) | first 300 chars:\n{SYSTEM_PROMPT[:300]}\n', flush=True)
            logger.info('[COMMITTEE_PREP] ℹ️ medical_prep not found in DB or prompt is empty — using hardcoded fallback')
    except Exception as e:
        print(f'[COMMITTEE_PREP:GREET] ❌ DB fetch failed, using HARDCODED FALLBACK. Error: {e}', flush=True)
        logger.warning(f'[COMMITTEE_PREP] Could not fetch prompt from DB, using fallback: {e}')

    meta = (case_data or {}).get('metadata') or {}
    appt = meta.get('committee_appointment') or {}
    appt_date = appt.get('appointment_date', '')
    appt_place = appt.get('appointment_place', '')
    specialty = appt.get('appointment_specialty', '')

    if language == 'he':
        greeting_prompt = (
            f"הכן ברכה פתיחה חמה ומעודדת בעברית למטופל שיש לו ועדה רפואית ב-BTL (ביטוח לאומי). "
            f"{'תאריך הוועדה: ' + appt_date + '. ' if appt_date else ''}"
            f"{'מיקום: ' + appt_place + '. ' if appt_place else ''}"
            f"{'תחום: ' + specialty + '. ' if specialty else ''}"
            f"הסבר בקצרה מה תעשה יחד: תבין את מצבו, תסביר איך הוועדה עובדת, ותעזור לו להתאמן על תשובות. "
            f"שאל שאלה ראשונה אחת בלבד: מה האבחנה העיקרית שהוועדה תעריך?"
        )
    else:
        greeting_prompt = (
            f"Write a warm, encouraging opening message for a claimant preparing for a BTL medical committee examination. "
            f"{'Committee date: ' + appt_date + '. ' if appt_date else ''}"
            f"{'Location: ' + appt_place + '. ' if appt_place else ''}"
            f"{'Specialty: ' + specialty + '. ' if specialty else ''}"
            f"Briefly explain that you will: understand their situation, explain the committee process, "
            f"and help them practice answers. Ask only one first question: what is the main diagnosis the committee will assess?"
        )

    system = f"{base_prompt}\n\nCLAIMANT CONTEXT:\n{context_block}"

    try:
        response = await client.chat.completions.create(
            model='gpt-4o',
            messages=[
                {'role': 'system', 'content': system},
                {'role': 'user', 'content': greeting_prompt}
            ],
            temperature=0.6,
            max_tokens=600,
        )
        reply = response.choices[0].message.content or ''
        return {'message': reply.replace('[PREP_COMPLETE]', '').strip(), 'done': False}
    except Exception as e:
        logger.exception('[COMMITTEE_PREP] Greeting generation failed')
        return {'message': 'שלום! אני כאן כדי לעזור לך להתכונן לוועדה הרפואית שלך.', 'done': False}
