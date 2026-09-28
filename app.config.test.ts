import { describe, expect, it } from "vitest";
import {
  APP_CONFIG,
  GRAPH_EXPAND_ENDPOINT,
  STATUS_COLOR_TOKENS,
  UNIVERSE_SEED_QUERY_PARAM,
  buildUniverseHref,
  resolveStatusColor,
  shouldTriggerExpansionOnMastery,
} from "./app.config";

describe("APP_CONFIG", () => {
  it("exposes Status-Mastered / Status-Foggy Zero Drift color tokens", () => {
    expect(APP_CONFIG.metadata.seedTopic).toBe("Artificial Intelligence");
    // Status-Mastered — mastered node color property
    expect(APP_CONFIG.ui.colors.mastered).toBe("#10b981");
    expect(STATUS_COLOR_TOKENS.mastered).toBe("#10b981");
    expect(resolveStatusColor("mastered")).toBe("#10b981");
    // Status-Foggy — expansion children
    expect(APP_CONFIG.ui.colors.foggy).toBe("#475569");
    expect(STATUS_COLOR_TOKENS.foggy).toBe("#475569");
    expect(resolveStatusColor("foggy")).toBe("#475569");
    expect(APP_CONFIG.ui.colors.active).toBe("#22d3ee");
    expect(APP_CONFIG.ui.colors.background).toBe("#020617");
  });

  it("keeps Socratic gating defaults and mastery→expand auto-trigger", () => {
    expect(APP_CONFIG.features.ENABLE_SOCRATIC_GATING).toBe(true);
    expect(APP_CONFIG.features.ENABLE_INFINITE_EXPANSION).toBe(true);
    expect(shouldTriggerExpansionOnMastery()).toBe(true);
    expect(APP_CONFIG.features.PERSISTENCE_STRATEGY).toBe("localStorage");
    expect(APP_CONFIG.features.SAFETY_VALVE_ATTEMPTS).toBe(2);
    expect(GRAPH_EXPAND_ENDPOINT).toBe("/api/expand");
  });

  it("never embeds a real OpenAI key in the client-side config contract", () => {
    // Environment Variable Security: real key lives in server .env.local only.
    expect(APP_CONFIG.env.OPENAI_API_KEY).toBe("");
    expect(APP_CONFIG.env.DEFAULT_MODEL).toBe("gpt-4o-mini");
    expect(APP_CONFIG.env.EXPANSION_MODEL).toBe("gpt-4o");
    expect(APP_CONFIG.env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("includes mastery and reveal tokens in the Socratic prompt", () => {
    expect(APP_CONFIG.ai.socraticPrompt).toContain("[MASTERED]");
    expect(APP_CONFIG.ai.socraticPrompt).toContain("[REVEALED]");
    expect(APP_CONFIG.ai.expansionPrompt).toContain('"foggy"');
  });
});

describe("buildUniverseHref", () => {
  it("builds a success href with the provided seed topic", () => {
    expect(buildUniverseHref("Quantum Computing")).toBe(
      `/universe?${UNIVERSE_SEED_QUERY_PARAM}=Quantum+Computing`,
    );
  });

  it("falls back to APP_CONFIG.metadata.seedTopic when the input is blank", () => {
    const expected = `/universe?${UNIVERSE_SEED_QUERY_PARAM}=${encodeURIComponent(
      APP_CONFIG.metadata.seedTopic,
    ).replace(/%20/g, "+")}`;

    expect(buildUniverseHref("")).toBe(expected);
    expect(buildUniverseHref("   ")).toBe(expected);
    expect(buildUniverseHref("\t\n")).toBe(expected);
  });

  it("URL-encodes hostile seed characters so query injection cannot break the route", () => {
    const hostile = 'Ignore previous</script>&seed=evil"';
    const href = buildUniverseHref(hostile);
    const encoded = new URLSearchParams({
      [UNIVERSE_SEED_QUERY_PARAM]: hostile.trim(),
    }).toString();

    expect(href).toBe(`/universe?${encoded}`);
    expect(href).not.toContain("</script>");
    expect(href).not.toContain('seed=evil"');
  });
});
