import { expect, test, type Page, type Route } from "@playwright/test";

/** Matches `SETTINGS_STORAGE_KEY` in SettingsModal — keeps Settings from blocking Enter. */
const SETTINGS_STORAGE_KEY = "polymath-dywan-settings";
/** Matches `GRAPH_STORAGE_KEY` in local-storage persistence. */
const GRAPH_STORAGE_KEY = "polymath-dywan-graph";

const SEED_TOPIC = "Stoicism";

/** Vercel AI SDK data-stream body consumed by `useChat` → MentorChatPanel. */
function mentorDataStream(text: string): string {
  return `0:${JSON.stringify(text)}\nd:{"finishReason":"stop"}\n`;
}

async function fulfillMentorStream(route: Route, text: string) {
  await route.fulfill({
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
    body: mentorDataStream(text),
  });
}

async function seedClientSettings(page: Page) {
  await page.addInitScript(
    ({ settingsKey, settings }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify(settings));
    },
    {
      settingsKey: SETTINGS_STORAGE_KEY,
      settings: {
        openaiApiKey: "sk-e2e-test-placeholder",
        googleApiKey: "AIza-e2e-test-placeholder",
        defaultModel: "gemini-3.5-flash",
        expansionModel: "gemini-3.1-pro-preview",
      },
    },
  );
}

async function enterUniverseFromLanding(page: Page, topic: string) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Map a domain/i })).toBeVisible();

  // Settings may still flash open before init script hydrates; dismiss if present.
  const closeSettings = page.getByRole("button", { name: "Close settings" });
  if (await closeSettings.isVisible().catch(() => false)) {
    await closeSettings.click();
  }

  await page.locator("#seed-topic").fill(topic);
  await page.getByRole("button", { name: "Enter Universe" }).click();
  await page.waitForURL(/\/universe/);
  await expect(
    page.getByRole("complementary", { name: "Socratic mentor chat" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Universe canvas" }),
  ).toBeVisible();
  // Dynamic import finished — WebGL shell is mounted.
  await expect(page.getByLabel("3D knowledge universe")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByLabel("Loading universe canvas")).toHaveCount(0);
}

test.describe("happy path: seed → mentor → expand", () => {
  test.beforeEach(async ({ page }) => {
    await seedClientSettings(page);
  });

  test("seed input navigates to universe, mentor mastery expands graph", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    let expandCalls = 0;

    await page.route("**/api/mentor", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await fulfillMentorStream(
        route,
        "Your grasp of the concept is clear and rigorous. [MASTERED]",
      );
    });

    await page.route("**/api/expand", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      expandCalls += 1;
      const body = route.request().postDataJSON() as {
        parentNode?: { id?: string; label?: string };
      };
      const parentId = body.parentNode?.id ?? "root";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          nodes: [
            {
              id: "virtue",
              label: "Virtue Ethics",
              status: "foggy",
            },
            {
              id: "ataraxia",
              label: "Ataraxia",
              status: "foggy",
            },
          ],
          links: [
            { source: parentId, target: "virtue" },
            { source: parentId, target: "ataraxia" },
          ],
        }),
      });
    });

    await enterUniverseFromLanding(page, SEED_TOPIC);

    // Root is auto-selected (UniverseProvider); mentor panel shows the seed label.
    await expect(
      page.getByRole("complementary", { name: "Socratic mentor chat" }),
    ).toContainText(SEED_TOPIC);

    await page.getByLabel("Your response").fill(
      "Stoicism trains judgment so externals lose their grip.",
    );
    await page.getByRole("button", { name: "Send" }).click();

    await expect(
      page.getByRole("status").filter({
        hasText: /Concept mastered/i,
      }),
    ).toBeVisible();

    await expect
      .poll(() => expandCalls, { timeout: 20_000 })
      .toBeGreaterThanOrEqual(1);

    // Graph Integrity: expansion merged into localStorage (PERSISTENCE_STRATEGY).
    await expect
      .poll(async () => {
        const raw = await page.evaluate(
          (key) => window.localStorage.getItem(key),
          GRAPH_STORAGE_KEY,
        );
        if (!raw) return 0;
        const parsed = JSON.parse(raw) as { nodes?: unknown[] };
        return Array.isArray(parsed.nodes) ? parsed.nodes.length : 0;
      })
      .toBeGreaterThanOrEqual(3);

    // Canvas remains mounted after expand merge.
    await expect(
      page.getByRole("region", { name: "Universe canvas" }),
    ).toBeVisible();
    await expect(page.getByLabel("3D knowledge universe")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("invalid expand JSON does not crash UniverseCanvas", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    let expandCalls = 0;

    await page.route("**/api/mentor", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await fulfillMentorStream(
        route,
        "Sufficient clarity demonstrated. [MASTERED]",
      );
    });

    // Simulate a broken LLM / proxy that returns non-JSON expand payload.
    await page.route("**/api/expand", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      expandCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "not-json{{{",
      });
    });

    await enterUniverseFromLanding(page, "Quantum Computing");

    await page.getByLabel("Your response").fill(
      "Superposition lets qubits hold amplitudes until measurement.",
    );
    await page.getByRole("button", { name: "Send" }).click();

    await expect(
      page.getByRole("status").filter({
        hasText: /Concept mastered/i,
      }),
    ).toBeVisible();

    await expect
      .poll(() => expandCalls, { timeout: 20_000 })
      .toBeGreaterThanOrEqual(1);

    // Page stays interactive: canvas shell + mentor panel survive bad expand JSON.
    await expect(
      page.getByRole("region", { name: "Universe canvas" }),
    ).toBeVisible();
    await expect(page.getByLabel("3D knowledge universe")).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Socratic mentor chat" }),
    ).toBeVisible();

    // Mentor controls remain usable (no hard crash / white screen).
    await expect(page.getByLabel("Your response")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
