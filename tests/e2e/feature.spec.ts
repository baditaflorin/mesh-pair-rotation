import { expect, test, type Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer assertion for the ADVERTISED core action:
 * "Suggest fresh pairs by weighted-greedy matching" — generating a sprint
 * pairing on peer A must propagate over the shared Yjs doc so peer B sees the
 * IDENTICAL pairing (same two names, same room).
 *
 * The app gates the mesh behind a name + "Connect" step, so each peer must
 * set a distinct name, arm, and land in the same roster before A can match.
 */

/** Set the per-peer display name via the settings drawer and connect. */
async function joinAs(page: Page, name: string): Promise<void> {
  // The settings drawer may auto-open when no name is set; otherwise click the FAB.
  const drawer = page.locator(".mesh-settings-drawer, .settings-drawer");
  if ((await drawer.count()) === 0) {
    await page.getByLabel("Open settings").click();
  }
  const nameInput = page.getByPlaceholder("Alex");
  await nameInput.fill(name);
  // Close the drawer so its overlay stops intercepting the Connect click.
  await page
    .getByRole("button", { name: /^close$/i })
    .first()
    .click();
  await expect(page.locator(".mesh-settings-overlay")).toHaveCount(0);
  // Arm the mesh — button label flips to "Connect" once a name is set.
  await page.getByRole("button", { name: /^connect$/i }).click();
}

test("a generated pairing on peer A is seen identically by peer B", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await joinAs(a, "Alice");
    await joinAs(b, "Bob");

    // Both peers must see the full roster before matching is meaningful.
    await expect(a.locator(".pair-roster-chip", { hasText: "Alice" })).toBeVisible();
    await expect(a.locator(".pair-roster-chip", { hasText: "Bob" })).toBeVisible();
    await expect(b.locator(".pair-roster-chip", { hasText: "Alice" })).toBeVisible();
    await expect(b.locator(".pair-roster-chip", { hasText: "Bob" })).toBeVisible();

    // Peer A drives the advertised core action: suggest pairs, then confirm.
    await a.getByRole("button", { name: /suggest pairs/i }).click();
    await expect(a.locator(".pair-proposed")).toBeVisible();
    await a.getByRole("button", { name: /confirm and start sprint/i }).click();

    // Peer A now shows the live sprint with the Alice+Bob pairing.
    await expect(a.getByText(/Sprint in progress/i)).toBeVisible();
    await expect(a.locator(".pair-list .pair-card-active")).toContainText("Alice");
    await expect(a.locator(".pair-list .pair-card-active")).toContainText("Bob");

    // THE LOAD-BEARING CROSS-PEER ASSERTION: peer B sees the SAME sprint
    // pairing, written by A into the shared Yjs "sprints" map and observed on B.
    await expect(b.getByText(/Sprint in progress/i)).toBeVisible();
    const bCard = b.locator(".pair-list .pair-card-active");
    await expect(bCard).toContainText("Alice");
    await expect(bCard).toContainText("Bob");
  } finally {
    await cleanup();
  }
});
