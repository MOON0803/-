import { expect, test, type Page } from '@playwright/test';

async function playScenes(page: Page) {
  for (let i = 0; i < 300; i++) {
    if (!(await page.getByTestId('adv').count())) return;
    if (await page.getByTestId('choice-0').count()) await page.getByTestId('choice-0').click();
    else await page.getByTestId('skip').click();
  }
}

async function closePopups(page: Page) {
  for (let i = 0; i < 10 && (await page.getByTestId('popup').count()); i++) {
    await page.getByTestId('popup').getByRole('button', { name: '확인' }).click();
  }
}

async function cmd(page: Page, line: string) {
  if (!(await page.getByTestId('console').count())) await page.getByTestId('debug-open').click();
  await page.getByTestId('console-input').fill(line);
  await page.getByTestId('console-input').press('Enter');
  await page.getByTestId('console-input').press('Escape');
}

test('new game → intro → first floor of the tower → home', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('name').fill('도연');
  await page.getByTestId('new-game').click();
  await playScenes(page);
  await closePopups(page);
  await expect(page.getByTestId('hud')).toContainText('3월 1주');

  await page.getByTestId('act-tower').click();
  await page.getByTestId('tower-go').click();
  await expect(page.getByTestId('floor-title')).toContainText('1층');

  await page.locator('.node.reach').first().click();
  await expect(page.getByTestId('battle')).toBeVisible();
  await cmd(page, 'battle win');
  await page.getByTestId('battle-continue').click();

  await page.locator('.node.reach').first().click(); // 출구
  await playScenes(page);
  await closePopups(page);
  await page.getByTestId('perks').getByRole('button').first().click();
  await page.getByTestId('leave').click();
  await closePopups(page);
  await playScenes(page);
  await closePopups(page);
  await expect(page.getByTestId('hud')).toContainText('1층');
  expect(errors).toEqual([]);
});

test('a full day passes and the nightly report appears', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-game').click();
  await playScenes(page);
  await closePopups(page);
  await page.getByTestId('act-cafe').click();
  await closePopups(page);
  await playScenes(page);
  await closePopups(page);
  await page.getByTestId('act-rest').click();
  await closePopups(page);
  await playScenes(page);
  await page.getByTestId('act-sleep').click();
  await expect(page.getByTestId('popup')).toContainText('카페');
  await closePopups(page);
  await playScenes(page);
  await closePopups(page);
  await expect(page.getByTestId('hud')).toContainText('(화)');
});
