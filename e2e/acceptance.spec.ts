// PRD acceptance scenario (10 steps) plus the binding product rules, against the in-memory demo store.
// Local mode keeps data in memory only, so tests move between screens by clicking, never by page.goto after the start.
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const SAVED = 'הדיווח נשמר ויהיה זמין למטפל לקראת הפגישה'
const FORBIDDEN = ['נשלח למטפל', 'לא מילאת']
const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 900 }

async function checkPage(page: Page) {
  const text = await page.locator('body').innerText()
  for (const f of FORBIDDEN) expect(text, `forbidden phrase "${f}"`).not.toContain(f)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  const serious = axe.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map(v => `${v.id}: ${v.nodes[0]?.target}`), 'serious accessibility violations').toEqual([])
}
/** Client-side navigation (keeps the in-memory data), like typing a URL without reloading. */
async function go(page: Page, path: string) {
  await page.evaluate(p => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate')) }, path)
}
async function openDevTools(page: Page) {
  await page.locator('details').evaluate(d => { (d as HTMLDetailsElement).open = true })
}
async function devLink(page: Page, name: string) {
  await openDevTools(page)
  await page.getByRole('link', { name }).click()
}
async function setSlider(page: Page, label: string, presses: number) {
  const s = page.getByLabel(label, { exact: true })
  await s.focus()
  await s.press('ArrowRight') // first key gives it a value
  for (let i = 0; i < presses; i++) await s.press('ArrowUp')
}
async function login(page: Page, email: string) {
  await page.getByLabel('אימייל').fill(email)
  await page.getByLabel('סיסמה').fill('demo1234')
  await page.getByRole('button', { name: 'כניסה' }).click()
  await expect(page.getByRole('heading', { name: 'המטופלים שלי' })).toBeVisible()
}

test('acceptance scenario: therapist assigns, patient reports, therapist reads the week', async ({ page }) => {
  const external: string[] = []
  page.on('request', r => { if (!r.url().startsWith('http://localhost:5174')) external.push(r.url()) })
  await page.setViewportSize(DESKTOP)
  await page.goto('/therapist/login')
  await checkPage(page)

  // 1. Therapist logs in, adds a demo patient, gets a join code.
  await login(page, 'therapist1@yomi.test')
  await checkPage(page)
  await page.getByRole('link', { name: 'הוספת מטופל' }).click()
  await page.getByLabel('כינוי').fill('ר׳ בדיקה')
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).getDay() // the week then includes yesterday
  await page.getByLabel('יום הפגישה הקבוע').selectOption(String(twoDaysAgo))
  await checkPage(page)
  await page.getByRole('button', { name: 'הוספה ויצירת קוד' }).click()
  const code = (await page.getByTestId('invite-code').innerText()).trim()
  expect(code).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}$/)
  await checkPage(page)

  // 2. Patient joins on the phone, sees what the therapist sees, then an empty task list.
  await page.setViewportSize(PHONE)
  await devLink(page, 'למסך המטופל')
  await expect(page.getByRole('heading', { name: 'הצטרפות' })).toBeVisible()
  await page.getByLabel('קוד הצטרפות').fill('ZZZZ-ZZZZ')
  await page.getByRole('button', { name: 'הצטרפות' }).click()
  await expect(page.getByRole('alert')).toContainText('הקוד לא נמצא')
  await page.getByLabel('קוד הצטרפות').fill(code.toLowerCase())
  await page.getByRole('button', { name: 'הצטרפות' }).click()
  await expect(page.getByRole('heading', { name: 'מה המטפל רואה ומתי' })).toBeVisible()
  await checkPage(page)
  await page.getByRole('link', { name: 'הבנתי, להמשיך' }).click()
  await expect(page.getByTestId('empty-tasks')).toBeVisible()
  await checkPage(page)

  // 3–4. Therapist defines a behavioral task (3 a week) and a thought task ("when it happens").
  await page.setViewportSize(DESKTOP)
  await devLink(page, 'למסך המטפל')
  await page.getByRole('link', { name: /ר׳ בדיקה/ }).click()
  for (const t of [
    { type: 'משימה התנהגותית', title: 'לעלות במעלית קומה אחת', period: 'בשבוע', count: '3' },
    { type: 'משימה מחשבתית', title: 'לתעד מחשבה כשעולה חרדה', period: 'כשזה קורה' },
  ]) {
    await page.getByRole('link', { name: 'הגדרת משימה' }).click()
    await page.getByText(t.type, { exact: true }).click()
    await page.getByLabel('שם קצר').fill(t.title)
    await page.getByLabel('הנחיה').fill('הנחיה לדוגמה')
    await page.getByText(t.period, { exact: true }).click()
    if (t.count) await page.getByLabel('כמה פעמים בשבוע').fill(t.count)
    await checkPage(page)
    await page.getByRole('button', { name: 'שמירת המשימה' }).click()
    await expect(page.getByRole('heading', { name: 'ר׳ בדיקה' })).toBeVisible()
  }
  await expect(page.getByTestId('empty-week')).toBeVisible()
  await checkPage(page)

  // 5. Both tasks appear on the phone as cards tagged "new".
  await page.setViewportSize(PHONE)
  await devLink(page, 'למסך המטופל')
  const cards = page.getByTestId('task-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.getByText('חדש', { exact: true })).toHaveCount(2)
  await checkPage(page)

  // 6. Behavioral report: done, distress before/after, save → binding confirmation, card shows 1 of 3.
  await page.getByRole('link', { name: 'דיווח על לעלות במעלית קומה אחת' }).click()
  await expect(page.getByText('ללא עוצמה').first()).toBeVisible()
  await expect(page.getByText('עוצמה מרבית').first()).toBeVisible()
  await page.getByText('בוצע', { exact: true }).click()
  await setSlider(page, 'מצוקה לפני (רשות)', 5)
  await setSlider(page, 'מצוקה אחרי (רשות)', 2)
  await checkPage(page)
  const save = page.getByRole('button', { name: 'שמירת הדיווח' })
  await save.dblclick() // double tap must still save once
  await expect(page.getByRole('button', { name: 'שומר…' })).toBeDisabled()
  await expect(page.getByText(SAVED)).toBeVisible()
  await checkPage(page)
  await page.getByRole('link', { name: 'חזרה למשימות' }).click()
  await expect(cards.first().getByTestId('progress')).toHaveText('1 מתוך 3 השבוע')

  // 7. Thought report in three steps; going back keeps what was typed.
  await page.getByRole('link', { name: 'דיווח על לתעד מחשבה כשעולה חרדה' }).click()
  await expect(page.getByText('שלב 1 מתוך 3')).toBeVisible()
  await page.getByLabel('מה קרה?').fill('חיכיתי בתור ארוך')
  await page.getByRole('button', { name: 'המשך' }).click()
  await expect(page.getByText('שלב 2 מתוך 3')).toBeVisible()
  await page.getByRole('button', { name: 'חזרה לשלב הקודם' }).click()
  await expect(page.getByLabel('מה קרה?')).toHaveValue('חיכיתי בתור ארוך')
  await page.getByRole('button', { name: 'המשך' }).click()
  await expect(page.getByRole('button', { name: 'המשך' })).toBeDisabled() // emotion + intensity required
  await page.getByText('חרדה', { exact: true }).click()
  await setSlider(page, 'עוצמה: חרדה', 3)
  await checkPage(page)
  await page.getByRole('button', { name: 'המשך' }).click()
  await page.getByLabel('איזו מחשבה עלתה לך באותו רגע?').fill('זה לא ייגמר')
  await checkPage(page)
  await page.getByRole('button', { name: 'שמירת הדיווח' }).click()
  await expect(page.getByText(SAVED)).toBeVisible()
  await page.getByRole('link', { name: 'חזרה למשימות' }).click()

  // 8. On another (earlier) day: "not done" on the behavioral task, "too hard, I avoided it".
  await page.getByRole('link', { name: 'לא ביצעתי: לעלות במעלית קומה אחת' }).click()
  await page.getByText('היה קשה מדי ונמנעתי').click()
  await page.getByText('מועד מוקדם יותר').click()
  const y = new Date(Date.now() - 86_400_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  await page.getByLabel('מועד האירוע').fill(`${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}T10:00`)
  await checkPage(page)
  await page.getByRole('button', { name: 'שמירת הדיווח' }).click()
  await expect(page.getByText(SAVED)).toBeVisible()
  await page.getByRole('link', { name: 'חזרה למשימות' }).click()
  await expect(cards.first().getByTestId('progress')).toHaveText('1 מתוך 3 השבוע') // non-completion not counted

  // 9. Therapist's week: 1 of 3, one thought report, reports by day, non-completion with its reason.
  await page.setViewportSize(DESKTOP)
  await devLink(page, 'למסך המטפל')
  await page.getByRole('link', { name: /ר׳ בדיקה/ }).click()
  const summaries = page.getByTestId('task-summary')
  await expect(summaries.filter({ hasText: 'לעלות במעלית' })).toContainText('1 מתוך 3')
  await expect(summaries.filter({ hasText: 'לעלות במעלית' })).toContainText('דיווחי אי-ביצוע: 1')
  await expect(summaries.filter({ hasText: 'לתעד מחשבה' })).toContainText('1 דיווחים')
  await expect(page.getByRole('link', { name: /לא בוצע · היה קשה מדי ונמנעתי/ })).toBeVisible()
  await checkPage(page)

  // 10. Full report: event date and entry time shown separately, no edit controls.
  await page.getByRole('link', { name: /בוצע$/ }).first().click()
  await expect(page.getByText('מועד האירוע')).toBeVisible()
  await expect(page.getByText('מועד ההזנה')).toBeVisible()
  await expect(page.getByRole('button', { name: /עריכה|שינוי/ })).toHaveCount(0)
  await checkPage(page)

  expect(external, 'requests to third parties').toEqual([])
})

