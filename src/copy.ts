// Every product-rule wording lives here so e2e/rules.spec.ts can check it in one place (CLAUDE.md: "כללים שאסור להפר").
export const copy = {
  demoBanner: 'סביבת הדגמה: אין להזין מידע אמיתי',
  saveConfirmed: 'הדיווח נשמר ויהיה זמין למטפל לקראת הפגישה',
  saving: 'שומר…',
  saveFailed: 'השמירה לא הצליחה. מה שכתבת נשאר כאן.',
  retry: 'לנסות שוב',
  notFilled: 'לא מולא',
  sliderMin: 'ללא עוצמה',
  sliderMax: 'עוצמה מרבית',
  helpTitle: 'קווי סיוע',
  helpNotMonitored: 'האפליקציה אינה מנוטרת בזמן אמת ואינה שירות חירום. במצב חירום יש לפנות לאחד הקווים כאן.',
} as const

// Phrases that must never appear anywhere in the UI.
export const forbiddenPhrases = ['נשלח למטפל', 'לא מילאת'] as const
