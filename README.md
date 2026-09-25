# Study Smart Now

Build a mobile-first web app called "Campus Study Assistant".

This is an MVP prototype for a college exam-preparation assistant.

IMPORTANT:

For this first version, focus on building the UI and complete clickable user flow.

Use realistic mock data.

Do NOT integrate a real AI API yet.

Do NOT add login, signup, payments, social features, notifications, profiles, or unnecessary features.

PRODUCT PURPOSE

Students often have limited time before exams and struggle to decide what they should study first.

The core product experience is:

Syllabus + Previous-Year Questions + Time Remaining + Exam Goal

→ Analyze

→ Prioritize important topics

→ Explain why they are important

→ Create a study plan

→ Tell the student what to study NOW

TARGET USER

College students preparing shortly before exams.

CORE USER FLOW

Home

→ Upload Syllabus

→ Upload PYQs

→ Enter Time Remaining

→ Select Exam Goal

→ Analyze

→ Exam Strategy Dashboard

→ Why is this important?

→ Study Now

→ Study Plan

SCREEN 1 — HOME

Create a clean, modern landing screen.

Title:

"Your syllabus is big. Your time isn't."

Subtitle:

"Upload your syllabus and previous-year questions. We'll help you figure out what to study first."

Primary button:

"Start Preparing"

Small supporting text:

"Built for last-minute exam preparation."

Keep the screen simple and mobile-first.

SCREEN 2 — UPLOAD SYLLABUS

Title:

"Let's understand your exam."

Subtitle:

"Upload your syllabus as a PDF or image."

Create a large upload area.

Button:

"Upload Syllabus"

After the mock upload, show:

"Economics — Macroeconomics"

"4 Units detected"

✓ Unit I — Macroeconomic Concepts

✓ Unit II — Money

✓ Unit III — Income Determination

✓ Unit IV — IS-LM Analysis

Then show:

"Add Previous-Year Questions"

Subtitle:

"Recommended: 3–7 years of PYQs"

Create an upload area.

Button:

"Continue"

SCREEN 3 — TIME AND GOAL

Title:

"How much time do you have?"

Create selectable cards:

3 Hours

1 Day

3 Days

1 Week

Custom

Then:

"What's your goal?"

Create three selectable cards:

JUST PASS

Focus on the highest-value topics.

SCORE WELL

Focus on high-probability and high-value areas.

FULL PREPARATION

Cover the syllabus systematically.

Primary button:

"Build My Plan"

SCREEN 4 — ANALYZING

Create a short loading/analysis screen.

Title:

"Analyzing your exam..."

Show these steps:

✓ Reading syllabus

✓ Comparing previous-year questions

✓ Finding repeated patterns

✓ Identifying high-value topics

✓ Building your study plan

After a short delay, move to the dashboard.

Use mock data for this prototype.

SCREEN 5 — EXAM STRATEGY DASHBOARD

This is the most important screen.

Header:

"Your Exam Strategy"

Show:

Economics — Macroeconomics

"3 hours remaining"

"Goal: Score Well"

Section:

"🔥 Study First"

Create priority cards.

CARD 1:

"IS-LM Analysis"

"VERY HIGH PRIORITY"

"Appeared in 5 of 7 uploaded papers"

"Estimated time: 40 min"

Button:

"Why this?"

CARD 2:

"Income Determination"

"HIGH PRIORITY"

"Appeared in 4 of 7 uploaded papers"

"Estimated time: 35 min"

CARD 3:

"Money & Banking"

"MEDIUM PRIORITY"

"Appeared in 3 of 7 uploaded papers"

"Estimated time: 25 min"

Then create a smaller:

"Study Later"

section.

At the bottom create a prominent button:

"STUDY NOW →"

SCREEN 6 — WHY THIS TOPIC?

When the user clicks "Why this?" open a detail screen or modal.

Title:

"IS-LM Analysis"

Badge:

"🔥 VERY HIGH PRIORITY"

Show:

"Why we recommend it"

• Appeared in 5 of 7 uploaded papers

• Included in the current syllabus

• Frequently appears as a long-answer question

• High relevance to your selected goal

Then:

"Recommended time"

"40 minutes"

Then:

"Study sequence"

1. Understand IS curve — 10 min

2. Understand LM curve — 10 min

3. Understand equilibrium — 10 min

4. Practice one PYQ — 10 min

Button:

"Start Topic →"

SCREEN 7 — STUDY NOW

Title:

"IS-LM Analysis"

Subtitle:

"40-minute study session"

Create a simple progress indicator.

Section:

"UNDERSTAND"

Provide a short, simple explanation of IS-LM analysis.

Section:

"KEY CONCEPTS"

• IS curve

• LM curve

• Equilibrium

• Interest rate

• Income

Section:

"PRACTICE"

Show:

"Explain the IS-LM model and discuss the determination of equilibrium income and interest rate."

Button:

"Generate Answer Framework"

For this prototype, use mock content.

Keep the page concise.

DESIGN

Make the design:

• Modern

• Clean

• Mobile-first

• Student-focused

• Calm

• Easy to understand

• Strong visual hierarchy

Avoid:

• Excessive gradients

• Too many animations

• Corporate enterprise styling

• A ChatGPT-like chat interface

• Excessive information

• Unnecessary navigation

The most important information on the dashboard should always be:

1. What should I study?

2. Why?

3. How long?

4. What should I do next?

NAVIGATION

Keep navigation minimal.

Use:

Home

My Plan

Do not add unnecessary sections.

IMPORTANT PRODUCT PRINCIPLES

1. PYQ analysis is a core feature.

2. Time remaining affects the study plan.

3. Exam goal affects priorities.

4. Recommendations must explain WHY.

5. The product should focus on decision support rather than simply providing more study material.

6. Do not build a generic chatbot.

7. Do not require login.

8. Do not build progress tracking yet.

9. Do not build a resource library yet.

TECHNICAL REQUIREMENT FOR THIS VERSION

Use mock data and mock analysis.

Structure the code cleanly so that the mock analysis can later be replaced with a real AI workflow and API.

Make every screen and button in the flow functional and clickable.

The complete flow should work from:

Home

→ Upload

→ Time + Goal

→ Analysis

→ Dashboard

→ Why

→ Study Now

Build this first version now.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://exam-aid-coach.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cb8f00c0-d5d1-45c3-bf7c-816e78ff1371).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
