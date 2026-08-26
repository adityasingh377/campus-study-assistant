/**
 * Mock exam data. This module is the single source of "content" for the
 * prototype. Replacing it (or the analysis in ./analysis.ts) with a real
 * AI workflow requires no UI changes.
 */

export type Goal = "just_pass" | "score_well" | "full_prep";

export const GOALS: { id: Goal; label: string; description: string }[] = [
  {
    id: "just_pass",
    label: "Just Pass",
    description: "Focus on the highest-value topics.",
  },
  {
    id: "score_well",
    label: "Score Well",
    description: "Focus on high-probability and high-value areas.",
  },
  {
    id: "full_prep",
    label: "Full Preparation",
    description: "Cover the syllabus systematically.",
  },
];

export const TIME_OPTIONS: { id: string; label: string; note: string; minutes: number }[] = [
  { id: "3h", label: "3 Hours", note: "The last stretch", minutes: 180 },
  { id: "1d", label: "1 Day", note: "Focused push", minutes: 420 },
  { id: "3d", label: "3 Days", note: "Real coverage", minutes: 1080 },
  { id: "1w", label: "1 Week", note: "Systematic", minutes: 2100 },
  { id: "custom", label: "Custom", note: "Set your own", minutes: 240 },
];

export const SUBJECT = "Economics — Macroeconomics";
export const PYQ_YEARS = 7;

export const SYLLABUS_FILE = "Economics_Macro_Syllabus.pdf";
export const PYQ_FILE = "Macro_PYQ_2018-2024.pdf";

export const SYLLABUS_UNITS = [
  "Unit I — Macroeconomic Concepts",
  "Unit II — Money",
  "Unit III — Income Determination",
  "Unit IV — IS-LM Analysis",
];

export type Topic = {
  id: string;
  name: string;
  unit: string;
  appearedIn: number;
  estimatedMinutes: number;
  questionType: "long answer" | "short answer" | "numerical";
  summary: string;
  explanation: string;
  keyConcepts: string[];
  sequence: { step: string; minutes: number }[];
  practiceQuestion: string;
  answerFramework: string[];
};

