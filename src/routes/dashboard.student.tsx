import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/backend/auth-functions";

export const Route = createFileRoute("/dashboard/student")({
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "student") {
      throw redirect({ to: "/auth/login" });
    }
    return { user };
  },
  component: () => <Outlet />,
});
