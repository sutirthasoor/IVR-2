import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Users,
  BarChart3,
  Headphones,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luxe CRM — Call & Lead Management" },
      {
        name: "description",
        content:
          "Role-based CRM and call management portal for sales teams. Manage agents, leads, calls and performance.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Call CRM</span>
        </div>
        <Button asChild>
          <Link to="/login">
            Sign in <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          The CRM your call team
          <br />
          actually wants to use.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Manage agents, assign leads, schedule callbacks and track performance — all from
          one role-aware workspace.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 md:grid-cols-3">
        {[
          {
            icon: Headphones,
            title: "Agent operations",
            text: "Card & table view, performance tiers, bulk lead and callback assignment.",
          },
          {
            icon: Phone,
            title: "Call intelligence",
            text: "Logs, audio playback, transcripts and answer-rate analytics in one place.",
          },
          {
            icon: ShieldCheck,
            title: "Role-based access",
            text: "Super admin, admin, manager and agent — each with the right surface area.",
          },
          {
            icon: Users,
            title: "Lead pipeline",
            text: "CSV import, status tracking, assignment workflows and reassignment.",
          },
          {
            icon: BarChart3,
            title: "Reports",
            text: "Conversion, volume and activity reports — exportable to PDF and CSV.",
          },
        ].map((f) => (
          <Card key={f.title}>
            <CardContent className="p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
