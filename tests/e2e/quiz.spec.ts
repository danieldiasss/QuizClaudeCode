import { expect, test, type Page } from "@playwright/test";
import bank from "../../src/content/questions.json";

type Locale = "pt" | "en";

/** The test knows the answer key (the browser never does): look it up by statement. */
function answerFor(statement: string, locale: Locale) {
  const q = bank.find((item) => item.statement[locale] === statement.trim());
  if (!q) throw new Error(`Statement not in bank: ${statement}`);
  return q.answer;
}

async function currentStatement(page: Page) {
  return (await page.locator("article h1").innerText()).trim();
}

/** Answers the next `count` questions with the keyboard (V/T = true, F = false). */
async function answerWithKeyboard(
  page: Page,
  locale: Locale,
  count: number,
  { wrong = 0 } = {},
) {
  for (let i = 0; i < count; i++) {
    const statement = await currentStatement(page);
    let value = answerFor(statement, locale);
    if (i < wrong) value = !value;
    const key = value ? (locale === "pt" ? "v" : "t") : "f";
    await page.keyboard.press(key);
    if (
      i < count - 1 ||
      (await page.getByText(/^(Pergunta|Question) 10/).count()) === 0
    ) {
      await expect(page.locator("article h1")).not.toHaveText(statement);
    }
  }
}

test("start payload never contains the answer key", async ({ page }) => {
  const startResponse = page.waitForResponse("**/api/quiz/start");
  await page.goto("/en/quiz/advanced");
  const body = await (await startResponse).text();
  expect(body).not.toMatch(/"answer"|"explanation"|"correctAnswer"/);
  expect(JSON.parse(body).questions).toHaveLength(10);
});

test("full round in PT with keyboard, review, publish and leaderboard", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(pt|en)$/);
  await page.goto("/pt");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Quanto você sabe sobre Claude Code?",
  );

  await page.getByRole("link", { name: /Iniciante/ }).click();
  await expect(page).toHaveURL(/\/pt\/quiz\/beginner$/);
  await expect(page.getByText("Pergunta 1 de 10")).toBeVisible();
  const startedAt = Date.now();

  // 8 right, 2 wrong
  await answerWithKeyboard(page, "pt", 10, { wrong: 2 });
  await expect(page.getByText("10 de 10 respondidas")).toBeVisible();

  // Ranking requires a round of at least 10s.
  const elapsed = Date.now() - startedAt;
  if (elapsed < 10_500) await page.waitForTimeout(10_500 - elapsed);
  await page.getByRole("button", { name: "Ver resultado" }).click();

  await expect(page).toHaveURL(/\/pt\/result\/[0-9a-f-]{36}$/);
  await expect(page.getByText("80 pts")).toBeVisible();
  await expect(page.getByText("8/10 acertos")).toBeVisible();

  const review = page
    .getByRole("list")
    .filter({ has: page.getByText("Resposta correta") });
  await expect(review.getByRole("listitem")).toHaveCount(10);
  await expect(review.getByRole("link", { name: /Saiba mais/ })).toHaveCount(
    10,
  );
  await expect(review.getByText("Errou")).toHaveCount(2);

  // Improper nickname is refused.
  await page.getByLabel("Apelido").fill("fuuuck");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.locator("#nickname-error")).toHaveText(
    "Esse apelido não é permitido. Escolha outro.",
  );

  await page.getByLabel("Apelido").fill("E2E Tester");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText(/Você está em #\d+ de \d+!/)).toBeVisible();

  await page.getByRole("link", { name: "Ver ranking" }).click();
  await expect(page).toHaveURL(/\/pt\/leaderboard$/);
  const myRow = page.locator('tr[aria-current="true"]');
  await expect(myRow).toContainText("E2E Tester");
  await expect(myRow).toContainText("você");
  await expect(myRow).toContainText("80");
});

test("reload and language switch keep the round in progress", async ({
  page,
}) => {
  await page.goto("/en/quiz/intermediate");
  await expect(page.getByText("Question 1 of 10")).toBeVisible();
  await answerWithKeyboard(page, "en", 2);
  await expect(page.getByText("Question 3 of 10")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Question 3 of 10")).toBeVisible();

  await page.getByRole("button", { name: "PT", exact: true }).click();
  await expect(page).toHaveURL(/\/pt\/quiz\/intermediate$/);
  await expect(page.getByText("Pergunta 3 de 10")).toBeVisible();
  await expect(page.getByRole("button", { name: /Verdadeiro/ })).toBeVisible();

  // Back button lets the player change a previous answer.
  await page.getByRole("button", { name: /Voltar/ }).click();
  await expect(page.getByText("Pergunta 2 de 10")).toBeVisible();
});

test("a too-fast round is scored but can't be ranked", async ({ page }) => {
  await page.goto("/en/quiz/advanced");
  await expect(page.getByText("Question 1 of 10")).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const before = await currentStatement(page);
    await page.getByRole("button", { name: /True/ }).click();
    if (i < 9) await expect(page.locator("article h1")).not.toHaveText(before);
  }
  await page.getByRole("button", { name: "See result" }).click();
  await expect(page).toHaveURL(/\/en\/result\//);
  await expect(
    page.getByText("This round was too fast to be ranked."),
  ).toBeVisible();
  await expect(page.getByLabel("Nickname")).toHaveCount(0);
});

test("shared result links show the result but no publish form", async ({
  page,
  browser,
}) => {
  await page.goto("/en/quiz/beginner");
  await answerWithKeyboard(page, "en", 10);
  await page.waitForTimeout(10_500);
  await page.getByRole("button", { name: "See result" }).click();
  await expect(page).toHaveURL(/\/en\/result\//);
  await expect(page.getByLabel("Nickname")).toBeVisible();
  const url = page.url();

  const visitor = await browser.newContext();
  const other = await visitor.newPage();
  await other.goto(url);
  await expect(other.getByText("100 pts")).toBeVisible();
  await expect(other.getByLabel("Nickname")).toHaveCount(0);
  await visitor.close();
});

test("'Play again' starts a fresh round, not the finished one", async ({
  page,
}) => {
  await page.goto("/en/quiz/beginner");
  await expect(page.getByText("Question 1 of 10")).toBeVisible();
  const firstRoundIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const s = await currentStatement(page);
    firstRoundIds.push(s);
    await page.getByRole("button", { name: /False/ }).click();
    if (i < 9) await expect(page.locator("article h1")).not.toHaveText(s);
  }
  await page.getByRole("button", { name: "See result" }).click();
  await expect(page).toHaveURL(/\/en\/result\//);

  // Client-side navigation back to the quiz route (kept alive by <Activity>).
  const nextStart = page.waitForResponse("**/api/quiz/start");
  await page.getByRole("link", { name: "Play again" }).click();
  await expect(page).toHaveURL(/\/en\/quiz\/beginner$/);
  await nextStart;
  await expect(page.getByText("Question 1 of 10")).toBeVisible();
  await expect(page.getByText("0 of 10 answered")).toBeVisible();
  await expect(page.getByRole("button", { name: "See result" })).toHaveCount(0);
  // The previous round's questions are avoided (20-question pool).
  const fresh = await currentStatement(page);
  expect(firstRoundIds).not.toContain(fresh);
});

test("Open Graph image renders as PNG", async ({ request }) => {
  const res = await request.get(
    "/api/og/result/00000000-0000-4000-8000-000000000000",
  );
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("home is usable on mobile @mobile", async ({ page }) => {
  await page.goto("/pt");
  await expect(page.getByRole("link", { name: /Avançado/ })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
