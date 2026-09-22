// On a phone: a swipe that starts on the moon must scroll; a still long-press must hold.
import { open, yOf, jump, finger, shot } from './lib.mjs';
const { browser, page, cdp, errors } = await open(process.argv[2] || 'iphone');
await jump(page, await yOf(page, '[data-held]', 0.45), 1500);
const box = await (await page.$('[data-hx-target]')).boundingBox();
const cx = Math.round(box.x + box.width / 2), cy = Math.round(box.y + box.height / 2);
const st = () => page.evaluate(() => ({ y: Math.round(scrollY), holding: document.querySelector('[data-held]').hasAttribute('data-holding') }));

// 1) swipe up starting on the moon
const before = await st();
await finger(cdp, 260, { x: cx, y: cy + 60, steps: 10, ms: 16 });
await page.waitForTimeout(900);
const afterSwipe = await st();
console.log('swipe on moon:', JSON.stringify(before), '→', JSON.stringify(afterSwipe), afterSwipe.y > before.y ? 'SCROLLED ✓' : 'DID NOT SCROLL ✗');

// 2) long press, still
await jump(page, await yOf(page, '[data-held]', 0.45), 1500);
const box2 = await (await page.$('[data-hx-target]')).boundingBox();
const px = Math.round(box2.x + box2.width / 2), py = Math.round(box2.y + box2.height / 2);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: py, id: 1 }] });
await page.waitForTimeout(700);
const during = await st();
// a small drift of the finger while holding must not scroll the page
for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px, y: py - i * 8, id: 1 }] }); await page.waitForTimeout(16); }
await page.waitForTimeout(2500);
const later = await st();
await shot(page, 'touch-hold-mid');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(1500);
const after = await st();
console.log('long press:', JSON.stringify(during), during.holding ? 'HOLDING ✓' : 'NOT HOLDING ✗', '| drift:', later.y === during.y ? 'page still ✓' : `page moved ${later.y - during.y}px ✗`, '| release:', after.holding ? 'still holding ✗' : 'released ✓');
if (errors.length) console.log('errors', errors.slice(0, 5));
await browser.close();
