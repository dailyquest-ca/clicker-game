// End-to-end smoke test: `npm run e2e`.
// Starts the dev server, plays through the loop with real clicks (using the ?debug time-skip helper),
// saves screenshots to artifacts/, and fails on any console error.

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

async function spendIdleStamina() {
  await tab('chores');
  const plusHay = page.locator('[data-testid=plus-hay]');
  if (!(await plusHay.isEnabled())) return;
  await page.click('button.chip:has-text("50%")');
  await plusHay.click();
  await page.click('button.chip:has-text("All")');
  const plusDodge = page.locator('[data-testid=plus-dodge]');
  if (await plusDodge.isEnabled()) await plusDodge.click();
}

async function beatBosses(target, maxRounds = 80) {
  for (let i = 0; i < maxRounds; i++) {
    const g = await state();
    if (g.bossesBeaten >= target) return;
    await tab('fight');
    if (g.fight && g.fight.result) {
      await page.click('[data-testid=fight-ok]');
      continue;
    }
    const winnable = await page.locator('[data-testid=prediction].good').count();
    if (winnable) {
      await page.click('[data-testid=fight]');
      await advance(31);
      continue;
    }
    await spendIdleStamina();
    await advance(20);
  }
  throw new Error(`could not reach boss ${target}`);
}

try {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  check((await page.title()).includes('Serf'), 'page loads');

  await advance(10);
  await spendIdleStamina();
  await advance(20);
  let g = await state();
  check(g.chores.hay.level > 0 && g.chores.dodge.level > 0, `chores level up (hay ${g.chores.hay.level}, dodge ${g.chores.dodge.level})`);
  await shot('01-chores');

  await tab('fight');
  check((await page.locator('[data-testid=prediction]').count()) === 1, 'fight shows a prediction');
  await beatBosses(1);
  check((await state()).unlocked.market, 'beating the rooster opens the Market');
  await shot('02-fight');

  await tab('market');
  await advance(1);
  await shot('03-market');

  await beatBosses(2);
  await tab('adventure');
  await page.click('[data-testid=go-zone-0]');
  await advance(60);
  g = await state();
  check(g.adventure.kills > 0, `adventure kills enemies (${g.adventure.kills} kills)`);
  await shot('04-adventure');

  await beatBosses(3);
  g = await state();
  if (g.lifeTime < 400) await advance(400 - g.lifeTime);
  await tab('inventory');
  const invBefore = (await state()).inventory.length;
  if (await page.locator('[data-testid=merge-all]').isEnabled()) await page.click('[data-testid=merge-all]');
  await page.locator('.item button:has-text("Wear")').first().click();
  g = await state();
  check(Object.values(g.equipped).some(Boolean), 'can wear an item');
  check(g.inventory.length < invBefore, `merging and wearing empty the sack (${invBefore} -> ${g.inventory.length})`);
  await shot('05-inventory');
  await tab('rebirth');
  await shot('06-rebirth-before');
  const before = await state();
  await page.click('[data-testid=rebirth]');
  await page.click('[data-testid=rebirth-confirm]');
  g = await state();
  check(g.rebirths === 1 && g.memories > 0, `rebirth grants Memories (${g.memories})`);
  check(g.inventory.length + Object.values(g.equipped).filter(Boolean).length >= before.inventory.length, 'items survive rebirth');
  await page.click('[data-testid=buy-perk-habit]');
  check((await state()).perks.habit === 1, 'can buy a perk');
  await shot('07-rebirth-after');

  await page.reload();
  await page.waitForSelector('[data-testid=tab-rebirth]');
  g = await state();
  check(g.rebirths === 1 && g.perks.habit === 1, 'progress survives a reload');

  await tab('stats');
  await shot('08-stats');
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
