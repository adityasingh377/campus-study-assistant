/**
 * Mock analysis layer.
 *
 * This is deliberately the ONLY place where prioritisation logic lives.
 * To move to a real AI workflow later, replace `analyzeExam` with a call to a
 * server function that returns the same `ExamStrategy` shape.
 */

import { PYQ_YEARS, SUBJECT, TOPICS, type Goal, type Topic } from "./study-data";
import type { AiStrategy } from "./exam-analysis.functions";

export type Priority = "very_high" | "high" | "medium" | "low";

export const PRIORITY_LABEL: Record<Priority, string> = {
  very_high: "Very high priority",
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

export type RankedTopic = {
  topic: Topic;
  priority: Priority;
  score: number;
  reasons: string[];
  /** Marks/weight as printed in the uploaded papers (AI results only). */
  marksNote?: string;
  /** One-line justification for studying this first (AI results only). */
  whyFirst?: string;
};

export type ScheduleBlock = {
  label: string;
  detail: string;
  startMinute: number;
  endMinute: number;
};

export type ExamStrategy = {
  subject: string;
  goal: Goal;
  goalLabel: string;
  timeLabel: string;
  totalMinutes: number;
  /** Short message derived from the selected time budget. */
  timeMessage: string;
  studyFirst: RankedTopic[];
  studyLater: RankedTopic[];
  /** How many previous-year papers the counts refer to. */
  totalPapers: number;
  /** Time-boxed plan across the available minutes. */
  schedule: ScheduleBlock[];
  /** True when this is the fallback demo strategy, not analysis of real uploads. */
  isDemo: boolean;
};

const GOAL_LABEL: Record<Goal, string> = {
  just_pass: "Just Pass",
  score_well: "Score Well",
  full_prep: "Full Preparation",
};

/** Goal changes what the score rewards. */
function scoreTopic(topic: Topic, goal: Goal): number {
  const frequency = topic.appearedIn / PYQ_YEARS;
  const weight = topic.questionType === "long answer" ? 1 : 0.75;
  const effort = topic.estimatedMinutes / 40;

  if (goal === "just_pass") {
    // Only raw payoff per minute matters.
    return (frequency * weight) / Math.max(effort, 0.4);
  }
  if (goal === "full_prep") {
    // Flatten frequency so the whole syllabus stays in play.
    return 0.5 + frequency * 0.5;
  }
  return frequency * 0.7 + weight * 0.3;
}

/** Mock rule: message tone depends only on the selected time budget. */
function timeMessageFor(totalMinutes: number): string {
  if (totalMinutes <= 180) {
    return "Emergency plan — only the most important topics fit. Skip everything else.";
  }
  if (totalMinutes <= 420) {
    return "Focused push — the highest-value topics plus a quick pass over the rest.";
  }
  if (totalMinutes <= 1080) {
    return "Broader plan — enough time to cover most of the syllabus properly.";
  }
  return "Full runway — work through the syllabus systematically.";
}

function priorityFor(score: number, max: number): Priority {
  const ratio = max === 0 ? 0 : score / max;
  if (ratio >= 0.9) return "very_high";
  if (ratio >= 0.7) return "high";
  if (ratio >= 0.45) return "medium";
  return "low";
}

function reasonsFor(topic: Topic, goal: Goal, priority: Priority): string[] {
  const reasons = [
    `Appeared in ${topic.appearedIn} of ${PYQ_YEARS} uploaded papers`,
    `Included in the current syllabus (${topic.unit})`,
    `Frequently appears as a ${topic.questionType} question`,
  ];
  if (priority === "very_high" || priority === "high") {
    reasons.push(`High relevance to your selected goal: ${GOAL_LABEL[goal]}`);
  } else {
    reasons.push(`Lower weight under your selected goal: ${GOAL_LABEL[goal]}`);
  }
  return reasons;
}

export function analyzeExam(input: {
  goal: Goal;
  totalMinutes: number;
  timeLabel: string;
}): ExamStrategy {
  const { goal, totalMinutes, timeLabel } = input;

  const scored = TOPICS.map((topic) => ({ topic, score: scoreTopic(topic, goal) })).sort(
    (a, b) => b.score - a.score,
  );

  const max = scored[0]?.score ?? 0;

  const ranked: RankedTopic[] = scored.map(({ topic, score }) => {
    const priority = priorityFor(score, max);
    return { topic, score, priority, reasons: reasonsFor(topic, goal, priority) };
  });

  // Time remaining decides how much actually fits into "Study First".
  const budget = Math.round(totalMinutes * 0.8);
  // With very little time left, keep the list short enough to act on.
  const maxFirst = totalMinutes <= 180 ? 3 : totalMinutes <= 420 ? 4 : 6;
  const studyFirst: RankedTopic[] = [];
  const studyLater: RankedTopic[] = [];
  let used = 0;

  for (const item of ranked) {
    if (used + item.topic.estimatedMinutes <= budget && studyFirst.length < maxFirst) {
      studyFirst.push(item);
      used += item.topic.estimatedMinutes;
    } else {
      studyLater.push(item);
    }
  }

  if (studyFirst.length === 0 && ranked[0]) {
    studyFirst.push(ranked[0]);
    studyLater.shift();
  }

  return {
    subject: SUBJECT,
    goal,
    goalLabel: GOAL_LABEL[goal],
    timeLabel,
    totalMinutes,
    timeMessage: timeMessageFor(totalMinutes),
    studyFirst,
    studyLater,
    totalPapers: PYQ_YEARS,
    schedule: demoSchedule(studyFirst, totalMinutes),
    isDemo: true,
  };
}

/** Simple time-boxing for the demo fallback strategy. */
function demoSchedule(studyFirst: RankedTopic[], totalMinutes: number): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  let cursor = 0;
  const reserve = Math.min(Math.round(totalMinutes * 0.3), 60);
  for (const item of studyFirst) {
    const end = Math.min(cursor + item.topic.estimatedMinutes, totalMinutes - reserve);
    if (end <= cursor) break;
    blocks.push({
      label: item.topic.name,
      detail: item.topic.summary,
      startMinute: cursor,
      endMinute: end,
    });
    cursor = end;
  }
  if (cursor < totalMinutes) {
    const mid = Math.round(cursor + (totalMinutes - cursor) / 2);
    blocks.push({
      label: "PYQ practice",
      detail: "Attempt past questions on the topics above.",
      startMinute: cursor,
      endMinute: mid,
    });
    blocks.push({
      label: "Rapid revision",
      detail: "Skim key concepts and answer frameworks.",
      startMinute: mid,
      endMinute: totalMinutes,
    });
  }
  return blocks;
}

