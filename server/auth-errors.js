const messages = {
  USER_ALREADY_EXISTS: 'האימייל הזה כבר רשום. עבור לכניסה עם הסיסמה שלך.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'האימייל הזה כבר רשום. עבור לכניסה עם הסיסמה שלך.',
  INVALID_EMAIL_OR_PASSWORD: 'האימייל או הסיסמה אינם נכונים. בדוק את שניהם ונסה שוב.',
  INVALID_PASSWORD: 'הסיסמה אינה נכונה. נסה שוב.',
  INVALID_EMAIL: 'כתובת האימייל אינה תקינה. בדוק שהזנת כתובת מלאה.',
  USER_NOT_FOUND: 'לא נמצא חשבון עם האימייל הזה. בדוק את הכתובת או עבור להרשמה.',
  EMAIL_NOT_VERIFIED: 'האימייל עדיין לא אומת. פתח את הודעת האימות שנשלחה אליך, אשר את הכתובת ונסה להתחבר שוב. בדוק גם בתיקיית הספאם.',
  PASSWORD_TOO_SHORT: 'הסיסמה קצרה מדי. בחר סיסמה של לפחות 8 תווים.',
  PASSWORD_TOO_LONG: 'הסיסמה ארוכה מדי. ניתן להזין עד 128 תווים.',
  INVALID_ORIGIN: 'כתובת האתר עדיין לא אושרה בשירות ההתחברות. יש להוסיף את כתובת האתר ל־Trusted Domains ב־Neon Auth.',
  MISSING_OR_NULL_ORIGIN: 'שירות ההתחברות לא זיהה את כתובת האתר. רענן את הדף ונסה שוב.',
  SIGNUP_DISABLED: 'ההרשמה אינה פעילה כרגע בשירות ההתחברות.',
  EMAIL_PASSWORD_DISABLED: 'כניסה באימייל וסיסמה אינה פעילה כרגע בשירות ההתחברות.',
  SESSION_EXPIRED: 'החיבור לחשבון פג. התחבר שוב.',
};
export function authError(result, status) {
  const raw = result?.code || result?.error?.code;
  const code = typeof raw === 'string' && /^[A-Z0-9_]{1,80}$/.test(raw) ? raw : 'AUTH_FAILED';
  if (status === 429) return { code: 'TOO_MANY_REQUESTS', error: 'בוצעו יותר מדי ניסיונות. המתן כמה דקות ונסה שוב.' };
  if (status >= 500) return { code, error: 'שירות ההתחברות אינו זמין כרגע. נסה שוב בעוד כמה דקות.' };
  return { code, error: messages[code] || `לא ניתן להשלים את ההתחברות. נסה שוב; אם הבעיה נמשכת, שלח את קוד התקלה: ${code} (${status}).` };
}
