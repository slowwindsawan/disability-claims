"""
Interview Chat Agent for Zero Touch Claim Interviewer
Conducts an intelligent interview to strengthen disability claims
"""
import os
import logging
import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from pydantic import BaseModel

logger = logging.getLogger('interview_chat_agent')
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Configure colored logging
class ColoredFormatter(logging.Formatter):
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[41m'  # Red background
    }
    RESET = '\033[0m'
    
    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{log_color}{record.levelname}{self.RESET}"
        return super().format(record)

# Apply colored formatter
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = ColoredFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# Import Pinecone retriever for RAG
try:
    import sys
    pinecone_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'pinecone_integration')
    if pinecone_path not in sys.path:
        sys.path.append(pinecone_path)
    from pinecone_retriever import get_retriever
    PINECONE_ENABLED = True
    logger.info("✅ Pinecone RAG enabled for interview agent")
except ImportError as e:
    logger.warning(f"⚠️ Pinecone integration not available for interview: {e}")
    PINECONE_ENABLED = False


def _detect_user_exit_intent(user_message: str) -> bool:
    """
    Detect if user is expressing intent to end the interview.
    Looks for keywords indicating they have no more information to share.
    
    Args:
        user_message: The user's message
    
    Returns:
        True if user shows intent to exit, False otherwise
    """
    exit_keywords_en = [
        "done", "that's all", "that is all", "nothing else", "no more", "i'm done", "im done",
        "i think that's it", "i think that is it", "we're done", "were done", "that's everything",
        "that is everything", "i have nothing else", "i don't have anything else", 
        "i dont have anything else", "no further info", "no further information",
        "i've said everything", "ive said everything", "end interview", "finish", "quit",
        "i think we're done", "i think were done", "i believe we're done", "i believe were done",
        "let's wrap up", "lets wrap up", "finish up", "wrap it up", "complete", "finished"
    ]
    
    exit_keywords_he = [
        "זה הכל", "אין לי עוד", "אין לי יותר", "סיימנו", "סיימתי", "זה הכל מה שיש לי",
        "אין לי עוד מידע", "סיום", "קץ", "סיימנו את הראיון", "זהו", "עוד דברים",
        "שום דבר אחר", "לא יש לי עוד", "הזה הוא הכל"
    ]
    
    message_lower = user_message.lower().strip()
    
    # Check English keywords
    for keyword in exit_keywords_en:
        if keyword in message_lower:
            return True
    
    # Check Hebrew keywords
    for keyword in exit_keywords_he:
        if keyword in message_lower:
            return True
    
    return False


def _detect_ai_completion_intent(ai_message: str) -> bool:
    """
    Detect if the AI is indicating the interview is complete in its response,
    even if it forgot to add the [INTERVIEW_COMPLETE] marker.
    
    Args:
        ai_message: The AI's response message
    
    Returns:
        True if AI indicates completion, False otherwise
    """
    completion_phrases_en = [
        "we're done", "were done", "we are done",
        "done with the survey", "done with the interview",
        "interview is complete", "survey is complete",
        "we have everything", "we have all the information",
        "gathered all", "gathered enough", "sufficient information",
        "completed the interview", "finished the interview",
        "that concludes", "that wraps up",
        "we've completed", "weve completed",
        "no more questions", "no further questions",
        "all set", "you're all set", "youre all set",
        "we're finished", "were finished",
        "thank you for your cooperation", "thanks for your time",
        "enough information to proceed"
    ]
    
    completion_phrases_he = [
        "סיימנו", "סיימנו את הראיון", "סיימנו את הסקר",
        "אין לי עוד שאלות", "זה הכל מצידי",
        "יש לנו את כל המידע", "יש לנו מספיק מידע",
        "הראיון הושלם", "השאלון הושלם",
        "תודה על שיתוף הפעולה", "תודה על הזמן"
    ]
    
    message_lower = ai_message.lower().strip()
    
    # Check English phrases
    for phrase in completion_phrases_en:
        if phrase in message_lower:
            return True
    
    # Check Hebrew phrases
    for phrase in completion_phrases_he:
        if phrase in message_lower:
            return True
    
    return False


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class InterviewResponse(BaseModel):
    message: str
    done: bool = False  # True when AI detects interview completion, False while ongoing
    confidence_score: Optional[float] = None
    extracted_info: Optional[Dict[str, Any]] = None


