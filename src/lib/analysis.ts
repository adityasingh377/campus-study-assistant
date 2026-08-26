/**
 * Mock analysis layer.
 *
 * This is deliberately the ONLY place where prioritisation logic lives.
 * To move to a real AI workflow later, replace `analyzeExam` with a call to a
 * server function that returns the same `ExamStrategy` shape.
 */

import { PYQ_YEARS, SUBJECT, TOPICS, type Goal, type Topic } from "./study-data";

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
};

export type ExamStrategy = {
  subject: string;
  goal: Goal;
  goalLabel: string;
  timeLabel: string;
  totalMinutes: number;
  studyFirst: RankedTopic[];
  studyLater: RankedTopic[];
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
  const studyFirst: RankedTopic[] = [];
  const studyLater: RankedTopic[] = [];
  let used = 0;

  for (const item of ranked) {
    if (used + item.topic.estimatedMinutes <= budget && studyFirst.length < 5) {
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
    studyFirst,
    studyLater,
  };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
