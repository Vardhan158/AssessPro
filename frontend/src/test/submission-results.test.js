import { describe, expect, it } from "vitest";
import { hasPublishedResults } from "../pages/student/SubmissionConfirmation";

describe("submission result publication access", () => {
  it("keeps unpublished scores unavailable", () => {
    expect(hasPublishedResults({ resultsPublished: false, score: 2 })).toBe(false);
    expect(hasPublishedResults({ score: 2 })).toBe(false);
  });

  it("allows result access only after publication", () => {
    expect(hasPublishedResults({ resultsPublished: true, score: 2 })).toBe(true);
  });
});
