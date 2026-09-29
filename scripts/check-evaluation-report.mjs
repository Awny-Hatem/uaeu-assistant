import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/check-evaluation-report.mjs REPORT.html');
const target = path.resolve(input);
const directory = path.resolve('test-results/report-visual-qa');
fs.mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  await page.goto(pathToFileURL(target).href);
  if (await page.locator('section').count() !== 100) throw new Error('Expected 100 complete question sections');
  for (const viewport of [{ width: 1280, height: 960 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) throw new Error(`Horizontal overflow at ${viewport.width}px`);
    await page.screenshot({ path: path.join(directory, `summary-${viewport.width}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.locator('#Q095').screenshot({ path: path.join(directory, 'arabic-answer.png') });
  await page.locator('#Q100').screenshot({ path: path.join(directory, 'last-answer.png') });
  if (await page.locator('section .answer').count() !== 100) throw new Error('A response block is missing');
  console.log('100 question/answer sections present; desktop/mobile no overflow. Screenshots saved for visual inspection.');
} finally {
  await browser.close();
}
