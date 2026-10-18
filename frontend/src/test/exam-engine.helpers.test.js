import { describe, expect, it } from "vitest";
import { formatOptionLabel, getRecordedIncidentCount } from "../pages/student/ExamEngine";

describe("exam engine display and incident helpers", () => {
  it("formats technical option identifiers without changing their values", () => {
    expect(formatOptionLabel("opt_a")).toBe("A");
    expect(formatOptionLabel("opt_b")).toBe("B");
    expect(formatOptionLabel("opt_c")).toBe("C");
    expect(formatOptionLabel("opt_d")).toBe("D");
  });

  it("uses the persisted server incident count and does not locally increment it", () => {
    const attempt = { totalTabSwitches: 5 };
    expect(getRecordedIncidentCount(attempt, { tabSwitches: 5 })).toBe(5);
    expect(getRecordedIncidentCount(attempt, { tabSwitches: 5 })).toBe(5);
    expect(getRecordedIncidentCount({ totalTabSwitches: 2 }, {})).toBe(2);
  });
});
