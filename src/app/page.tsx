import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth";
import { LoginScreen } from "@/components/LoginScreen";

export default async function Home() {
  const role = await currentRole();
  if (role === "kid") redirect("/lab");
  if (role === "parent") redirect("/eltern");
  return <LoginScreen />;
}
