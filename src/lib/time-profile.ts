/**
 * Time profile: the single place where "how much time is left" is turned into
 * concrete planning rules (how many topics, how deep, how much practice and
 * revision). Both the AI prompt and the local plan builder use it, so a 3-hour
 * plan can never be a 1-week plan with smaller numbers.
 *
 * Pure module — safe to import on the client and inside server functions.
 */

export type TimeBand = "sprint" | "focused" | "coverage" | "systematic";

export type TimeProfile = {
  band: TimeBand;
  /** Human label used in prompts and messaging. */
  label: string;
  totalMinutes: number;
  /** Topics to actually plan for (Study First). */
  minTopics: number;
  maxTopics: number;
  /** How many topics the AI should return in total (first list + Study Later). */
  requestedTopics: number;
  /** Minutes reserved for learning topics. */
  studyMinutes: number;
  /** Minutes reserved for previous-year question practice. */
  practiceMinutes: number;
  /** Minutes reserved for revision. */
  revisionMinutes: number;
  /** Depth of the study material for each topic. */
  depth: "essentials" | "standard" | "thorough";
  /** How broadly the syllabus should be covered. */
  breadth: string;
  /** One-line description of the approach, shown when the AI gives no overview. */
  message: string;
};

function build(
  band: TimeBand,
  totalMinutes: number,
  opts: {
    label: string;
    minTopics: number;
    maxTopics: number;
    practiceShare: number;
    revisionShare: number;
    depth: TimeProfile["depth"];
    breadth: string;
    message: string;
  },
): TimeProfile {
  const practiceMinutes = Math.max(10, Math.round(totalMinutes * opts.practiceShare));
  const revisionMinutes = Math.max(5, Math.round(totalMinutes * opts.revisionShare));
  const studyMinutes = Math.max(15, totalMinutes - practiceMinutes - revisionMinutes);
  const maxTopics = Math.max(1, Math.min(opts.maxTopics, Math.floor(studyMinutes / 12) || 1));
  return {
    band,
    label: opts.label,
    totalMinutes,
    minTopics: Math.min(opts.minTopics, maxTopics),
    maxTopics,
    requestedTopics: Math.min(12, maxTopics + 3),
    studyMinutes,
    practiceMinutes,
    revisionMinutes,
    depth: opts.depth,
    breadth: opts.breadth,
    message: opts.message,
  };
}

export function timeProfileFor(totalMinutes: number): TimeProfile {
  const minutes = Math.max(15, Math.round(totalMinutes));

  if (minutes <= 180) {
    return build("sprint", minutes, {
      label: "Emergency crash preparation",
      minTopics: 3,
      maxTopics: 3,
      practiceShare: 0.2,
      revisionShare: 0.1,
      depth: "essentials",
      breadth:
        "Only the 3 highest-value topics: most repeated in the papers and carrying the highest marks. Skip everything else openly.",
      message: "Emergency plan — only the highest-value repeated topics fit. Skip the rest.",
    });
  }
  if (minutes <= 420) {
    return build("focused", minutes, {
      label: "One-day preparation",
      minTopics: 4,
      maxTopics: 4,
      practiceShare: 0.2,
      revisionShare: 0.15,
      depth: "standard",
      breadth:
        "Be selective: the 4 most repeated / highest-mark topics only, no attempt at full coverage.",
      message: "One-day plan — the highest-value topics, then practice and revision.",
    });
  }
  if (minutes <= 1080) {
    return build("coverage", minutes, {
      label: "Multi-day preparation",
      minTopics: 5,
      maxTopics: 6,
      practiceShare: 0.2,
      revisionShare: 0.2,
      depth: "standard",
      breadth: "Broader coverage: touch every major syllabus unit, deeper on repeated topics.",
      message: "Multi-day plan — every major unit gets a pass, with real practice time.",
    });
  }
  return build("systematic", minutes, {
    label: "Extended preparation",
    minTopics: 7,
    maxTopics: 10,
    practiceShare: 0.2,
    revisionShare: 0.25,
    depth: "thorough",
    breadth:
      "Broadest reasonable coverage: the full syllabus unit by unit, with two revision passes.",
    message: "Full runway — work through the syllabus unit by unit, then revise twice.",
  });
}

/** Depth instruction used in prompts. */
export const DEPTH_NOTE: Record<TimeProfile["depth"], string> = {
  essentials: "Keep guidance to the bare essentials a student can memorise fast.",
  standard: "Give solid working understanding with the main sub-points.",
  thorough: "Go deep: sub-topics, links between units and common examiner traps.",
};
