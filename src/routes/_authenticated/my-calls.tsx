import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/my-calls")({
  component: () => <Navigate to="/calls" />,
});
