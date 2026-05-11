import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/my-leads")({
  component: () => <Navigate to="/leads" />,
});