SYSTEM_PROMPT = """
You are an expert Israeli disability claims attorney conducting an intake interview for a BTL (Bituach Leumi – National Insurance Institute) disability claim.

Your goal is to collect enough high-quality information to build a strong disability claim AND to clearly know when the interview is finished.

────────────────────────
HOW TO START
────────────────────────
• Begin with a warm, empathetic greeting.
• Explain briefly that you are here to help build a strong disability claim.
• Ask clear questions, ONE AT A TIME.

────────────────────────
INFORMATION YOU MUST COLLECT
────────────────────────
A. Medical condition(s)
   • Diagnosis or main symptoms
   • When it started
   • How it progressed or worsened

B. Functional limitations
   • How the condition affects daily life
   • How it affects ability to work

C. Medical care
   • Doctors, clinics, hospitals
   • Medical reports or tests
   • Current treatments or medications

D. Employment & income
   • Last job and type of work
   • When work stopped or was reduced
   • Current income (if any)

E. Daily-life impact
   • At least 3–4 specific, real examples of difficulties

F. Prior disability claims
   • Previous BTL applications
   • Approvals, percentages, or rejections

────────────────────────
COMPLETION CHECK (MANDATORY)
────────────────────────
After each answer, silently check whether you now have ALL of the following:

✔ Clear medical condition or symptoms  
✔ Timeline of onset and progression  
✔ Functional limitations  
✔ Medical documentation sources  
✔ Employment/income context  
✔ 3–4 concrete daily-life examples  
✔ At least 8–10 meaningful data points total  

────────────────────────
CRITICAL TERMINATION RULE
────────────────────────
The interview MUST end IMMEDIATELY if EITHER condition is true:

1) You determine the completion checklist is satisfied  
OR  
2) The user says anything indicating they are done, have no questions, or do not need further help
   (examples: “I have no questions”, “That’s all”, “Thanks”, “Ok”, “I’m done”)

When this happens, you MUST:
• Stop asking questions
• Thank the user briefly
• State that the information is sufficient to build a strong claim
• END the response immediately

────────────────────────
MANDATORY COMPLETION MARKER (strictly enforce)
────────────────────────
Your FINAL LINE MUST be exactly:

[INTERVIEW_COMPLETE]

In any response if you think the interview is complete and no more questions are needed based on the rules above, include the marker.
No text is allowed after the marker.
The marker MUST appear whenever the interview ends.
This rule OVERRIDES all other behavior.

────────────────────────
STYLE & LANGUAGE
────────────────────────
• Use the same language as the user (Hebrew or English)
• Be empathetic, professional, and clear
• Avoid legal jargon
• Ask ONE question at a time unless ending the interview
"""


