import { describe, expect, it } from "vitest";
import { buildFieldOpsTasks } from "@/components/field-ops/field-ops-task-queue";

describe("buildFieldOpsTasks", () => {
  it("prioritizes recent violations and survival due projects", () => {
    const tasks = buildFieldOpsTasks({
      projects: [
        {
          id: "p1",
          name: "Highway Package A",
          code: "HWY-A",
          open_violations: 2,
          survival_due: 3,
        },
      ],
      recent_violations: [
        {
          id: "v1",
          project_id: "p1",
          project_name: "Highway Package A",
          severity: "high",
          message: "Tree outside work area",
          tree_id: "t1",
        },
      ],
    });

    expect(tasks.length).toBeGreaterThanOrEqual(2);
    expect(tasks[0]?.href).toBe("/trees/t1");

    const complianceTask = buildFieldOpsTasks({
      projects: [],
      recent_violations: [
        {
          id: "v2",
          project_id: "p2",
          project_name: "Mine belt",
          severity: "medium",
          message: "Missing safeguard",
          tree_id: null,
        },
      ],
    });
    expect(complianceTask[0]?.href).toBe("/projects/p2/compliance?section=issues");
    expect(tasks.some((task) => task.kind === "survival")).toBe(true);
    expect(tasks.find((task) => task.kind === "survival")?.href).toBe(
      "/trees?project=p1&category=geotag_due",
    );
  });
});
