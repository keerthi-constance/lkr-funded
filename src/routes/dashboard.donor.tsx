import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/backend/auth-functions";
import { FundedAssistant } from "@/components/funded-assistant";

export const Route = createFileRoute("/dashboard/donor")({
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "donor") {
      throw redirect({ to: "/auth/login" });
    }
    return { user };
  },
  component: () => (
    <>
      <Outlet />
      <FundedAssistant />
    </>
  ),
});