async def process_interview_message(
    case_id: str,
    user_message: str,
    chat_history: List[ChatMessage],
    user_info: Optional[Dict[str, Any]] = None,
    case_data: Optional[Dict[str, Any]] = None,
    eligibility_raw: Optional[Dict[str, Any]] = None,
    agent_prompt: Optional[str] = None
) -> InterviewResponse:
    """
    Process a user message in the interview conversation.
    
    Args:
        case_id: The case ID for context
        user_message: The latest message from the user
        chat_history: Previous conversation history
        user_info: Optional user profile information
        case_data: Optional case information from database
        eligibility_raw: Optional eligibility assessment data (patient's medical condition)
        agent_prompt: Optional cached system prompt from frontend (reduces DB calls)
    
    Returns:
        InterviewResponse with the assistant's reply and completion status
    """
    try:
        from .supabase_client import get_agent_prompt
        
        logger.info(f"🔵 Processing interview message for case {case_id}")
        logger.debug(f"   User message: {user_message[:100]}...")
        logger.debug(f"   Chat history items: {len(chat_history)}")
        
        # Use provided agent prompt, or fetch from database, or use fallback
        system_prompt = agent_prompt or SYSTEM_PROMPT
        
        if not agent_prompt:
            # Only fetch from DB if not provided from frontend (optimization)
            try:
                agent_config = get_agent_prompt('interview_voice_agent', fallback_prompt=SYSTEM_PROMPT)
                if agent_config.get('prompt'):
                    system_prompt = agent_config.get('prompt')
                    logger.info("✅ Fetched interview agent prompt from database")
                else:
                    # If no prompt returned, use fallback
                    logger.info("ℹ️ Using hardcoded system prompt (agent not found in DB)")
            except Exception as e:
                logger.warning(f"⚠️ Could not fetch agent prompt from database, using fallback: {str(e)}")
        else:
            logger.debug("📌 Using cached agent prompt from frontend (reducing DB calls)")
        
        # Build messages for OpenAI
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Build comprehensive context from all available data
        context_parts = []
        
        if user_info:
            context_parts.append(f"User: {user_info.get('name', 'Unknown')} ({user_info.get('email', 'Unknown')})")
        
        if case_data:
            context_parts.append(f"Case ID: {case_data.get('id', case_id)}")
            if case_data.get('status'):
                context_parts.append(f"Case Status: {case_data.get('status')}")
        
        # Include eligibility_raw as patient's medical condition data
        if eligibility_raw:
            context_parts.append("\n📋 PATIENT'S MEDICAL CONDITION AND ELIGIBILITY DATA:")
            context_parts.append(f"  - Eligibility Score: {eligibility_raw.get('eligibility_score', 'Not rated')}")
            context_parts.append(f"  - Eligibility Status: {eligibility_raw.get('eligibility_status', 'Not assessed')}")
            
            # Include diagnosis if available
            if eligibility_raw.get('diagnosis'):
                context_parts.append(f"  - Diagnosis: {eligibility_raw.get('diagnosis')}")
            
            # Include functional limitations if available
            if eligibility_raw.get('functional_limitations'):
                context_parts.append(f"  - Functional Limitations: {eligibility_raw.get('functional_limitations')}")
            
            # Include previous answers as medical history
            if eligibility_raw.get('answers'):
                answers = eligibility_raw.get('answers', {})
                if answers:
                    context_parts.append(f"  - Previous Medical Questionnaire Responses: {json.dumps(answers, ensure_ascii=False)}")
            
            # Include raw score and details if available
            if eligibility_raw.get('raw_score'):
                context_parts.append(f"  - Raw Assessment Score: {eligibility_raw.get('raw_score')}")
            
            logger.info(f"📊 Included eligibility data in context: score={eligibility_raw.get('eligibility_score')}, status={eligibility_raw.get('eligibility_status')}")
        
        if context_parts:
            context = "\n".join(context_parts)
            messages.append({"role": "system", "content": context})
        
        # Retrieve relevant context from Pinecone if enabled
        rag_context = ""
        if PINECONE_ENABLED:
            try:
                retriever = get_retriever()
                
                # Create a query from the user message and eligibility data for better RAG retrieval
                query_parts = [user_message]
                if eligibility_raw and eligibility_raw.get('diagnosis'):
                    query_parts.append(eligibility_raw.get('diagnosis'))
                query = " ".join(query_parts)[:1000]
                
                # Convert ChatMessage objects to dicts for retriever
                chat_history_dicts = []
                for msg in chat_history:
                    if isinstance(msg, dict):
                        chat_history_dicts.append(msg)
                    else:
                        # ChatMessage Pydantic model
                        chat_history_dicts.append({"role": msg.role, "content": msg.content})
                
                logger.debug(f"🔍 RAG Query: {query[:100]}...")
                logger.debug(f"   Chat history items for context: {len(chat_history_dicts)}")
                
                # Retrieve with chat history for context-aware results
                rag_context = retriever.retrieve_with_chat_history(
                    current_query=query,
                    chat_history=chat_history_dicts,
                    top_k=3  # Fewer results for interview to avoid overwhelming
                )
                
                if rag_context:
                    logger.info(f"✅ Retrieved RAG context: {len(rag_context):,} chars | Top 3 chunks from Pinecone")
                    # Add RAG context as a system message for the interview agent
                    messages.append({
                        "role": "system",
                        "content": f"📚 RELEVANT LEGAL GUIDELINES & PRECEDENTS:\n{rag_context}"
                    })
                else:
                    logger.debug("ℹ️ No RAG context found for this query")
                    
            except Exception as e:
                logger.error(f"❌ RAG retrieval failed in interview: {e}", exc_info=True)
                # Continue without RAG - interview still works
                logger.warning(f"⚠️ Interview will continue without RAG enhancement")
        
        # Add conversation history
        for msg in chat_history:
            if isinstance(msg, dict):
                messages.append(msg)
            else:
                # ChatMessage Pydantic model
                messages.append({"role": msg.role, "content": msg.content})
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        logger.debug(f"📊 Total messages to send to OpenAI: {len(messages)}")
        
        # Log the payload being sent to OpenAI
        logger.debug(f"\n🔸 OPENAI API PAYLOAD (model=gpt-4o, temp=0.7, max_tokens=500):")
        logger.debug(f"   Messages count: {len(messages)}")
        logger.debug(f"   System prompts: {sum(1 for m in messages if m['role'] == 'system')}")
        logger.debug(f"   History: {sum(1 for m in messages if m['role'] in ['user', 'assistant'])}")
        
        # Call OpenAI
        logger.info(f"📡 Calling OpenAI API...")
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        logger.info(f"✅ OpenAI response received")
        
        assistant_message = response.choices[0].message.content
        logger.debug(f"   Response length: {len(assistant_message)} chars")
        
        # Check multiple completion signals:
        # 1. AI explicitly marks as complete with [INTERVIEW_COMPLETE] marker
        is_ai_complete = "[INTERVIEW_COMPLETE]" in assistant_message
        if is_ai_complete:
            logger.info(f"🏁 Interview completion marker detected")
        
        # 2. AI indicates completion in its response (without marker)
        is_ai_saying_done = _detect_ai_completion_intent(assistant_message)
        if is_ai_saying_done:
            logger.info(f"🏁 AI indicated completion in response text")
            # Add the marker if AI forgot it
            if not is_ai_complete:
                assistant_message += "\n[INTERVIEW_COMPLETE]"
                is_ai_complete = True
        
        # 3. User shows intent to end (fallback detection)
        is_user_exiting = _detect_user_exit_intent(user_message)
        
        # Mark as complete if any condition is true
        is_complete = is_ai_complete or is_user_exiting
        
        # Log completion detection
        if is_ai_complete:
            logger.info("🏁 AI marked interview complete")
        if is_user_exiting:
            logger.info("👋 User expressed intent to exit")
            # If user is exiting but AI didn't mark it, add completion marker
            if not is_ai_complete:
                assistant_message += "\n\n[INTERVIEW_COMPLETE]"
        
        # Remove the completion marker from the message for display
        clean_message = assistant_message.replace("[INTERVIEW_COMPLETE]", "").strip()
        
        # Calculate confidence (simple heuristic based on conversation length)
        confidence_score = None
        
        if is_complete:
            # Base confidence on number of exchanges
            num_exchanges = len(chat_history) // 2
            confidence_score = min(95, 60 + (num_exchanges * 5))
            logger.info(f"✅ Interview appears complete | Exchanges: {num_exchanges} | Confidence: {confidence_score}%")
            
            # Add message asking user to proceed to next step
            if not clean_message.lower().endswith("next step") and "next step" not in clean_message.lower():
                if any(lang_part in clean_message for lang_part in ["thank", "toDo", "שלום"]):
                    # AI already said goodbye, add call to action
                    clean_message += "\n\nאנא לחץ על 'בדיקת כשרות' כדי להמשיך לשלב הבא של ניתוח התביעה שלך."
                    clean_message += "\n\nPlease click 'Check Eligibility' to proceed to the next step of analyzing your claim."
        else:
            logger.debug(f"⏳ Interview ongoing | History items: {len(chat_history)}")
        
        logger.info(f"✅ Interview response generated. Done: {is_complete}, Confidence: {confidence_score}")
        
        return InterviewResponse(
            message=clean_message,
            done=is_complete,  # True when AI detects completion, False while ongoing
            confidence_score=confidence_score,
            extracted_info=None  # TODO: Could add structured extraction in future
        )
        
    except Exception as e:
        logger.error(f"❌ Error processing interview message: {str(e)}", exc_info=True)
        raise


