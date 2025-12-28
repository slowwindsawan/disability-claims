export interface DocumentRequirement {
  id: number
  name: string
  name_en: string
  required: boolean
  description?: string
  description_en?: string
}

export const DOCUMENT_REQUIREMENTS: Record<"NII" | "MOD", Record<string, DocumentRequirement[]>> = {
  NII: {
    general_disability: [
      {
        id: 101,
        name: "טופס 7801 - בקשה לקצבת נכות כללית",
        name_en: "Form 7801 - General Disability Benefit Application",
        required: true,
      },
      {
        id: 102,
        name: "מסמכים רפואיים",
        name_en: "Medical Documents",
        required: true,
        description: "אבחנות, תוצאות בדיקות, מכתבים רפואיים",
        description_en: "Diagnoses, test results, medical letters",
      },
      {
        id: 103,
        name: "תעודת זהות",
        name_en: "ID Card",
        required: true,
      },
    ],
    work_accident: [
      {
        id: 201,
        name: "טופס 250 - הודעה על תאונת עבודה",
        name_en: "Form 250 - Work Accident Report",
        required: true,
      },
      {
        id: 202,
        name: "דוח תאונה מהמעסיק",
        name_en: "Employer's Accident Report",
        required: true,
      },
      {
        id: 203,
        name: "אישור מעסיק על תנאי העסקה",
        name_en: "Employment Conditions Confirmation",
        required: true,
      },
      {
        id: 204,
        name: "מסמכים רפואיים",
        name_en: "Medical Documents",
        required: true,
      },
    ],
    hostile_action: [
      {
        id: 401,
        name: "טופס 7801 - בקשה לקצבת נכות",
        name_en: "Form 7801 - Disability Benefit Application",
        required: true,
      },
      {
        id: 402,
        name: "אישור משטרה על פעולת איבה",
        name_en: "Police Confirmation of Hostile Action",
        required: true,
        description: "אישור רשמי ממשטרת ישראל על אירוע פעולת האיבה",
        description_en: "Official confirmation from Israel Police about the hostile action incident",
      },
      {
        id: 403,
        name: "מסמכים רפואיים",
        name_en: "Medical Documents",
        required: true,
      },
      {
        id: 404,
        name: "תצהיר עדים (אופציונלי)",
        name_en: "Witness Affidavit (Optional)",
        required: false,
      },
    ],
    adhd: [
      {
        id: 501,
        name: "אבחנה פסיכודידקטית",
        name_en: "Psycho-Educational Assessment",
        required: true,
      },
      {
        id: 502,
        name: "אישור אבחון ADHD",
        name_en: "ADHD Diagnosis Confirmation",
        required: true,
      },
      {
        id: 503,
        name: "תעודות לימודים",
        name_en: "Academic Transcripts",
        required: false,
      },
    ],
  },
  MOD: {
    service_injury: [
      {
        id: 301,
        name: "דוח פציעה 144",
        name_en: "Injury Report Form 144",
        required: true,
        description: "דוח פציעה רשמי שהוגש בזמן השירות",
        description_en: "Official injury report filed during service",
      },
      {
        id: 302,
        name: "תצהיר מפקד",
        name_en: "Commander's Affidavit",
        required: true,
        description: "תצהיר מהמפקד המיידי על נסיבות הפציעה",
        description_en: "Affidavit from immediate commander about injury circumstances",
      },
      {
        id: 303,
        name: "מסמכים רפואיים מצה״ל",
        name_en: "IDF Medical Documents",
        required: true,
        description: "תיק רפואי, אבחנות, דוחות מרופא צבאי",
        description_en: "Medical file, diagnoses, military doctor reports",
      },
      {
        id: 304,
        name: "פרטי שירות",
        name_en: "Service Record",
        required: true,
        description: "תעודת שחרור, פרופיל, תפקיד",
        description_en: "Discharge certificate, profile, role",
      },
    ],
  },
}

// Helper function to get required documents based on jurisdiction and category
export function getRequiredDocuments(
  jurisdiction: "NII" | "MOD" | null,
  claimCategory: string | null,
): DocumentRequirement[] {
  if (!jurisdiction || !claimCategory) return []
  return DOCUMENT_REQUIREMENTS[jurisdiction]?.[claimCategory] || []
}
