import { describe, expect, it } from "vitest";
import {
  ALL_MODEL_OPTIONS,
  GOOGLE_MODEL_OPTIONS,
  resolveProviderForModel,
} from "./models";

describe("resolveProviderForModel", () => {
  it("routes gemini-* ids to google", () => {
    expect(resolveProviderForModel("gemini-3.5-flash")).toBe("google");
    expect(resolveProviderForModel("models/gemini-3.1-pro-preview")).toBe(
      "google",
    );
  });

  it("routes gpt / o* ids to openai", () => {
    expect(resolveProviderForModel("gpt-4o-mini")).toBe("openai");
    expect(resolveProviderForModel("o4-mini")).toBe("openai");
  });

  it("honors forced provider override", () => {
    expect(resolveProviderForModel("custom-model", "google")).toBe("google");
    expect(resolveProviderForModel("custom-model", "openai")).toBe("openai");
  });
});

describe("model catalog", () => {
  it("includes the free Gemini try-first and architectural options", () => {
    const ids = GOOGLE_MODEL_OPTIONS.map((m) => m.id);
    expect(ids).toContain("gemini-3.5-flash");
    expect(ids).toContain("gemini-3.1-pro-preview");
    expect(ALL_MODEL_OPTIONS.length).toBeGreaterThan(GOOGLE_MODEL_OPTIONS.length);
  });
});
