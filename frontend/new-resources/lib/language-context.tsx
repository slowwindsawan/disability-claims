"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "he" | "en"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
  he: {
    // Header
    "header.personal_area": "אזור אישי",
    "header.company_name": "ZeroTouch",

    // Hero
    "hero.title": "הפיצוי שלך. במקסימום.",
    "hero.subtitle": "מערכת AI שמחליפה עורך דין.",
    "hero.cta": "בדוק זכאות",
    "hero.legal_notice":
      "לידיעתך: הפנייה למוסד לביטוח לאומי ולגופים המוסמכים יכולה להיעשות על ידך באופן עצמאי וללא תשלום. השירות בחברה כרוך בתשלום כמפורט בהסכם ההתקשרות.",

    // OTP Phone
    "otp.phone.title": "בואו נתחיל",
    "otp.phone.subtitle": "הזינו מספר טלפון לקבלת קוד אימות",
    "otp.phone.send_code": "שלח קוד",
    "otp.phone.secure_connection": "חיבור מאובטח",

    // OTP Code
    "otp.code.title": "הזינו את הקוד",
    "otp.code.subtitle": "שלחנו קוד בן 4 ספרות למספר",
    "otp.code.resend_code": "שלח קוד שוב",

    // OTP Success
    "otp.success.title": "אומת בהצלחה!",
    "otp.success.subtitle": "אנחנו מכינים עבורך את השאלון...",

    // OTP Questions
    "otp.questions.question_number": "שאלה",
    "otp.questions.of": "מתוך",
    "otp.questions.yes": "כן",
    "otp.questions.no": "לא",

    // Login Modal
    "login.title": "התחברות למערכת",
    "login.existing_user": "משתמש קיים",
    "login.existing_user_desc": "חזור לתיק שלי",
    "login.admin": "מנהל מערכת",
    "login.admin_desc": "Admin Dashboard",
    "login.subadmin": "צוות",
    "login.subadmin_desc": "SubAdmin Dashboard",
    "login.subtitle": "הזינו מספר טלפון לקבלת קוד אימות",
    "login.send_code": "שלח קוד",
    "login.secure_connection": "חיבור מאובטח",

    // How It Works
    "how_it_works.title": "איך זה עובד?",
    "how_it_works.subtitle": "3 שלבים פשוטים למימוש הזכאות שלך", // Replaced Arabic text "الحقوق" with Hebrew "הזכויות"
    "how_it_works.check_eligibility": "בדיקת זכאות", // Replaced Arabic text "الحقوق" with Hebrew "הזכויות"
    "how_it_works.check_eligibility_description": "שאלון חכם של 2 דקות שמזהה את הזכאות שלך", // Replaced Arabic text "الحقوق" with Hebrew "הזכויות"
    "how_it_works.ai_legal_consultant": "ייעוץ משפטי AI", // Replaced Arabic text "الحقوق" with Hebrew "הזכויות"
    "how_it_works.ai_legal_consultant_description": "שיחה וירטואלית עם עורכת דין דיגיטלית", // Replaced Arabic text "الحقوق" with Hebrew "הזכויות"
    "how_it_works.compensation": "קבלת פיצוי", // Replaced Arabic text "الحقوق" with Hebrew "הזכויות"

    // Statistics
    "stats.title": "מספרים שמדברים בעד עצמם",
    "stats.subtitle": "תוצאות מוכות שמדברות בעד עצמן",
    "stats.happy_clients": "לקוחות מרוצים",
    "stats.average_compensation": "פיצוי ממוצע",
    "stats.check_time": "זמן בדיקה",
    "stats.success_rate": "שיעור הצלחה",
    "stats.time_unit": "דקות",

    // Benefits
    "benefits.title": "למה ZeroTouch?",
    "benefits.subtitle": "היתרונות שלנו מול עורך דין מסורתי",
    "benefits.speed": "מהירות",
    "benefits.speed_description": "תהליך דיגיטלי של ימים, לא חודשים",
    "benefits.cost": "עלות נמוכה",
    "benefits.cost_description": "שקיפות מלאה בתמחור, ללא הפתעות",
    "benefits.availability": "זמינות 24/7",
    "benefits.availability_description": "המערכת זמינה בכל שעה, בכל מקום",
    "benefits.transparency": "שקיפות",
    "benefits.transparency_description": "עדכונים בזמן אמת על מצב התיק",

    // CTA
    "cta.title": "מוכנים להתחיל?",
    "cta.subtitle": "בדקו את הזכאות שלכם עכשיו - זה לוקח רק 2 דקות",
    "cta.button": "התחל בדיקה חינם",

    // Footer
    "footer.brand_description": "מיצוי זכויות רפואיות בטכנולוגיית AI. מהיר, מדויק, וללא בירוקרטיה.",
    "footer.quick_links": "קישורים מהירים",
    "footer.free_check": "בדיקת זכאות חינם",
    "footer.personal_area": "אזור אישי / כניסה",
    "footer.faq": "שאלות ותשובות",
    "footer.about": "אודותינו",
    "footer.contact_support": "יצירת קשר ותמיכה",
    "footer.whatsapp": "WhatsApp: צ'אט אנושי (09:00-18:00)",
    "footer.email": "דוא״ל: support@zerotouch.co.il",
    "footer.address": "כתובת: רחוב תובל 4, תל אביב",
    "footer.accessibility": "הצהרת נגישות",
    "footer.trust_security": "אמון ואבטחה",
    "footer.ssl_secured": "SSL Secured",
    "footer.terms": "תקנון ותנאי שימוש",
    "footer.privacy": "מדיניות פרטיות",
    "footer.refunds": "מדיניות ביטולים",
    "footer.copyright": "© 2025 ZeroTouch Ltd. כל הזכויות שמורות.",
    "footer.disclaimer":
      "ZeroTouch הינה מערכת טכנולוגית לניהול מידע ומתן כלי עזר להגשת תביעות באופן עצמאי. השירות אינו מהווה ייעוץ משפטי ואינו מחליף עורך דין. המידע המוצג באתר הוא למטרות מידע כללי בלבד ואינו מחייב. הפנייה למוסד לביטוח לאומי ולגופים המוסמכים יכולה להיעשות על ידך באופן עצמאי וללא תשלום.",
    "footer.legal_notice_title": "לידיעתך:",
    "footer.legal_notice_text":
      "הפנייה למוסד לביטוח לאומי ולגופים המוסמכים יכולה להיעשות על ידך באופן עצמאי וללא תשלום. השירות בחברה כרוך בתשלום כמפורט בהסכם ההתקשרות.",

    // Admin - Export
    "admin.export_case_package": "הורד תיק מלא (ZIP)",
    "admin.export_case_package_short": "הורד תיק",
    "admin.export_alert_title": "הורדת תיק מלא עבור",
    "admin.export_alert_contents": "התיק כולל",
    "admin.export_intake_summary": "סיכום שיחת Intake (PDF)",
    "admin.export_medical_docs": "מסמכים רפואיים",
    "admin.export_signed_consent": "טופס הסכמה חתום",
    "admin.export_metadata": "מטא-דאטה (JSON)",

    // Admin - Team Management
    "admin.team.title": "ניהול צוות והרשאות",
    "admin.team.subtitle": "הגדרת הרשאות וניהול גישות לצוות",
    "admin.team.invite_member": "הוסף חבר צוות",
    "admin.team.add_new_member": "הוספת חבר צוות חדש",
    "admin.team.full_name": "שם מלא",
    "admin.team.email": "אימייל",
    "admin.team.role": "תפקיד",
    "admin.team.cancel": "ביטול",
    "admin.team.send_invitation": "שלח הזמנה",
    "admin.team.permissions_matrix": "מטריצת הרשאות לפי תפקידים",
    "admin.team.team_members_list": "רשימת חברי צוות",
    "admin.team.name": "שם",
    "admin.team.last_login": "כניסה אחרונה",
    "admin.team.status": "סטטוס",
    "admin.team.actions": "פעולות",
    "admin.team.audit_log": "לוג ביקורות",
    "admin.team.no_access": "ללא גישה",
    "admin.team.full_access": "גישה מלאה",
    "admin.team.medical_data_protection": "הגנה על מידע רפואי",
    "admin.team.sales_medical_restriction": "נציגי מכירות אינם יכולים לגשת למידע רפואי מסיבות פרטיות ותקנות GDPR",

    // Value Reveal Page
    "value_reveal.analysis_complete": "ניתוח התיק הושלם",
    "value_reveal.potential_title": "על בסיס הנתונים שמסרת, זה הפוטנציאל שלך:",
    "value_reveal.retroactive_payment": "החזר רטרואקטיבי משוער",
    "value_reveal.monthly_allowance": "קצבה חודשית",
    "value_reveal.degree_funding": "מימון תואר מלא",
    "value_reveal.student_living": "דמי מחיה לסטודנט",
    "value_reveal.student_living_amount": "~₪2,800/חודש",
    "value_reveal.tax_exemption": "פטור ממס הכנסה",
    "value_reveal.cta_button": "אני רוצה לממש את הזכאות שלי",
    "value_reveal.cta_subtitle": "מעבר לחתימה ופתיחת תיק",
    "value_reveal.disability_sections": "מבוסס על סעיפי ליקוי: 37, 32",

    // Work Injury Calculator
    "work_injury_calc.back": "חזרה",
    "work_injury_calc.detected": "תאונת עבודה זוהתה",
    "work_injury_calc.title": "זיהינו פוטנציאל לתביעת דמי פגיעה.",
    "work_injury_calc.subtitle": "בתאונות עבודה, הפיצוי נגזר מהשכר שלך. בוא נחשב את זה.",
    "work_injury_calc.calculator_title": "מחשבון פיצוי",
    "work_injury_calc.salary_label": "שכר ברוטו ממוצע (3 חודשים אחרונים)",
    "work_injury_calc.salary_placeholder": "הכנס סכום",
    "work_injury_calc.estimate_note": " החישוב הוא הערכה בלבד ואינו מחייב",
    "work_injury_calc.daily_value": "שווי יום פגיעה",
    "work_injury_calc.calculated_by_salary": "מחושב לפי השכר הממוצע",
    "work_injury_calc.disability_grant": "מענק נכות מוערך",
    "work_injury_calc.estimate_50_percent": "הערכה לפי 50% נכות",
    "work_injury_calc.disclaimer":
      "*הסכומים המוצגים הינם אומדן בלבד והם מבוססים על נתונים שמסרת ועל פרמטרים כלליים. הסכומים הסופיים יקבעו על ידי הגורמים המוסמכים בהתאם לנתונים המלאים והדויקים של התיק, ועשויים להיות שונים מהאומדן המוצג כאן.",
    "work_injury_calc.why_continue": "למה להמשיך איתנו?",
    "work_injury_calc.vip_treatment": "טיפול VIP",
    "work_injury_calc.vip_description": "ליווי צמוד לאורך כל התהליך",
    "work_injury_calc.save_bureaucracy": "חיסכון בירוקרטיה",
    "work_injury_calc.save_description": "אנחנו דואגים לכל הטפסים",
    "work_injury_calc.free_expert": "בדיקת מומחה חינם",
    "work_injury_calc.free_description": "ניתוח מקצועי של התיק שלך",
    "work_injury_calc.continue_button": "שמור נתונים והמשך להעלאת מסמכים ←",
    "work_injury_calc.secure_note": "הנתונים שמורים באופן מוצפן ומאובטח",

    // Payment Details
    "payment_details.back_to_dashboard": "חזרה לדשבורד",
    "payment_details.title": "פרטי תשלום ומידע אישי",
    "payment_details.subtitle": "מידע חיוני הנדרש לטופס 7801 של ביטוח לאומי",
    "payment_details.secure": "מאובטח ומוצפן",
    "payment_details.secure_description": "כל הפרטים שלך מאוחסנים בצורה מוצפנת בהתאם לתקנות ההגנה על הפרטיות",
    "payment_details.bank_title": "לאן להעביר את הכסף?",
    "payment_details.bank_subtitle": "חשבון זה ישמש לקבלת הקצבה מביטוח לאומי",
    "payment_details.bank_name": "שם הבנק",
    "payment_details.select_bank": "בחר בנק",
    "payment_details.branch_number": "מספר סניף",
    "payment_details.branch_placeholder": "לדוגמה: 123",
    "payment_details.account_number": "מספר חשבון",
    "payment_details.account_placeholder": "לדוגמה: 123456",
    "payment_details.bank_confirmation": "אני מצהיר/ה כי חשבון הבנק רשום על שמי",
    "payment_details.bank_confirmation_detail": "(בעלים או שותף בחשבון)",
    "payment_details.bank_warning": "אזהרה:",
    "payment_details.bank_warning_text": "ביטוח לאומי לא מעביר תשלומים לחשבון שאינו על שם התובע.",
    "payment_details.bank_important": "חשוב:",
    "payment_details.bank_important_text": "חשבון זה חייב להיות על שמך",
    "payment_details.hmo_title": "פרטי מטפלים",
    "payment_details.hmo_subtitle": "קופת חולים ורופא מטפל",
    "payment_details.hmo_label": "קופת חולים",
    "payment_details.select_hmo": "בחר קופת חולים",
    "payment_details.doctor_name": "שם הרופא המטפל",
    "payment_details.doctor_placeholder": "שם מלא של הרופא המטפל שלך",
    "payment_details.contact_title": "פרטי קשר",
    "payment_details.contact_subtitle": "למשלוח דואר רשמי",
    "payment_details.address_label": "כתובת מגורים עדכנית",
    "payment_details.address_placeholder": "רחוב, מספר בית, עיר, מיקוד",
    "payment_details.address_note": "כתובת זו תשמש למשלוח מסמכים רשמיים מביטוח לאומי",
    "payment_details.submit_button": "שמור ועדכן את הטופס",
    "payment_details.footer_note": "פרטים אלו נדרשים לצורך מילוי טופס 7801 של ביטוח לאומי ויישמרו בצורה מאובטחת",

    // Legal Review
    "legal_review.title": "סקירת טופס 7801",
    "legal_review.subtitle": "בקשה לקצבת נכות כללית - ביטוח לאומי",
    "legal_review.ai_extraction_title": "חילוץ נתונים אוטומטי הושלם",
    "legal_review.ai_extraction_subtitle":
      "סרקנו את המסמכים שלך וחילצנו את כל הנתונים הנדרשים לטופס 7801. נא לאמת את המידע.",
    "legal_review.documents_scanned": "מסמכים שנסרקו",
    "legal_review.fields_extracted": "שדות שחולצו",
    "legal_review.ai_accuracy": "דיוק AI",
    "legal_review.section_personal": "חלק 1: פרטי התובע",
    "legal_review.section_personal_subtitle": "מידע אישי ופרטי קשר",
    "legal_review.edit": "ערוך",
    "legal_review.finish_editing": "סיים עריכה",
    "legal_review.confirm_details": "אני מאשר שהפרטים נכונים",
    "legal_review.details_confirmed": "פרטים אושרו",

    // Questionnaire Translations
    "questionnaire.question1": "האם המצב הרפואי מגביל את עבודתך?",
    "questionnaire.question2": "האם קיבלת טיפול רפואי בשנה האחרונה?",
    "questionnaire.question3": "האם יש לך ביטוח בריאות פרטי?",

    // Medical Docs Translations
    "medical_docs.upload_title": "יש לך מסמכים רפואיים? העלה אותם עכשיו",
    "medical_docs.value_proposition": "ככל שיש לנו יותר מידע רפואי - הפיצוי שלך יכול להיות גבוה יותר",
    "medical_docs.whats_next": "מה קורה אחרי זה?",
    "medical_docs.ai_call_intro":
      "שיחה אישית עם עורכת הדין הדיגיטלית שלנו - היא תשאל אותך כמה שאלות ממוקדות על המצב הרפואי, התסמינים, והמגבלות שלך.",
    "medical_docs.why_call_title": "למה צריך את השיחה?",
    "medical_docs.why_call_desc": "כדי להבין את המצב המלא שלך ולזהות כל זכות שמגיעה לך",
    "medical_docs.call_duration_title": "כמה זמן זה לוקח?",
    "medical_docs.call_duration_desc": "בין 3-7 דקות בממוצע - תלוי במורכבות המצב",
    "medical_docs.how_to_prepare_title": "איך להתכונן?",
    "medical_docs.how_to_prepare_desc": "פשוט ענה בכנות על השאלות - אין תשובות נכונות או לא נכונות",
    "medical_docs.call_importance": "זה רגע חשוב - כאן ה-AI מחשב את הפיצוי המדויק שמגיע לך",

    // Extension / Personal Agent translations
    // Extension Onboarding
    "extension.onboarding.headline": "צעד אחרון: תן ל-AI לעבוד בשבילך",
    "extension.onboarding.auto_sync": "הגשת מסמכים אוטומטית לביטוח לאומי",
    "extension.onboarding.track_payments": "מעקב אחר סטטוס התיק בזמן אמת",
    "extension.onboarding.no_faxes": "אין צורך בפקסים או נסיעות",
    "extension.onboarding.mobile_warning": "האוטומציה עובדת רק במחשב. שלח לעצמך תזכורת.",
    "extension.onboarding.send_email": "שלח לי לינק למייל",
    "extension.onboarding.continue_without": "המשך ללא אוטומציה",
    "extension.onboarding.install_button": "התקן את הסוכן (חנות כروم)",
    "extension.onboarding.skip_button": "דלג וכנס למערכת",
    "extension.onboarding.email_sent": "נשלח! בדוק את המייל שלך",

    // Extension Sync Widget
    "extension.widget.not_installed": "הסוכן לא פעיל. התקן עכשיו לחסכון בזמן.",
    "extension.widget.install": "התקן",
    "extension.widget.stale_title": "נדרש עדכון סטטוס",
    "extension.widget.stale_subtitle": "לחץ כאן לעדכון",
    "extension.widget.syncing": "מסנכרן נתונים...",
    "extension.widget.fresh": "מסונכרן (היום)",
    "extension.widget.last_update": "עדכון אחרון",

    // Extension Document Banner
    "extension.banner.title": "הגשה אוטומטית לביטוח לאומי",
    "extension.banner.subtitle": "הסוכן יגיש את כל המסמכים שלך לביטוח לאומי ויעדכן אותך בזמן אמת על סטטוס התיק.",
    "extension.banner.button": "הפעל הגשה אוטומטית",

    // Pre-Intake Wizard translations
    // Wizard Step 1: User Status
    "wizard.step1.title": "מי אתה?",
    "wizard.step1.subtitle": "בחר את הסטטוס שמתאים לך",
    "wizard.step1.employee": "עובד שכיר",
    "wizard.step1.student": "סטודנט",
    "wizard.step1.soldier_active": "חייל בשירות סדיר",
    "wizard.step1.soldier_reserve": "חייל מילואים",
    "wizard.step1.pensioner": "גמלאי",

    // Wizard Step 2: Claim Reason
    "wizard.step2.title": "מה סיבת התביעה?",
    "wizard.step2.subtitle": "בחר את הסיבה המרכזית",
    "wizard.step2.accident": "תאונה",
    "wizard.step2.illness": "מחלה כרונית",
    "wizard.step2.adhd": "ADHD / ליקויי למידה",
    "wizard.step2.service_injury": "פציעה בשירות צבאי",
    "wizard.step2.hostile_action": "פגוע בפעולה איבה",

    // Wizard Step 3: Work Related
    "wizard.step3.title": "האם זה קשור לעבודה?",
    "wizard.step3.subtitle": "האם האירוע או המחלה קרו במהלך העבודה או בגללה?",
    "wizard.step3.yes": "כן, קשור לעבודה",
    "wizard.step3.no": "לא, לא קשור לעבודה",

    // Wizard Step 4: Income Bracket
    "wizard.step4.title": "מה רמת ההכנסה שלך?",
    "wizard.step4.subtitle": "זה עוזר לנו להבין איזה סוג תמיכה מתאים לך",
    "wizard.step4.low": "עד 7,500 ₪ לחודש",
    "wizard.step4.high": "מעל 7,500 ₪ לחודש",

    // Wizard Step 5: Functional Impacts
    "wizard.step5.title": "מה מגביל אותך?",
    "wizard.step5.subtitle": "בחר את כל התחומים שהמצב הרפואי מגביל אותך בהם",
    "wizard.step5.concentration": "קשיי ריכוז וקשב",
    "wizard.step5.memory": "קשיי זיכרון",
    "wizard.step5.organization": "קושי בארגון וניהול זמן",
    "wizard.step5.social": "קשיים חברתיים",
    "wizard.step5.mobility": "ניידות (הליכה, עמידה)",
    "wizard.step5.sheram": "שרות (שירותים אישיים)",
    "wizard.step5.vision": "ראייה",
    "wizard.step5.hearing": "שמיעה",
    "wizard.step5.mental": "בריאות הנפש",
    "wizard.step5.chronic_pain": "כאב כרוני",
    "wizard.step5.none_selected": "לא בחרת אף אחד",

    // Wizard Step 6: Documents Ready
    "wizard.step6.title": "יש לך מסמכים רפואיים מוכנים?",
    "wizard.step6.subtitle": "ככל שיש לך יותר מסמכים, התהליך יהיה מהיר ומדויק יותר",
    "wizard.step6.yes": "כן, יש לי מסמכים",
    "wizard.step6.no": "לא, אין לי עדיין",

    // Wizard Navigation
    "wizard.back": "חזרה",
    "wizard.next": "המשך",
    "wizard.complete": "התחל שיחה עם AI",
    "wizard.progress": "שלב {current} מתוך {total}",

    // Waiting for Response translations
    "waiting.title": "התביעה הוגשה בהצלחה!",
    "waiting.subtitle_pending": "התיק שלך נמצא כעת בבדיקת המוסד לביטוח לאומי. נעדכן אותך מיד כשנקבע תאריך לוועדה.",
    "waiting.subtitle_scheduled": "התיק שלך בבדיקה. נקבע תאריך לוועדה רפואית - ראה פרטים למטה.",
    "waiting.committee_scheduled": "נקבע תאריך לוועדה רפואית!",
    "waiting.committee_date": "הוועדה הרפואית תתקיים ב",
    "waiting.committee_time": "בשעה",
    "waiting.location": "מיקום:",
    "waiting.zoom_meeting": "פגישת זום",
    "waiting.zoom_link_note": "הלינק יישלח אליך ביום הפגישה",
    "waiting.start_prep": "התחל הכנה לוועדה עכשיו",
    "waiting.add_to_calendar": "הוסף ליומן",
    "waiting.status_awaiting": "ממתינים לקביעת תאריך וועדה",
    "waiting.status_scheduled": "ממתין לוועדה רפואית",
    "waiting.status_reviewing": "בבדיקה ראשונית",
    "waiting.pending_message":
      "ביטוח לאומי בוחן את המסמכים שלך. בדרך כלל לוקח 3-6 שבועות עד לקביעת תאריך לוועדה רפואית. נעדכן אותך מיד כשיהיה עדכון.",
    "waiting.prep_early": "בינתיים, תוכל להתכונן מראש לוועדה באמצעות הסימולטור שלנו",

    // Not Eligible Screen Translations
    "not_eligible.title": "אנו מצטערים",
    "not_eligible.message":
      "תודה שהקדשת זמן לשתף את הסיפור שלך איתנו. על סמך המידע שנמסר, התיק שלך אינו עונה כרגע על הקריטריונים להגשת תביעה לביטוח לאומי או משרד הביטחון.",
    "not_eligible.reasons_title": "סיבות אפשריות:",
    "not_eligible.reason_functional": "המגבלה התפקודית אינה עומדת בסף הנדרש",
    "not_eligible.reason_documentation": "חסר תיעוד רפואי מספיק",
    "not_eligible.reason_period": "הפגיעה לא נכנסת להגדרת תביעה מוכרת",
    "not_eligible.what_you_can_do": "מה אפשר לעשות:",
    "not_eligible.step_medical_title": "התייעץ עם רופא מומחה",
    "not_eligible.step_medical_desc": "קבל אבחון מפורט יותר וחוות דעת רפואית",
    "not_eligible.step_documents_title": "אסוף תיעוד רפואי נוסף",
    "not_eligible.step_documents_desc": "צילומי MRI, בדיקות דם, תיעוד טיפולים",
    "not_eligible.step_contact_title": "פנה אלינו לשיחת הבהרה",
    "not_eligible.step_contact_desc": "נשמח לעזור ולהסביר את האפשרויות העומדות בפניך",
    "not_eligible.contact_support": "צור קשר עם התמיכה",
    "not_eligible.return_home": "חזור לדף הבית",
    "not_eligible.footer_note": "אם אתה סבור שקיבלת החלטה זו בטעות, אנא צור איתנו קשר לבדיקה נוספת.",

    // Claim Approved (updated)
    "claim_approved.title": "אושרה נכות",
    "claim_approved.disability_percent": "אושרה נכות של {percent}%",
    "claim_approved.important_note": "שים לב: זה אישור נכות בלבד",
    "claim_approved.no_money_yet": "בשלב זה עדיין לא תקבל כסף. כדי לקבל תשלומים, צריך גם אישור שיקום מקצועי.",
    "claim_approved.what_is_rehab": "מה זה שיקום מקצועי?",
    "claim_approved.rehab_benefits": "במסגרת שיקום מקצועי תוכל לקבל:",
    "claim_approved.benefit_tuition": "מימון מלא או חלקי של שכר לימוד (בהתאם לזכאות)",
    "claim_approved.benefit_living": "דמי מחיה חודשיים (הסכום ייקבע לפי הזכאות)",
    "claim_approved.benefit_travel": "החזר הוצאות נסיעות",
    "claim_approved.benefit_equipment": "מימון ציוד לימודים",
    "claim_approved.amounts_disclaimer": "הסכומים הסופיים ייקבעו על ידי ביטוח לאומי לפי המצב האישי שלך",
    "claim_approved.next_step": "השלב הבא",
    "claim_approved.submit_rehab": "הגשת בקשה לשיקום מקצועי",
    "claim_approved.continue_button": "המשך להגשת בקשת שיקום",

    // Rehab Approved (new)
    "rehab_approved.title": "מזל טוב! אושר דמי השיקום!",
    "rehab_approved.subtitle": "ביטוח לאומי אישר את בקשתך לשיקום מקצועי. עכשיו תוכל להתחיל לקבל תשלומים.",
    "rehab_approved.eligible_title": "במסגרת השיקום תוכל להיות זכאי ל:",
    "rehab_approved.benefit_tuition": "מימון שכר לימוד",
    "rehab_approved.benefit_tuition_desc": "בהתאם למוסד הלימוד והתכנית",
    "rehab_approved.benefit_living": "דמי מחיה חודשיים",
    "rehab_approved.benefit_living_desc": "הסכום ייקבע לפי הזכאות",
    "rehab_approved.benefit_travel": "החזר הוצאות נסיעות",
    "rehab_approved.benefit_rent": "החזר דמי שכירות",
    "rehab_approved.benefit_rent_desc": "במרחק 40 ק״מ+",
    "rehab_approved.amounts_warning": "הסכומים המדויקים ייקבעו על ידי ביטוח לאומי",
    "rehab_approved.amounts_warning_desc": "לפי סוג הלימודים, מוסד הלימוד, ומצבך האישי.",
    "rehab_approved.next_steps_title": "כדי להתחיל לקבל תשלומים:",
    "rehab_approved.step1": "חתום על מערכת שעות לימוד",
    "rehab_approved.step2": "שלח אישורים לעובדת הסוציאלית",
    "rehab_approved.step3": "דווח נוכחות אחת לסמסטר",
    "rehab_approved.continue_button": "המשך לחתימה על נהלים",

    // Rehab Claims (updated)
    "rehab_claims.warning_title": "חשוב",
    "rehab_claims.warning_text": "המסך הזה רלוונטי רק אחרי קבלת אישור דמי השיקום מביטוח לאומי.",
    "rehab_claims.rent_section": "חוזה שכירות (אם רלוונטי)",
    "rehab_claims.rent_eligibility": "אם אתה גר 40 ק״מ ומעלה ממקום הלימודים, תהיה זכאי להחזר דמי שכירות",
    "rehab_claims.distance_label": "מרחק מהאוניברסיטה",
    "rehab_claims.distance_less": "פחות מ-40 ק״מ",
    "rehab_claims.distance_more": "40 ק״מ ומעלה",
    "rehab_claims.rent_contract": "חוזה שכירות",
    "rehab_claims.rent_payment_proof": "הוכחת תשלום (צ׳קים/העברה בנקאית)",
    "rehab_claims.upload": "העלה",
  },
  en: {
    // Header
    "header.personal_area": "Personal Area",
    "header.company_name": "ZeroTouch",

    // Hero
    "hero.title": "Your Compensation. Maximized.",
    "hero.subtitle": "AI-powered system that replaces traditional legal services.",
    "hero.cta": "Check Eligibility",
    "hero.legal_notice":
      "Please note: You may contact the National Insurance Institute and authorized agencies independently at no cost. Our service involves fees as detailed in the service agreement.",

    // OTP Phone
    "otp.phone.title": "Let's Get Started",
    "otp.phone.subtitle": "Enter your phone number to receive a verification code",
    "otp.phone.send_code": "Send Code",
    "otp.phone.secure_connection": "Secure Connection",

    // OTP Code
    "otp.code.title": "Enter Verification Code",
    "otp.code.subtitle": "We sent a 4-digit code to",
    "otp.code.resend_code": "Resend Code",

    // OTP Success
    "otp.success.title": "Verified Successfully!",
    "otp.success.subtitle": "Preparing your questionnaire...",

    // OTP Questions
    "otp.questions.question_number": "Question",
    "otp.questions.of": "of",
    "otp.questions.yes": "Yes",
    "otp.questions.no": "No",

    // Login Modal
    "login.title": "Login to System",
    "login.existing_user": "Existing User",
    "login.existing_user_desc": "Return to my case",
    "login.admin": "System Admin",
    "login.admin_desc": "Admin Dashboard",
    "login.subadmin": "Team Member",
    "login.subadmin_desc": "SubAdmin Dashboard",
    "login.subtitle": "Enter your phone number to receive a verification code",
    "login.send_code": "Send Code",
    "login.secure_connection": "Secure Connection",

    // How It Works
    "how_it_works.title": "How Does It Work?",
    "how_it_works.subtitle": "3 simple steps to claim your benefits",
    "how_it_works.check_eligibility": "Check Eligibility",
    "how_it_works.check_eligibility_description":
      "A 2-minute smart questionnaire that identifies your eligible benefits",
    "how_it_works.ai_legal_consultant": "AI Legal Consultation",
    "how_it_works.ai_legal_consultant_description": "Virtual consultation with a digital attorney",
    "how_it_works.compensation": "Receive Compensation",

    // Statistics
    "stats.title": "Numbers That Speak for Themselves",
    "stats.subtitle": "Proven results that demonstrate our impact",
    "stats.happy_clients": "Satisfied Clients",
    "stats.average_compensation": "Average Compensation",
    "stats.check_time": "Assessment Time",
    "stats.success_rate": "Success Rate",
    "stats.time_unit": "minutes",

    // Benefits
    "benefits.title": "Why Choose ZeroTouch?",
    "benefits.subtitle": "Our advantages over traditional legal representation",
    "benefits.speed": "Speed",
    "benefits.speed_description": "Digital process completed in days, not months",
    "benefits.cost": "Affordable Pricing",
    "benefits.cost_description": "Transparent pricing with no hidden fees",
    "benefits.availability": "24/7 Availability",
    "benefits.availability_description": "Access our platform anytime, anywhere",
    "benefits.transparency": "Full Transparency",
    "benefits.transparency_description": "Real-time updates on your case status",

    // CTA
    "cta.title": "Ready to Get Started?",
    "cta.subtitle": "Check your eligibility now—it takes just 2 minutes",
    "cta.button": "Start Free Assessment",

    // Footer
    "footer.brand_description": "Medical benefits maximization powered by AI. Fast, accurate, and hassle-free.",
    "footer.quick_links": "Quick Links",
    "footer.free_check": "Free Eligibility Check",
    "footer.personal_area": "Personal Area / Login",
    "footer.faq": "FAQ",
    "footer.about": "About Us",
    "footer.contact_support": "Contact & Support",
    "footer.whatsapp": "WhatsApp: Live Chat (9 AM - 6 PM)",
    "footer.email": "Email: support@zerotouch.co.il",
    "footer.address": "Address: 4 Tuval Street, Tel Aviv",
    "footer.accessibility": "Accessibility Statement",
    "footer.trust_security": "Trust & Security",
    "footer.ssl_secured": "SSL Secured",
    "footer.terms": "Terms of Service",
    "footer.privacy": "Privacy Policy",
    "footer.refunds": "Refund Policy",
    "footer.copyright": "© 2025 ZeroTouch Ltd. All rights reserved.",
    "footer.disclaimer":
      "ZeroTouch is a technology platform for information management and self-service claims assistance. The service does not constitute legal advice and does not replace an attorney. Information on the site is for general informational purposes only and is not legally binding. You may contact the National Insurance Institute and authorized agencies independently at no cost.",
    "footer.legal_notice_title": "Important Notice:",
    "footer.legal_notice_text":
      "You may contact the National Insurance Institute and authorized agencies independently at no cost. Our service involves fees as detailed in the service agreement.",

    // Admin - Export
    "admin.export_case_package": "Download Full Case (ZIP)",
    "admin.export_case_package_short": "Download Case",
    "admin.export_alert_title": "Downloading full case for",
    "admin.export_alert_contents": "Case includes",
    "admin.export_intake_summary": "Intake Summary (PDF)",
    "admin.export_medical_docs": "Medical Documents",
    "admin.export_signed_consent": "Signed Consent Form",
    "admin.export_metadata": "Metadata (JSON)",

    // Admin - Team Management
    "admin.team.title": "Team & Access Control",
    "admin.team.subtitle": "Configure permissions and manage team access",
    "admin.team.invite_member": "Invite Member",
    "admin.team.add_new_member": "Add New Team Member",
    "admin.team.full_name": "Full Name",
    "admin.team.email": "Email",
    "admin.team.role": "Role",
    "admin.team.cancel": "Cancel",
    "admin.team.send_invitation": "Send Invitation",
    "admin.team.permissions_matrix": "Permissions Matrix by Role",
    "admin.team.team_members_list": "Team Members List",
    "admin.team.name": "Name",
    "admin.team.last_login": "Last Login",
    "admin.team.status": "Status",
    "admin.team.actions": "Actions",
    "admin.team.audit_log": "Audit Log",
    "admin.team.no_access": "No Access",
    "admin.team.full_access": "Full Access",
    "admin.team.medical_data_protection": "Medical Data Protection",
    "admin.team.sales_medical_restriction":
      "Sales representatives cannot access medical information for privacy and GDPR compliance",

    // Value Reveal Page
    "value_reveal.analysis_complete": "Case Analysis Complete",
    "value_reveal.potential_title": "Based on the information you provided, here's your potential:",
    "value_reveal.retroactive_payment": "Estimated Retroactive Payment",
    "value_reveal.monthly_allowance": "Monthly Allowance",
    "value_reveal.degree_funding": "Full Degree Funding",
    "value_reveal.student_living": "Student Living Expenses",
    "value_reveal.student_living_amount": "~₪2,800/month",
    "value_reveal.tax_exemption": "Income Tax Exemption",
    "value_reveal.cta_button": "I Want to Claim My Benefits",
    "value_reveal.cta_subtitle": "Proceed to signature and case opening",
    "value_reveal.disability_sections": "Based on disability sections: 37, 32",

    // Work Injury Calculator
    "work_injury_calc.back": "Back",
    "work_injury_calc.detected": "Work Injury Detected",
    "work_injury_calc.title": "We identified potential for injury compensation claim.",
    "work_injury_calc.subtitle": "For work injuries, compensation is derived from your salary. Let's calculate it.",
    "work_injury_calc.calculator_title": "Compensation Calculator",
    "work_injury_calc.salary_label": "Average Gross Salary (Last 3 months)",
    "work_injury_calc.salary_placeholder": "Enter amount",
    "work_injury_calc.estimate_note": "This calculation is an estimate only and is not binding",
    "work_injury_calc.daily_value": "Daily Injury Value",
    "work_injury_calc.calculated_by_salary": "Calculated based on average salary",
    "work_injury_calc.disability_grant": "Estimated Disability Grant",
    "work_injury_calc.estimate_50_percent": "Estimate based on 50% disability",
    "work_injury_calc.disclaimer":
      "*The amounts shown are estimates only and are based on the information you provided and general parameters. Final amounts will be determined by the authorized authorities based on complete and accurate case information, and may differ from the estimate shown here.",
    "work_injury_calc.why_continue": "Why Continue With Us?",
    "work_injury_calc.vip_treatment": "VIP Treatment",
    "work_injury_calc.vip_description": "Close accompaniment throughout the entire process",
    "work_injury_calc.save_bureaucracy": "Save Bureaucracy",
    "work_injury_calc.save_description": "We handle all the forms",
    "work_injury_calc.free_expert": "Free Expert Review",
    "work_injury_calc.free_description": "Professional analysis of your case",
    "work_injury_calc.continue_button": "Save Data and Continue to Document Upload →",
    "work_injury_calc.secure_note": "Data is stored encrypted and secure",

    // Payment Details
    "payment_details.back_to_dashboard": "Back to Dashboard",
    "payment_details.title": "Payment & Personal Details",
    "payment_details.subtitle": "Essential information required for National Insurance form 7801",
    "payment_details.secure": "Secure & Encrypted",
    "payment_details.secure_description":
      "All your details are stored encrypted in accordance with privacy protection regulations",
    "payment_details.bank_title": "Where Should We Send the Money?",
    "payment_details.bank_subtitle": "This account will be used to receive benefits from National Insurance",
    "payment_details.bank_name": "Bank Name",
    "payment_details.select_bank": "Select Bank",
    "payment_details.branch_number": "Branch Number",
    "payment_details.branch_placeholder": "Example: 123",
    "payment_details.account_number": "Account Number",
    "payment_details.account_placeholder": "Example: 123456",
    "payment_details.bank_confirmation": "I declare that the bank account is registered in my name",
    "payment_details.bank_confirmation_detail": "(owner or account partner)",
    "payment_details.bank_warning": "Warning:",
    "payment_details.bank_warning_text":
      "National Insurance does not transfer payments to accounts not in the claimant's name.",
    "payment_details.bank_important": "Important:",
    "payment_details.bank_important_text": "This account must be in your name",
    "payment_details.hmo_title": "Healthcare Provider Details",
    "payment_details.hmo_subtitle": "Health insurance fund and treating physician",
    "payment_details.hmo_label": "Health Insurance Fund",
    "payment_details.select_hmo": "Select Health Fund",
    "payment_details.doctor_name": "Treating Physician Name",
    "payment_details.doctor_placeholder": "Full name of your treating physician",
    "payment_details.contact_title": "Contact Details",
    "payment_details.contact_subtitle": "For official mail delivery",
    "payment_details.address_label": "Current Residential Address",
    "payment_details.address_placeholder": "Street, house number, city, postal code",
    "payment_details.address_note": "This address will be used for sending official documents from National Insurance",
    "payment_details.submit_button": "Save and Update Form",
    "payment_details.footer_note":
      "These details are required for completing National Insurance form 7801 and will be stored securely",

    // Legal Review
    "legal_review.title": "Form 7801 Review",
    "legal_review.subtitle": "General Disability Allowance Application - National Insurance",
    "legal_review.ai_extraction_title": "Automatic Data Extraction Completed",
    "legal_review.ai_extraction_subtitle":
      "We scanned your documents and extracted all required data for form 7801. Please verify the information.",
    "legal_review.documents_scanned": "Documents Scanned",
    "legal_review.fields_extracted": "Fields Extracted",
    "legal_review.ai_accuracy": "AI Accuracy",
    "legal_review.section_personal": "Section 1: Claimant Details",
    "legal_review.section_personal_subtitle": "Personal information and contact details",
    "legal_review.edit": "Edit",
    "legal_review.finish_editing": "Finish Editing",
    "legal_review.confirm_details": "I confirm the details are correct",
    "legal_review.details_confirmed": "Details Confirmed",

    // Questionnaire Translations
    "questionnaire.question1": "Does your medical condition limit your ability to work?",
    "questionnaire.question2": "Have you received medical treatment in the past year?",
    "questionnaire.question3": "Do you have private health insurance?",

    // Medical Docs Translations
    "medical_docs.upload_title": "Do you have medical documents? Upload them now",
    "medical_docs.value_proposition": "The more medical information we have - the higher your compensation can be",
    "medical_docs.whats_next": "What happens next?",
    "medical_docs.ai_call_intro":
      "A personal call with our digital attorney - she will ask you a few focused questions about your medical condition, symptoms, and limitations.",
    "medical_docs.why_call_title": "Why do I need this call?",
    "medical_docs.why_call_desc": "To understand your full situation and identify every benefit you're entitled to",
    "medical_docs.call_duration_title": "How long does it take?",
    "medical_docs.call_duration_desc": "Between 3-7 minutes on average - depends on case complexity",
    "medical_docs.how_to_prepare_title": "How should I prepare?",
    "medical_docs.how_to_prepare_desc": "Simply answer honestly - there are no right or wrong answers",
    "medical_docs.call_importance":
      "This is an important moment - here the AI calculates the exact compensation you deserve",

    // Extension / Personal Agent translations
    // Extension Onboarding
    "extension.onboarding.headline": "Final Step: Let AI work for you",
    "extension.onboarding.auto_sync": "Auto-submit documents to National Insurance",
    "extension.onboarding.track_payments": "Real-time case status tracking",
    "extension.onboarding.no_faxes": "No faxes or office visits needed",
    "extension.onboarding.mobile_warning": "Automation requires a Desktop. Send yourself a reminder.",
    "extension.onboarding.send_email": "Email me the link",
    "extension.onboarding.continue_without": "Continue without automation",
    "extension.onboarding.install_button": "Install Agent (Chrome Store)",
    "extension.onboarding.skip_button": "Skip to Dashboard",
    "extension.onboarding.email_sent": "Sent! Check your email",

    // Extension Sync Widget
    "extension.widget.not_installed": "Agent inactive. Install now to save time.",
    "extension.widget.install": "Install",
    "extension.widget.stale_title": "Status Update Required",
    "extension.widget.stale_subtitle": "Click here to update",
    "extension.widget.syncing": "Syncing data...",
    "extension.widget.fresh": "Synced (Today)",
    "extension.widget.last_update": "Last update",

    // Extension Document Banner
    "extension.banner.title": "Auto-Submit to National Insurance",
    "extension.banner.subtitle":
      "The Agent will submit all your documents to National Insurance and keep you updated in real-time.",
    "extension.banner.button": "Enable Auto-Submit",

    // Pre-Intake Wizard translations for English
    // Wizard Step 1: User Status
    "wizard.step1.title": "Who are you?",
    "wizard.step1.subtitle": "Select your status",
    "wizard.step1.employee": "Employee",
    "wizard.step1.student": "Student",
    "wizard.step1.soldier_active": "Active Duty Soldier",
    "wizard.step1.soldier_reserve": "Reserve Soldier",
    "wizard.step1.pensioner": "Retiree",

    // Wizard Step 2: Claim Reason
    "wizard.step2.title": "What's the reason for your claim?",
    "wizard.step2.subtitle": "Choose the main reason",
    "wizard.step2.accident": "Accident",
    "wizard.step2.illness": "Chronic Illness",
    "wizard.step2.adhd": "ADHD / Learning Disabilities",
    "wizard.step2.service_injury": "Service-Related Injury",
    "wizard.step2.hostile_action": "Hostilities Victim",

    // Wizard Step 3: Work Related
    "wizard.step3.title": "Is this work-related?",
    "wizard.step3.subtitle": "Did the incident or illness occur during or because of work?",
    "wizard.step3.yes": "Yes, work-related",
    "wizard.step3.no": "No, not work-related",

    // Wizard Step 4: Income Bracket
    "wizard.step4.title": "What's your income level?",
    "wizard.step4.subtitle": "This helps us understand which type of support suits you",
    "wizard.step4.low": "Up to ₪7,500 per month",
    "wizard.step4.high": "Over ₪7,500 per month",

    // Wizard Step 5: Functional Impacts
    "wizard.step5.title": "What limits you?",
    "wizard.step5.subtitle": "Select all areas where your medical condition limits you",
    "wizard.step5.concentration": "Concentration and attention difficulties",
    "wizard.step5.memory": "Memory difficulties",
    "wizard.step5.organization": "Organization and time management issues",
    "wizard.step5.social": "Social difficulties",
    "wizard.step5.mobility": "Mobility (walking, standing)",
    "wizard.step5.sheram": "Personal services",
    "wizard.step5.vision": "Vision",
    "wizard.step5.hearing": "Hearing",
    "wizard.step5.mental": "Mental health",
    "wizard.step5.chronic_pain": "Chronic pain",
    "wizard.step5.none_selected": "You haven't selected any",

    // Wizard Step 6: Documents Ready
    "wizard.step6.title": "Do you have medical documents ready?",
    "wizard.step6.subtitle": "The more documents you have, the faster and more accurate the process",
    "wizard.step6.yes": "Yes, I have documents",
    "wizard.step6.no": "No, not yet",

    // Wizard Navigation
    "wizard.back": "Back",
    "wizard.next": "Next",
    "wizard.complete": "Start AI Call",
    "wizard.progress": "Step {current} of {total}",

    // Waiting for Response translations in English
    "waiting.title": "Claim Submitted Successfully!",
    "waiting.subtitle_pending":
      "Your case is currently under review by the National Insurance Institute. We'll update you as soon as a committee date is scheduled.",
    "waiting.subtitle_scheduled":
      "Your case is under review. A medical committee date has been set - see details below.",
    "waiting.committee_scheduled": "Medical Committee Date Scheduled!",
    "waiting.committee_date": "The medical committee will take place on",
    "waiting.committee_time": "at",
    "waiting.location": "Location:",
    "waiting.zoom_meeting": "Zoom Meeting",
    "waiting.zoom_link_note": "Link will be sent to you on the meeting day",
    "waiting.start_prep": "Start Committee Prep Now",
    "waiting.add_to_calendar": "Add to Calendar",
    "waiting.status_awaiting": "Awaiting committee date",
    "waiting.status_scheduled": "Waiting for medical committee",
    "waiting.status_reviewing": "Under initial review",
    "waiting.pending_message":
      "National Insurance is reviewing your documents. It typically takes 3-6 weeks until a medical committee date is set. We'll update you immediately when there's news.",
    "waiting.prep_early": "In the meantime, you can prepare in advance for the committee using our simulator",

    // Not Eligible Screen Translations
    "not_eligible.title": "We're Sorry",
    "not_eligible.message":
      "Thank you for taking the time to share your story with us. Based on the information provided, your case does not currently meet the criteria for filing a claim with the National Insurance Institute or Ministry of Defense.",
    "not_eligible.reasons_title": "Possible Reasons:",
    "not_eligible.reason_functional": "Functional limitation does not meet the required threshold",
    "not_eligible.reason_documentation": "Insufficient medical documentation",
    "not_eligible.reason_period": "The injury does not fall under recognized claim definitions",
    "not_eligible.what_you_can_do": "What You Can Do:",
    "not_eligible.step_medical_title": "Consult with a specialist",
    "not_eligible.step_medical_desc": "Obtain a more detailed diagnosis and medical opinion",
    "not_eligible.step_documents_title": "Gather additional medical documentation",
    "not_eligible.step_documents_desc": "MRI scans, blood tests, treatment records",
    "not_eligible.step_contact_title": "Contact us for clarification",
    "not_eligible.step_contact_desc": "We're happy to help explain the options available to you",
    "not_eligible.contact_support": "Contact Support",
    "not_eligible.return_home": "Return to Homepage",
    "not_eligible.footer_note": "If you believe this decision was made in error, please contact us for further review.",

    // Claim Approved (updated)
    "claim_approved.title": "Disability Approved",
    "claim_approved.disability_percent": "Disability of {percent}% approved",
    "claim_approved.important_note": "Important note: This is disability approval only",
    "claim_approved.no_money_yet":
      "At this stage, you will not receive payments yet. To receive payments, vocational rehabilitation approval is also required.",
    "claim_approved.what_is_rehab": "What is vocational rehabilitation?",
    "claim_approved.rehab_benefits": "Through vocational rehabilitation you may receive:",
    "claim_approved.benefit_tuition": "Full or partial tuition funding (subject to eligibility)",
    "claim_approved.benefit_living": "Monthly living allowance (amount determined by eligibility)",
    "claim_approved.benefit_travel": "Travel expense reimbursement",
    "claim_approved.benefit_equipment": "Study equipment funding",
    "claim_approved.amounts_disclaimer":
      "Final amounts will be determined by National Insurance based on your personal situation",
    "claim_approved.next_step": "Next Step",
    "claim_approved.submit_rehab": "Submit vocational rehabilitation application",
    "claim_approved.continue_button": "Continue to rehabilitation application",

    // Rehab Approved (new)
    "rehab_approved.title": "Congratulations! Rehabilitation Approved!",
    "rehab_approved.subtitle":
      "National Insurance approved your vocational rehabilitation application. You can now start receiving payments.",
    "rehab_approved.eligible_title": "Through rehabilitation you may be eligible for:",
    "rehab_approved.benefit_tuition": "Tuition funding",
    "rehab_approved.benefit_tuition_desc": "According to institution and program",
    "rehab_approved.benefit_living": "Monthly living allowance",
    "rehab_approved.benefit_living_desc": "Amount determined by eligibility",
    "rehab_approved.benefit_travel": "Travel expense reimbursement",
    "rehab_approved.benefit_rent": "Rent reimbursement",
    "rehab_approved.benefit_rent_desc": "For 40+ km distance",
    "rehab_approved.amounts_warning": "Exact amounts will be determined by National Insurance",
    "rehab_approved.amounts_warning_desc": "Based on study type, institution, and your personal situation.",
    "rehab_approved.next_steps_title": "To start receiving payments:",
    "rehab_approved.step1": "Sign study schedule agreement",
    "rehab_approved.step2": "Submit documents to social worker",
    "rehab_approved.step3": "Report attendance once per semester",
    "rehab_approved.continue_button": "Continue to sign procedures",

    // Rehab Claims (updated)
    "rehab_claims.warning_title": "Important",
    "rehab_claims.warning_text":
      "This screen is only relevant after receiving rehabilitation allowance approval from National Insurance.",
    "rehab_claims.rent_section": "Rental Contract (if applicable)",
    "rehab_claims.rent_eligibility":
      "If you live 40 km or more from your study location, you are eligible for rent reimbursement",
    "rehab_claims.distance_label": "Distance from university",
    "rehab_claims.distance_less": "Less than 40 km",
    "rehab_claims.distance_more": "40 km or more",
    "rehab_claims.rent_contract": "Rental contract",
    "rehab_claims.rent_payment_proof": "Payment proof (checks/bank transfers)",
    "rehab_claims.upload": "Upload",
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zerotouch_language") as Language
      if (saved && (saved === "he" || saved === "en")) {
        return saved
      }
    }
    return "he"
  })

  useEffect(() => {
    updateDocumentLanguage(language)
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      localStorage.setItem("zerotouch_language", lang)
    }
    updateDocumentLanguage(lang)
  }

  const updateDocumentLanguage = (lang: Language) => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr"
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.he] || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}
