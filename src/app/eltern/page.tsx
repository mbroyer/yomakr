import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { listReports, weekStats } from "@/lib/report";
import { MODES } from "@/lib/prompts";
import { ParentDashboard, type Alert } from "@/components/ParentDashboard";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  if ((await currentRole()) !== "parent") redirect("/");
  const alerts = getDb()
    .prepare("SELECT id, category, direction, action, seen, created_at AS createdAt FROM safety_events ORDER BY id DESC LIMIT 30")
    .all() as Alert[];
  return (
    <ParentDashboard
      initialSettings={getSettings()}
      alerts={alerts}
      stats={weekStats()}
      reports={listReports()}
      modes={MODES.map(({ id, title, icon }) => ({ id, title, icon }))}
    />
  );
}