async def generate_initial_greeting(language: str = "en", user_name: Optional[str] = None, eligibility_raw: Optional[Dict[str, Any]] = None) -> str:
    """
    Generate the initial greeting message to start the interview.
    If eligibility data is provided, generates a personalized AI greeting.
    
    Args:
        language: 'en' or 'he' for English or Hebrew
        user_name: Optional user's full name for personalization
        eligibility_raw: Optional eligibility data for personalized greeting
    
    Returns:
        Initial greeting message (AI-generated or static fallback)
    """
    # If we have eligibility data, generate personalized greeting
    if eligibility_raw:
        try:
            # Print raw eligibility data in color for debugging
            logger.info(f"\n{'='*80}")
            logger.info(f"\033[1;36m📋 ELIGIBILITY_RAW DATA SENT TO AI AGENT:\033[0m")
            logger.info(f"\033[1;36m{'-'*80}\033[0m")
            for key, value in eligibility_raw.items():
                logger.info(f"\033[1;33m  {key:.<25}\033[0m \033[1;32m{value}\033[0m")
            logger.info(f"\033[1;36m{'-'*80}\033[0m")
            logger.info(f"{'='*80}\n")
            
            # Extract all available information from eligibility_raw
            diagnosis = eligibility_raw.get('diagnosis', 'medical condition')
            strengths = eligibility_raw.get('strengths', [])
            weaknesses = eligibility_raw.get('weaknesses', [])
            missing_info = eligibility_raw.get('missing_information', [])
            next_steps = eligibility_raw.get('required_next_steps', [])
            
            # Build formatted eligibility info for AI prompt (without score/status)
            eligibility_info = _format_eligibility_data(
                diagnosis=diagnosis,
                strengths=strengths,
                weaknesses=weaknesses,
                missing_info=missing_info,
                next_steps=next_steps
            )
            
            if language == "he":
                # Hebrew prompt with full eligibility details
                personalization_prompt = f"""אתה עורך דין בתביעות נכות בישראל. צור הודעת פתיחה מפורטת וחם לראיון עם אדם.

🔹 מידע המטופל:
- שם: {user_name if user_name else 'משתמש'}
- אבחנה: {diagnosis}

🔹 ניתוח תביעתו הנוכחי:
{eligibility_info}

דרישות עיצוב חשובות:
- השתמש בשברי שורה (newlines) בין כל חלקים לבהירות
- השתמש בנקודות עיגול (•) עם רווחים ברורים
- השתמש בכותרות מודגשות (שורה חדשה לפני וקודם הכותרת)
- הוסף שורה ריקה בין חלקים גדולים
- NEVER use placeholders like [Your Name], [Name], etc.

ההודעה חייבת להכיל:
1. קבלת פנים חמה ורחמנית כשם האדם, כעורך הדין הדיגיטלי שלהם
2. הבנה מעמיקה של מצבם הרפואי ({diagnosis})
3. חלק לחוזקות התביעה - הצגה ברורה של הנקודות החוזקות
4. חלק לתחומים הדורשים תשומת לב - הצגה ברורה של הנקודות החלשות
5. חלק למידע שאנחנו צריכים - הצגה ברורה של החסר
6. הסבר מפורט מהו מטרת הראיון עם נקודות ברורות
7. בקש מהם לאשר/תיקן את הנתונים לפני שמתחילים

תשובה בעברית בלבד."""
            else:
                # English prompt with full eligibility details
                personalization_prompt = f"""You are an Israeli disability claims attorney. Create a detailed, warm opening message for an interview with someone who has submitted a disability claim.

🔹 Patient Information:
- Name: {user_name if user_name else 'User'}
- Diagnosis: {diagnosis}

🔹 Analysis of their current claim:
{eligibility_info}

IMPORTANT FORMATTING REQUIREMENTS:
- Use line breaks (newlines) between each section for clarity
- Use bullet points (•) with clear spacing
- Use emphasized headers (new line before and after header text)
- Add blank lines between major sections
- NEVER use placeholders like [Your Name], [Name], etc.
- Do NOT mention eligibility score or current status in the message

The opening message MUST include:
1. A warm and empathetic welcome using their actual name as their digital disability claims attorney
2. Deep understanding of their medical condition ({diagnosis})
3. A section for strengths of their claim - clear presentation of strong points
4. A section for areas needing attention - clear presentation of weak points
5. A section for information we need - clear presentation of missing items
6. Detailed explanation of what this interview will accomplish with clear points
7. Ask them to confirm/correct information before proceeding

Response in English only. NO PLACEHOLDERS."""
            
            completion = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an empathetic Israeli disability claims attorney. Always use proper line breaks and formatting. NEVER include placeholder text like [Your Name], [Name], etc. Use the actual information provided. Format with proper sections and line breaks for readability." if language != "he" else "אתה עורך דין בתביעות נכות בישראל, חם ורחמן ומקצועי. תמיד השתמש בשברי שורה וליצור טקסט עם בהירות גבוהה. NEVER include placeholder text."},
                    {"role": "user", "content": personalization_prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            personalized_greeting = completion.choices[0].message.content.strip()
            
            # Remove any remaining placeholders from AI output
            import re
            placeholder_patterns = [
                r'\[Your Name\]',
                r'\[Your name\]',
                r'\[Name\]',
                r'\[name\]',
                r'\[.*?\]',  # Any remaining [placeholder]
            ]
            for pattern in placeholder_patterns:
                personalized_greeting = re.sub(pattern, '', personalized_greeting)
            
            personalized_greeting = personalized_greeting.strip()
            
            # Add opening question to start the conversation with 3 line breaks
            if language == "he":
                opening_question = "\n\n\nבואו נתחיל: ספר לי בעצמך - כמה זמן אתה מתמודד עם המצב הרפואי הזה, ומתי התחיל?"
            else:
                opening_question = "\n\n\nLet's begin: Tell me in your own words - how long have you been dealing with this medical condition, and when did it start?"
            
            full_message = personalized_greeting + opening_question
            logger.info(f"✨ Generated comprehensive personalized greeting with opening question for {user_name or 'User'} with {diagnosis}")
            return full_message
            
        except Exception as e:
            logger.warning(f"⚠️ Could not generate personalized greeting: {e}, using default")
    
    # Fallback to static greeting
    if language == "he":
        return """שלום! אני העורך דין הדיגיטלי שלך המתמחה בתביעות נכות.

אני כאן כדי לעזור לך לבנות את התביעה החזקה ביותר האפשרית לביטוח לאומי.

בואו נתחיל: ספר לי קצת על המצב הרפואי שלך - מה הבעיה העיקרית שגורמת לך קושי?"""
    else:
        return """Hello! I'm your digital disability claims attorney.

I'm here to help you build the strongest possible claim for National Insurance.

Let's begin: Tell me a bit about your medical condition - what is the main issue that's causing you difficulty?"""


def _format_eligibility_data(
    diagnosis: str,
    strengths: list,
    weaknesses: list,
    missing_info: list,
    next_steps: list
) -> str:
    """
    Format eligibility data into a properly structured string with line breaks and sections.
    
    Args:
        diagnosis: Patient's diagnosis
        strengths: List of claim strengths
        weaknesses: List of claim weaknesses
        missing_info: List of missing information
        next_steps: List of required next steps
    
    Returns:
        Formatted string with proper line breaks and sections
    """
    sections = []
    
    # Strengths section
    if strengths:
        sections.append("Strengths of your claim:")
        for strength in strengths:
            sections.append(f"  • {strength}")
        sections.append("")  # Blank line
    
    # Weaknesses section
    if weaknesses:
        sections.append("Areas requiring attention:")
        for weakness in weaknesses:
            sections.append(f"  • {weakness}")
        sections.append("")  # Blank line
    
    # Missing information section
    if missing_info:
        sections.append("Information we need to gather:")
        for info in missing_info:
            sections.append(f"  • {info}")
        sections.append("")  # Blank line
    
    # Next steps section
    if next_steps:
        sections.append("What we will accomplish in this interview:")
        for step in next_steps:
            sections.append(f"  • {step}")
    
    return "\n".join(sections)
