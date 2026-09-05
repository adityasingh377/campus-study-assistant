# Audit: analysis speed and time-aware strategy

No code was changed. Findings below come from reading the upload → time/goal → analysis → plan path.

## 1. Where the waiting time actually goes

The wait is almost entirely the single AI request, not the PDF reading.

- PDF text is read the moment a file is picked (syllabus one at a time, past papers in parallel) and cached in the browser session. By the time "Build My Plan" is tapped, extraction is normally already finished; the analysis step only re-reads a file if its text is missing.
- There is exactly one AI request per analysis run, guarded so it cannot fire twice.
- That one request carries a lot of material: up to ~14,000 characters of syllabus plus up to ~9,000 characters per past paper. With 4 papers that is ~50,000 characters in, and it asks the model to write, for every one of 5–9 topics, a summary, an 80–150 word explanation, key points, a practice question and an answer framework — all in one strict structured response. The long written output is the dominant cost.
- The animated checklist on the "Analyzing" screen is cosmetic (about 4.5 seconds of ticks) and does not delay navigation; the screen moves on as soon as the answer arrives.
- Minor, not a bottleneck: the extracted text is re-saved to session storage whenever it changes, and the strategy is recomputed on the client (cheap).

Conclusion: the bottleneck is the size of the one AI request/response — mainly how much prose is requested up front — not extraction, not duplicate calls, not waiting loops.

## 2. How available time is used today

- Time is turned into minutes (3 Hours = 180, 1 Day = 420, 3 Days = 1080, 1 Week = 2100, Custom = typed value) and sent to the AI along with the goal.
- The prompt tells the model the minutes and asks that top-priority topics fit and that the schedule spans 0 to the total, ending with past-paper practice and quick revision.
- After the answer arrives, the only time-based rule applied locally is: fill "Study First" with high/very-high topics until 80% of the minutes is used; everything else drops to "Study Later". The plan's own schedule blocks come straight from the AI.

What time does **not** currently control anywhere in the code:

- the number of topics requested (always 5–9, for 3 hours and for 1 week alike)
- depth of the written study material (same length instructions regardless of time)
- how many minutes each topic gets (the model decides freely)
- how much time goes to revision vs answer practice (no rule)
- syllabus breadth vs selectivity (no rule)

## 3. Do the five time options produce genuinely different plans?

Partly, and only by luck of wording. Minutes and goal appear in the prompt, so the overview text, per-topic minutes and schedule blocks will differ between 3 hours and 1 week. But nothing in the code makes a 1-week plan broader or deeper, or a 3-hour plan strictly top-heavy — the same 5–9 topics with the same depth are requested every time, and the only hard rule (80% budget) just truncates the list. So a 1-week plan today is essentially the 3-hour plan stretched out, which is exactly the outcome you wanted to avoid.

## 4. Hardcoded / fallback content

- A complete Economics — Macroeconomics demo strategy still exists and is used whenever the AI result is absent (7 fixed papers, fixed topics, fixed schedule). It is labelled "Demo data" on the plan screen. This is the one path that can return the same answer repeatedly regardless of uploads.
- Fixed time-message thresholds (180 / 420 / 1080 minutes) and a fixed demo schedule builder.
- The demo path also hardcodes "Study First" caps by time (3 / 4 / 6 topics) — the real AI path has no such cap.
- On the real path, topics, counts, marks notes, questions and frameworks all come from the uploaded text; nothing is hardcoded there. Repetition across runs would come from the identical prompt, not from stored answers (there is no caching at all today).

## 5. Minimum changes to make it genuinely time-aware and faster

Time-aware (small, contained):

1. Add one "time profile" derived from the minutes — topic count target, per-topic depth, share of time for study vs past-paper practice vs revision, and breadth (top-value only → full coverage). Five bands: ≤180, ≤420, ≤1080, >1080, and Custom mapped into the same bands.
2. Feed that profile into the analysis prompt in place of the fixed "return 5–9 topics" instruction, including explicit minute budgets for practice and revision.
3. Apply the profile locally after the answer as a hard guarantee: cap the "Study First" count, scale per-topic minutes to fit the real budget, and ensure the schedule reserves the profile's practice/revision minutes. This keeps the plan honest even when the model drifts.

Faster:

4. Ask for short per-topic material in the first response (name, unit, frequency, marks, why-first, minutes) and generate the long explanation / practice question / answer framework only when a topic's Study screen is opened. This is the single biggest latency win.
5. For short-time plans, request fewer topics (a 3-hour plan needs 3, not 9), which shrinks the response further.
6. Cache the AI result against the uploaded text + time + goal so revisiting the plan, or going back and forward, never re-runs the request; re-run only when time or goal actually changes.
7. Trim the per-paper text sent when many papers are uploaded, so total input stays bounded.

Out of scope, untouched: UI/visual design, PDF extraction, the topic chat, the AI provider, uploads and the Time + Goal screen layout.

## Verification after implementation

Run the same Sociology uploads through all five options and confirm: 3 hours yields the fewest, highest-frequency topics with most time on practice; 1 day is selective; 3 days adds breadth; 1 week covers the widest set with revision passes; Custom follows its band. Confirm no "Demo data" notice appears and topic names come from the uploaded syllabus.
