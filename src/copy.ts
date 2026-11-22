// Every product-rule wording lives here so the rule tests can check it in one place (CLAUDE.md: "כללים שאסור להפר").
import type { ApiErrorCode, TaskType } from './data/types'

export const copy = {
  demoBanner: 'סביבת הדגמה: אין להזין מידע אמיתי',
  saveConfirmed: 'הדיווח נשמר ויהיה זמין למטפל לקראת הפגישה',
  saveReport: 'שמירת הדיווח',
  saving: 'שומר…',
  saveFailed: 'השמירה לא הצליחה. מה שכתבת נשאר כאן, ואפשר לנסות שוב.',
  retry: 'לנסות שוב',
  backToTasks: 'חזרה למשימות',
  leaveConfirm: 'לצאת בלי לשמור? מה שכתבת עד עכשיו לא יישמר.',
  notFilled: 'לא מולא',
  notChosen: 'לא נבחר',
  sliderMin: 'ללא עוצמה',
  sliderMax: 'עוצמה מרבית',
  helpTitle: 'קווי סיוע',
  helpNotMonitored: 'האפליקציה אינה מנוטרת בזמן אמת ואינה שירות חירום. במצב חירום יש לפנות לאחד הקווים כאן.',
  emptyTasks: 'עוד אין כאן משימות. אחרי שהמטפל יגדיר משימה, היא תופיע כאן.',
  emptyWeek: 'בשבוע הזה עוד אין דיווחים.',
  noReportsOnTask: 'עוד אין דיווחים על המשימה בשבוע הזה',
} as const

export const taskTypeLabel: Record<TaskType, string> = { behavioral: 'משימה התנהגותית', thought: 'משימה מחשבתית' }

export const errorText: Partial<Record<ApiErrorCode, string>> = {
  invalid_code: 'הקוד לא נמצא. כדאי לבדוק אותו שוב, או לבקש קוד חדש מהמטפל.',
  code_used: 'הקוד הזה כבר שימש להצטרפות. אפשר לבקש קוד חדש מהמטפל.',
  code_expired: 'תוקף הקוד הסתיים. אפשר לבקש קוד חדש מהמטפל.',
  bad_login: 'האימייל או הסיסמה לא נכונים.',
  not_found: 'לא מצאנו את מה שחיפשת.',
  event_in_future: 'אי אפשר לבחור מועד עתידי.',
}
export const genericError = 'משהו לא עבד. אפשר לנסות שוב.'

// Phrases that must never appear anywhere in the UI.
export const forbiddenPhrases = ['נשלח למטפל', 'לא מילאת'] as const
