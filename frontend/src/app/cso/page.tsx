import { CSODashboardShell } from "@/components/pulse";
import { csoAlertAdapter } from "@/lib/pulse";

export const metadata = {
  title: "CSO Triage Console | PULSE",
};

export default async function CSOPage() {
  const alerts = await csoAlertAdapter.getAlertSnapshot();

  return <CSODashboardShell alerts={alerts} />;
}
