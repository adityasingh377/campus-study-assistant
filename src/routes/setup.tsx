import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { BackLink, Screen, StepLabel } from "@/components/app-chrome";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { GOALS, TIME_OPTIONS } from "@/lib/study-data";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Time and goal — Campus Study Assistant" },
      {
        name: "description",
        content:
          "Tell us how much time is left and what you're aiming for, and we'll build a study plan that fits.",
      },
      { property: "og:title", content: "How much time do you have?" },
      {
        property: "og:description",
        content: "Your time left and your exam goal decide which topics come first.",
      },
    ],
  }),
  component: SetupScreen,
});

function SetupScreen() {
  const { state, update } = useSession();
  const navigate = useNavigate();
  // Raw text for the custom-minutes field so the user can clear/replace it freely.
  const [minutesText, setMinutesText] = useState(() => String(state.customMinutes));
  const [minutesError, setMinutesError] = useState<string | null>(null);

  // Sync the text field when a different time option (or reset) changes the stored minutes.
  useEffect(() => {
    setMinutesText(String(state.customMinutes));
    setMinutesError(null);
  }, [state.customMinutes, state.timeId]);

  const handleMinutesChange = (raw: string) => {
    // Allow only digits while typing; empty stays empty (no forced default).
    const cleaned = raw.replace(/[^0-9]/g, "");
    setMinutesText(cleaned);
    setMinutesError(null);
    const parsed = Number(cleaned);
    if (cleaned !== "" && Number.isInteger(parsed) && parsed > 0) {
      update({ customMinutes: parsed });
    }
  };

  const handleBuildPlan = () => {
    if (state.timeId === "custom") {
      const parsed = Number(minutesText);
      if (minutesText === "" || !Number.isInteger(parsed) || parsed <= 0) {
        setMinutesError("Enter a valid number of minutes (a positive whole number).");
        return;
      }
      update({ customMinutes: parsed });
    }
    navigate({ to: "/analyzing" });
  };

  return (
    <Screen>
      <BackLink to="/upload">Upload</BackLink>

      <StepLabel>Step 03 / 04</StepLabel>

      <section className="mt-2 mb-10">
        <h1 className="mb-5 text-2xl font-bold tracking-tight">How much time do you have?</h1>
        <div className="grid grid-cols-2 gap-3">
          {TIME_OPTIONS.map((option) => {
            const selected = state.timeId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ timeId: option.id })}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card",
                  option.id === "custom" && "col-span-2",
                )}
              >
                <p className="font-bold">{option.label}</p>
                <p className={cn("text-[10px]", selected ? "opacity-60" : "text-muted-foreground")}>
                  {option.note}
                </p>
              </button>
            );
          })}
        </div>

        {state.timeId === "custom" && (
          <div className="border-border bg-card mt-3 rounded-xl border p-4">
            <label htmlFor="custom-minutes" className="label-mono text-muted-foreground">
              Minutes available
            </label>
            <input
              id="custom-minutes"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={minutesText}
              onChange={(event) => handleMinutesChange(event.target.value)}
              className="border-input mt-2 w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {minutesError && (
              <p role="alert" className="text-destructive mt-2 text-xs">
                {minutesError}
              </p>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold tracking-tight">What&apos;s your goal?</h2>
        <div className="space-y-3">
          {GOALS.map((goal) => {
            const selected = state.goal === goal.id;
            return (
              <button
                key={goal.id}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ goal: goal.id })}
                className={cn(
                  "flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card",
                )}
              >
                <div className="min-w-0">
                  <p className="label-mono font-bold">{goal.label}</p>
                  <p className={cn("text-xs", selected ? "opacity-70" : "text-muted-foreground")}>
                    {goal.description}
                  </p>
                </div>
                <span
                  className={cn(
                    "size-4 shrink-0 rounded-full border",
                    selected ? "bg-ember border-transparent" : "border-border",
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-12">
        <button
          type="button"
          onClick={handleBuildPlan}
          className="bg-ember text-ember-foreground w-full rounded-xl p-5 font-bold shadow-card transition-transform active:scale-95"
        >
          Build My Plan
        </button>
      </div>
    </Screen>
  );
}
