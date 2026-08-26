import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/analysis";

export function Screen({
  children,
  className,
  withNav = false,
}: {
  children: ReactNode;
  className?: string;
  withNav?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-enter mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pt-12",
        withNav ? "pb-32" : "pb-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StepLabel({ children }: { children: ReactNode }) {
  return <p className="label-mono text-muted-foreground">{children}</p>;
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="label-mono text-muted-foreground mb-8 inline-flex items-center gap-2 transition-colors hover:text-foreground"
    >
      ← {children}
    </Link>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  very_high: "text-ember",
  high: "text-foreground/70",
  medium: "text-muted-foreground",
  low: "text-muted-foreground",
};

export function PriorityTag({ priority, label }: { priority: Priority; label: string }) {
  return <p className={cn("label-mono mt-1 font-bold", PRIORITY_STYLES[priority])}>{label}</p>;
}

export function TimeChip({ children }: { children: ReactNode }) {
  return (
    <span className="border-border text-muted-foreground shrink-0 rounded-md border bg-background px-2 py-1 font-mono text-xs">
      {children}
    </span>
  );
}

export function BottomNav() {
  return (
    <nav className="border-border bg-background/85 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[430px] justify-around px-8 py-4">
        <NavItem to="/">Home</NavItem>
        <NavItem to="/plan">My Plan</NavItem>
      </div>
    </nav>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-muted-foreground flex flex-col items-center gap-1"
      activeProps={{ className: "text-ember" }}
      activeOptions={{ exact: to === "/" }}
    >
      {({ isActive }) => (
        <>
          <span
            className={cn("size-1 rounded-full", isActive ? "bg-ember" : "bg-transparent")}
            aria-hidden
          />
          <span className="label-mono font-bold tracking-widest">{children}</span>
        </>
      )}
    </Link>
  );
}
