// End-to-end smoke test: `npm run e2e`.
// Starts the dev server, plays the first life and the start of the second with real clicks (using the ?debug
// time-skip helper), saves screenshots to artifacts/, and fails on any console error.

import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync('artifacts', { recursive: true });

const server = await createServer({ server: { port: 5179, strictPort: false }, logLevel: 'warn' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?debug=1`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
page.setDefaultTimeout(5000);
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const state = () => page.evaluate(() => window.__game());
const advance = (s) => page.evaluate((s) => window.__advance(s), s);
const tab = (id) => page.click(`[data-testid=tab-${id}]`);
const shot = async (name) => {
  await page.waitForTimeout(300); // let bar transitions settle
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
};
function check(cond, message) {
  if (!cond) throw new Error(`E2E check failed: ${message}`);
  console.log(`ok - ${message}`);
}
/** Read every queued story card. Returns the titles. */
async function readCards() {
  await page.waitForTimeout(150); // one tick, in case a card is about to be queued
  const titles = [];
  for (let i = 0; i < 20 && (await page.locator('[data-testid=story-ok]').count()) > 0; i++) {
    titles.push(await page.locator('[data-testid=story] h2').innerText());
    await page.click('[data-testid=story-ok]');
  }
  return titles;
}
async function sellHay() {
  await tab('market');
  const btn = page.locator('[data-testid=sell-hay]');
  if (await btn.isEnabled()) await btn.click();
}
/** Cut and sell hay until we can afford `cost`. */
async function earn(cost, maxRounds = 40) {
  for (let i = 0; i < maxRounds; i++) {
    await sellHay();
    if ((await state()).pennies >= cost) return;
    await advance(10);
    await readCards();
  }
  throw new Error(`could not earn ${cost}d`);
}

try {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  check((await page.title()).includes('Serf'), 'page loads');
  check((await page.locator('[data-testid=story] h2').innerText()) === 'The Ledger', 'the intro card explains why we are here');
  await shot('01-intro');
  const t0 = (await state()).totalTime;
  await page.waitForTimeout(600);
  check((await state()).totalTime === t0, 'time stands still while a story card is open');
  await readCards();
  check((await page.locator('[data-testid=goals]').innerText()).includes('Cut 8 hay'), 'the first goal is to cut hay');

  await advance(25);
  let titles = await readCards();
  check(titles.includes('Market Day'), `the market is introduced once there is hay (${titles.join(', ')})`);
  await sellHay();
  let g = await state();
  check(g.pennies > 0, `selling hay earns pennies (${g.pennies.toFixed(1)}d)`);
  await shot('02-market');
  await advance(2);
  titles = await readCards();
  check(titles.includes('The Village Shop'), 'the shop is introduced after the first sale');

  await earn(20);
  await tab('shop');
  await shot('03-shop');
  await page.click('[data-testid=buy-hen]');
  g = await state();
  check(g.owned.hen === 1, 'buy a hen');
  titles = await readCards();
  check(titles.includes('A Hen!'), 'the hen gets her own card');
  await tab('work');
  await page.click('[data-testid=less-hay]');
  await page.click('[data-testid=more-eggs]');
  g = await state();
  check(g.pips.eggs === 1 && g.pips.hay === 2, 'move a pip from hay to eggs');
  await shot('04-work');

  // Through the first Michaelmas, keeping hay back for Gerald with the basket.
  g = await state();
  await advance(122 - g.lifeTime);
  titles = await readCards();
  g = await state();
  check(g.records.tithesMet === 1, `the first tithe is paid from the barn (${titles.join(', ')})`);
  check(g.tabs.includes('manor'), 'the Steward & Debt tab is open');
  await tab('manor');
  await earn(10);
  await tab('manor');
  await page.click('[data-testid=pay-10]');
  check((await state()).debtPaid === 10, 'pay 10d toward the debt');
  await shot('05-manor');

  // Mother Agnes wants six eggs for a cake.
  for (let i = 0; i < 20 && (await state()).goods.egg < 6; i++) await advance(10);
  await readCards();
  await tab('market');
  await page.click('[data-testid=deliver-agnes]');
  titles = await readCards();
  g = await state();
  check(g.demandsDone.includes('agnes') && titles.includes('Belongings'), "Agnes's demand pays in headwear");
  await tab('belongings');
  await page.click('[data-testid=wear-bucketHat]');
  check((await state()).equipped.head?.id === 'bucketHat', 'wear the bucket');
  await shot('06-belongings');

  await earn(30);
  await tab('shop');
  await page.click('[data-testid=buy-porridge]');
  check((await state()).owned.porridge === 1, 'buy porridge for a fourth pip');
  await tab('work');
  await page.click('[data-testid=more-hay]');

  // Let the market sell for us from now on.
  await earn(1000, 6).catch(() => {});
  await tab('market');
  check((await page.locator('[data-testid=standing-hay]').count()) === 1, 'standing orders unlock after enough sales');
  await page.click('[data-testid=standing-hay]');
  await page.click('[data-testid=standing-egg]');
  await shot('07-market-standing');

  // Grow old, paying the debt as the years go.
  for (let i = 0; i < 20 && !(await state()).dead; i++) {
    await advance(100);
    await readCards();
    g = await state();
    if (!g.dead && g.pennies >= 10) {
      await tab('manor');
      await page.click('[data-testid=pay-half]');
    }
  }
  g = await state();
  check(g.dead && g.yearsPaid === 9, `Hob dies after nine years (${g.records.tithesMet} tithes paid, ${g.records.tithesMissed} missed)`);
  check((await page.locator('[data-testid=heir]').count()) === 1, 'the heir screen waits');
  await shot('08-heir');
  const paidBefore = g.debtPaid;
  const leftBehind = g.pennies;
  await page.click('[data-testid=pass-on]');
  g = await state();
  check(g.life === 2 && !g.dead && g.pennies === 0, 'the next Hob takes over');
  check(g.chronicle.length === 1, 'the chronicle remembers him');
  check(g.debtPaid >= paidBefore + leftBehind * 0.5 - 0.01, `the heriot paid half of what he left toward the debt (${paidBefore.toFixed(0)} → ${g.debtPaid.toFixed(0)}d)`);
  check(g.debtPaid > 100, `the first Hob paid a fair bit of the debt (${g.debtPaid.toFixed(0)}d)`);
  titles = await readCards();
  check(titles.includes('The Lammas Fair') && titles.includes('The Heir'), `life 2 introduces new things (${titles.join(', ')})`);
  await tab('family');
  await shot('09-family');
  await tab('fair');
  check((await page.locator('[data-testid=contest]').count()) === 1, 'the fair has a contest this year');
  await shot('10-fair');

  await page.reload();
  await page.waitForSelector('[data-testid=tab-fair]');
  await readCards();
  g = await state();
  check(g.life === 2 && g.chronicle.length === 1, 'progress survives a reload');

  await tab('stats');
  await shot('11-stats');
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  console.log('\nE2E passed. Screenshots in artifacts/.');
} catch (e) {
  console.error(e);
  console.error('Console errors:', errors);
  await shot('failure').catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