export const TOPICS: Topic[] = [
  {
    id: "is-lm-analysis",
    name: "IS-LM Analysis",
    unit: "Unit IV",
    appearedIn: 5,
    estimatedMinutes: 40,
    questionType: "long answer",
    summary: "Core model linking the goods market and the money market.",
    explanation:
      "The IS-LM model shows how the goods market and the money market settle at one point together. The IS curve traces every combination of income and interest rate where planned investment equals saving — it slopes downward because a lower interest rate encourages investment, which raises income. The LM curve traces combinations where money demand equals money supply — it slopes upward because higher income raises the demand for money, pushing the interest rate up. Where the two curves cross, you get the equilibrium level of income and the equilibrium interest rate at the same time. Shifting either curve (through fiscal or monetary policy) moves that intersection, which is exactly what examiners ask you to trace.",
    keyConcepts: ["IS curve", "LM curve", "Equilibrium", "Interest rate", "Income"],
    sequence: [
      { step: "Understand IS curve", minutes: 10 },
      { step: "Understand LM curve", minutes: 10 },
      { step: "Understand equilibrium", minutes: 10 },
      { step: "Practice one PYQ", minutes: 10 },
    ],
    practiceQuestion:
      "Explain the IS-LM model and discuss the determination of equilibrium income and interest rate.",
    answerFramework: [
      "Define the model and state what each curve represents.",
      "Derive the IS curve from saving and investment; explain the downward slope.",
      "Derive the LM curve from money demand and supply; explain the upward slope.",
      "Draw the intersection and label equilibrium income (Y*) and interest rate (r*).",
      "Close with one policy shift (fiscal or monetary) and the new equilibrium.",
    ],
  },
  {
    id: "income-determination",
    name: "Income Determination",
    unit: "Unit III",
    appearedIn: 4,
    estimatedMinutes: 35,
    questionType: "long answer",
    summary: "Keynesian equilibrium output and the multiplier.",
    explanation:
      "Income is determined where aggregate demand equals aggregate output. Consumption depends on income through the marginal propensity to consume, so any injection of spending multiplies through the economy. The multiplier, 1/(1−MPC), tells you how much equilibrium income rises for a given rise in autonomous spending.",
    keyConcepts: ["Aggregate demand", "MPC", "Multiplier", "Equilibrium output"],
    sequence: [
      { step: "Consumption function", minutes: 10 },
      { step: "Aggregate demand and equilibrium", minutes: 10 },
      { step: "Multiplier derivation", minutes: 8 },
      { step: "Practice one numerical", minutes: 7 },
    ],
    practiceQuestion:
      "Explain how equilibrium income is determined in a two-sector economy and derive the investment multiplier.",
    answerFramework: [
      "State the equilibrium condition Y = C + I.",
      "Write the consumption function and define MPC.",
      "Solve for equilibrium income algebraically.",
      "Derive the multiplier and interpret its size.",
      "Add a short numerical illustration.",
    ],
  },
  {
    id: "money-banking",
    name: "Money & Banking",
    unit: "Unit II",
    appearedIn: 3,
    estimatedMinutes: 25,
    questionType: "short answer",
    summary: "Money supply, demand and credit creation.",
    explanation:
      "Money serves as a medium of exchange, a store of value and a unit of account. Commercial banks create credit on top of reserves, and the money multiplier links base money to the total money supply. Money demand comes from transactions, precaution and speculation.",
    keyConcepts: ["Money supply", "Credit creation", "Money multiplier", "Liquidity preference"],
    sequence: [
      { step: "Functions and measures of money", minutes: 8 },
      { step: "Credit creation process", minutes: 9 },
      { step: "Practice two short answers", minutes: 8 },
    ],
    practiceQuestion:
      "Explain the process of credit creation by commercial banks and the limits on it.",
    answerFramework: [
      "Define money supply measures briefly.",
      "Explain reserves and the deposit expansion process.",
      "State the money multiplier formula.",
      "List two or three limits on credit creation.",
    ],
  },
  {
    id: "inflation-unemployment",
    name: "Inflation & Unemployment",
    unit: "Unit I",
    appearedIn: 2,
    estimatedMinutes: 20,
    questionType: "short answer",
    summary: "Causes of inflation and the Phillips curve trade-off.",
    explanation:
      "Inflation can be demand-pull or cost-push. The Phillips curve describes a short-run trade-off between inflation and unemployment that weakens once expectations adjust.",
    keyConcepts: ["Demand-pull", "Cost-push", "Phillips curve", "Expectations"],
    sequence: [
      { step: "Types and causes of inflation", minutes: 8 },
      { step: "Phillips curve trade-off", minutes: 7 },
      { step: "Practice one short answer", minutes: 5 },
    ],
    practiceQuestion: "Distinguish between demand-pull and cost-push inflation with examples.",
    answerFramework: [
      "Define inflation and measurement.",
      "Explain demand-pull with a diagram reference.",
      "Explain cost-push with an example.",
      "Note one policy response for each.",
    ],
  },
  {
    id: "macro-concepts",
    name: "Macroeconomic Concepts",
    unit: "Unit I",
    appearedIn: 2,
    estimatedMinutes: 15,
    questionType: "short answer",
    summary: "Basic definitions and circular flow.",
    explanation:
      "Macroeconomics studies aggregates: output, employment, the price level and the circular flow of income between households, firms, government and the rest of the world.",
    keyConcepts: ["Circular flow", "Stock vs flow", "Aggregates"],
    sequence: [
      { step: "Key definitions", minutes: 7 },
      { step: "Circular flow diagram", minutes: 8 },
    ],
    practiceQuestion: "Explain the circular flow of income in a four-sector economy.",
    answerFramework: [
      "Define the circular flow.",
      "Add each sector one at a time.",
      "Show injections and leakages.",
    ],
  },
  {
    id: "national-income",
    name: "National Income Accounting",
    unit: "Unit I",
    appearedIn: 1,
    estimatedMinutes: 20,
    questionType: "numerical",
    summary: "Methods of measuring national income.",
    explanation:
      "National income can be measured by the product, income or expenditure method. Each should give the same total, and the common exam trap is double counting.",
    keyConcepts: ["Product method", "Income method", "Expenditure method", "Double counting"],
    sequence: [
      { step: "Three measurement methods", minutes: 10 },
      { step: "Practice one numerical", minutes: 10 },
    ],
    practiceQuestion: "Calculate national income using the expenditure method from the given data.",
    answerFramework: [
      "List the components of expenditure.",
      "Adjust for net factor income from abroad.",
      "Show the arithmetic clearly.",
    ],
  },
];
