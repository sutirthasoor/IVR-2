import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "./lib/auth-context";
import { FirebaseDataProvider } from "./lib/firebase-context";
import React from "react";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { 
      queryClient,
    },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

// Wrap your app component with providers
export function AppWithProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FirebaseDataProvider>
        {children}
      </FirebaseDataProvider>
    </AuthProvider>
  );
}