test('save failure keeps the content and offers retry; confirmation only after success', async ({ page }) => {
  await page.setViewportSize(PHONE)
  await page.goto('/join')
  await devLink(page, 'כניסה כמטופל/ת ד׳')
  await openDevTools(page)
  await page.getByLabel('לדמות כשל בשמירה (כל עוד מסומן)').check()
  await page.getByRole('link', { name: 'לא ביצעתי: לעלות במעלית קומה אחת' }).click()
  await page.getByText('לא היה זמן').click()
  await page.getByLabel('הערה (רשות)').fill('שבוע עמוס')
  await page.getByRole('button', { name: 'שמירת הדיווח' }).click()
  await expect(page.getByRole('alert')).toContainText('השמירה לא הצליחה')
  await expect(page.getByText(SAVED)).toHaveCount(0)
  await expect(page.getByLabel('הערה (רשות)')).toHaveValue('שבוע עמוס')
  await checkPage(page)
  await openDevTools(page)
  await page.getByLabel('לדמות כשל בשמירה (כל עוד מסומן)').uncheck()
  await page.getByRole('button', { name: 'לנסות שוב' }).click()
  await expect(page.getByText(SAVED)).toBeVisible()
})

test('leaving a form with content asks first', async ({ page }) => {
  await page.setViewportSize(PHONE)
  await page.goto('/join')
  await devLink(page, 'כניסה כמטופל/ת ד׳')
  await page.getByRole('link', { name: 'לא ביצעתי: לעלות במעלית קומה אחת' }).click()
  await page.getByText('שכחתי').click()
  const [dialog] = await Promise.all([page.waitForEvent('dialog'), page.getByRole('link', { name: 'יומי', exact: true }).click()])
  expect(dialog.message()).toContain('לצאת בלי לשמור')
  await dialog.dismiss()
  await expect(page.getByText('מה הפריע?')).toBeVisible() // stayed
})

test('empty field shows "לא מולא" and the therapist cannot reach another therapist’s patient', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/therapist/login')
  await login(page, 'therapist1@yomi.test')
  await page.getByRole('link', { name: /ד׳ \(הדגמה\)/ }).click()
  await page.getByRole('link', { name: /בוצע חלקית/ }).click()
  await expect(page.getByText('לא מולא')).toBeVisible() // seeded: distress after left empty
  const url = page.url()
  await page.getByRole('button', { name: 'יציאה' }).click()
  await login(page, 'therapist2@yomi.test')
  await go(page, new URL(url).pathname)
  await expect(page.getByRole('heading', { name: 'הדיווח לא נמצא' })).toBeVisible()
  await expect(page.getByText('בוצע חלקית')).toHaveCount(0)
})

test('helplines are one tap away on patient screens', async ({ page }) => {
  await page.setViewportSize(PHONE)
  await page.goto('/join')
  await page.getByRole('link', { name: 'קווי סיוע' }).click()
  await expect(page.getByText('1201')).toBeVisible()
  await expect(page.getByText('101', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('אינה מנוטרת בזמן אמת')).toBeVisible()
  await checkPage(page)
})
