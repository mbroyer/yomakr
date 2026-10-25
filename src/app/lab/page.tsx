import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { MODES } from "@/lib/prompts";
import { KidLab } from "@/components/KidLab";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  if ((await currentRole()) !== "kid") redirect("/");
  const settings = getSettings();
  const modes = MODES.filter((m) => settings.enabledModes.includes(m.id)).map(({ id, title, icon, tagline }) => ({
    id,
    title,
    icon,
    tagline,
  }));
  return <KidLab modes={modes} kidName={process.env.KID_NAME ?? ""} />;
}
