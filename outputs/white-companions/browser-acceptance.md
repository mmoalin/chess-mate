# Local browser acceptance — 25 September 2026

Production preview: `http://localhost:5182/`, with a fresh local learner separate from the existing `127.0.0.1` origin. Tests used the actual browser board and local Stockfish worker. No production publication or learner-data deletion was performed.

| Journey | Result |
| --- | --- |
| Alapin main | Both questions, all four main moves and both transfer moves completed; 8/8 independent answers. Keyboard Enter and two-square clicks exercised. |
| Alapin continuous journey | All six candidate/reason/reply assessments completed; recap 6/6 independently correct. Draft restored across refresh. `alapin-journey.txt` |
| French main | All main and transfer decisions completed; 8/8 independent answers. An unsubmitted radio choice and a submitted answer survived refresh. |
| French continuous journey | All six checkpoints and connecting exchanges completed; recap 6/6. `french-journey.txt` |
| Caro Exchange main | All main and transfer decisions completed at narrow width; 8/8. |
| Caro Exchange continuous journey | All six checkpoints completed; recap 6/6. `caro-exchange-journey.txt` |
| Representative sidelines | Alapin …Nf6, French early …cxd4 and Caro …Bg4 completed, including transfer branches, at 320px. Corresponding `*-sideline.txt` recaps retained. |
| Corrected Alapin …Nc6 transfer | Completed the revised …Nf6 branch with Nc3, …Qf5 and d5. `alapin-corrected-transfer.txt` |
| Independent draft | Selected exd5, entered a plan and predicted Qxd5, refreshed, then submitted the restored draft. Candidate/text/reply remained present; no pre-submission grade. `independent-draft-restored.txt` |
| Recognition drill | Alapin plan and both contrasting scenarios completed; 3/3. French transposition link opened the existing French main lesson. `recognition-drill.txt` |
| Engine practice | Actual Stockfish replies: …Bg7, …Qc7, …Nf4, …Nxd3, …Bf5. Completed four White moves, displayed the practice recap, and returned to the original lesson summary. Practice remained ungraded. `stockfish-practice.txt` |

Selection/navigation checks:

- Fresh onboarding retained Vienna as White and Caro as Black. Companion action added the three White families.
- Training preferences retained all selections and completed sessions after removing French from selection, adding the pack again and refreshing. The already-added action was disabled, preventing duplicate additions.
- Expanded coverage showed named branches, explicit scope, completion separately from mastery and unsupported reply groups. Keyboard Enter operated the summary expanders; route buttons opened their named chapters.
- Alapin's French transposition opened the same French chapter; the completed French record remained in the shared course history.
- Recognition drill's French link opened that same lesson.
- Automated component/graph tests additionally cover partial active releases, edited remote metadata, availability, all declared routes, opposite-colour separation and versioned compatibility.

Responsive checks:

- Desktop: inspected expanded coverage and completed the French main/journey. Final screenshot at 1408 CSS px: `coverage-desktop.png`.
- 390 CSS px: inspected expanded coverage and the shared lesson/journey layout; `coverage-390.png`, `journey-390.png`.
- 320 CSS px: completed representative sidelines, pack/preferences and coverage navigation; `coverage-320.png`, `lesson-320.png`.
- The 320px check exposed the existing body's 320px minimum width conflicting with a non-overlay vertical scrollbar. Removed that minimum. Final document client/scroll widths were 305/305 at a 320px viewport and 375/375 at 390px, with no horizontal overflow. Board controls, wrapped route buttons and scrollable lesson text remain accessible. The final browser console contained no captured errors.

The walkthrough verifies functional behaviour, not measured learning outcomes. Finite-depth engine checks and editorial review are recorded separately in the release documentation.