/** Convert the AI's analysis of the uploaded documents into the UI's strategy shape. */
export function strategyFromAi(input: {
  ai: AiStrategy;
  goal: Goal;
  totalMinutes: number;
  timeLabel: string;
}): ExamStrategy {
  const { ai, goal, totalMinutes, timeLabel } = input;
  const profile = timeProfileFor(totalMinutes);
  const used = new Set<string>();

  const ranked: RankedTopic[] = ai.topics.map((t, index) => {
    let id = slugify(t.name) || `topic-${index + 1}`;
    while (used.has(id)) id = `${id}-${index + 1}`;
    used.add(id);

    const topic: Topic = {
      id,
      name: t.name,
      unit: t.unit,
      appearedIn: t.appearedIn,
      estimatedMinutes: Math.max(5, Math.round(t.estimatedMinutes)),
      questionType: t.questionType,
      summary: t.summary,
      // Long study material is generated on demand on the study screen.
      explanation: "",
      keyConcepts: [],
      sequence: [],
      practiceQuestion: "",
      answerFramework: [],
    };

    const reasons = [...t.reasons];
    if (t.marksNote) reasons.unshift(t.marksNote);

    return {
      topic,
      priority: t.priority,
      score: ai.topics.length - index,
      reasons,
      ...(t.marksNote ? { marksNote: t.marksNote } : {}),
      whyFirst: t.whyFirst,
    };
  });

  // The time profile decides how many topics are actually planned for, so a
  // 3-hour plan is a short top-value list and a 1-week plan is broad.
  const count = Math.max(1, Math.min(profile.maxTopics, ranked.length));
  const studyFirst = ranked.slice(0, count);
  const studyLater = ranked.slice(count);

  // Scale the per-topic minutes so they always fit the learning budget for
  // this time band (never longer, and never a token 5 minutes for a week).
  const rawTotal = studyFirst.reduce((sum, item) => sum + item.topic.estimatedMinutes, 0) || 1;
  const factor = profile.studyMinutes / rawTotal;
  if (factor < 0.95 || factor > 1.15) {
    for (const item of studyFirst) {
      item.topic.estimatedMinutes = Math.max(10, Math.round((item.topic.estimatedMinutes * factor) / 5) * 5);
    }
  }

  return {
    subject: ai.subject,
    goal,
    goalLabel: GOAL_LABEL[goal],
    timeLabel,
    totalMinutes,
    timeMessage: ai.overview || profile.message,
    studyFirst,
    studyLater,
    totalPapers: ai.totalPapers,
    schedule: buildSchedule(studyFirst, profile, ai.schedule),
    isDemo: false,
  };
}

/**
 * Build the timeline from the time profile so practice and revision minutes are
 * always reserved. AI schedule details are reused as block descriptions.
 */
function buildSchedule(
  studyFirst: RankedTopic[],
  profile: TimeProfile,
  aiSchedule: AiStrategy["schedule"],
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  const detailFor = (name: string) =>
    aiSchedule.find((b) => b.label.toLowerCase().includes(name.toLowerCase()))?.detail;

  const learn = Math.min(
    profile.studyMinutes,
    studyFirst.reduce((sum, item) => sum + item.topic.estimatedMinutes, 0),
  );
  let cursor = 0;
  for (const item of studyFirst) {
    const end = Math.min(cursor + item.topic.estimatedMinutes, learn);
    if (end <= cursor) break;
    blocks.push({
      label: item.topic.name,
      detail: detailFor(item.topic.name) ?? item.whyFirst ?? item.topic.summary,
      startMinute: cursor,
      endMinute: end,
    });
    cursor = end;
  }

  const remaining = profile.totalMinutes - cursor;
  if (remaining > 0) {
    const practice = Math.max(
      5,
      Math.round(
        (remaining * profile.practiceMinutes) /
          Math.max(1, profile.practiceMinutes + profile.revisionMinutes),
      ),
    );
    const practiceEnd = Math.min(profile.totalMinutes, cursor + practice);
    blocks.push({
      label: "Previous-year question practice",
      detail:
        detailFor("practice") ??
        "Write full answers to past questions on the topics above, timed.",
      startMinute: cursor,
      endMinute: practiceEnd,
    });
    if (practiceEnd < profile.totalMinutes) {
      blocks.push({
        label: profile.band === "systematic" ? "Revision passes" : "Rapid revision",
        detail:
          detailFor("revis") ??
          (profile.band === "systematic"
            ? "Two passes: key concepts first, then answer frameworks unit by unit."
            : "Skim key concepts and answer frameworks for each topic above."),
        startMinute: practiceEnd,
        endMinute: profile.totalMinutes,
      });
    }
  }

  return blocks;
}


function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
