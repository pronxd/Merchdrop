import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { isAdminAuthenticated } from "@/lib/auth";
import DashboardEnhanced from "./DashboardEnhanced";
import AccessDenied from "./AccessDenied";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  // Not logged in at all - redirect to sign in
  if (!session) {
    redirect("/admin");
  }

  // Logged in but not a super admin - show access denied
  const isSuperAdmin = await isAdminAuthenticated();

  if (!isSuperAdmin) {
    return <AccessDenied userEmail={session.user?.email || ""} />;
  }

  return <DashboardEnhanced />;
}
