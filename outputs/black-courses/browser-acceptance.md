# Browser acceptance — 21–22 September 2026

Exercised through the application UI in the Codex browser. Most final checks used the production build at `127.0.0.1:5180` with isolated origin storage. The initial Alien vertical slice used the existing development origin at port 5178. Original development-origin repertoire preferences were restored; existing progress was retained.

| Flow | Observed result |
| --- | --- |
| Alien defense main + transfer | 8/8 independently correct; an unlisted legal move entered ungraded exploration and did not award credit or mark assistance |
| Alien journey | All six checkpoints complete, 6/6 independently correct; pending move/reason/reply restored before submission after refresh |
| QGD main + transfer | 8/8 independently correct; keyboard Enter and tap input |
| QGD journey | 6/6 independently correct; submitted first answer and component feedback survived refresh; repaired queen exchange reaches the exact rook-ending checkpoint |
| London main + transfer | 8/8 independently correct on 390px viewport |
| London journey | 6/6 independently correct, including en passant prediction; saved recap reopened successfully |
| Vienna Black main + transfer | 8/8 independently correct using keyboard at 320px |
| Vienna Black journey | 6/6 independently correct; final rook exchanges fully replayed into one rook per side |
| Sicilian main + transfer | 8/8 independently correct |
| Sicilian journey | 6/6 independently correct through rook activity |
| Existing Caro main + transfer | Original questions and all eleven move checkpoints completed |
| Existing Caro journey | All six checkpoints completed. Predicting the illustrative Be5 received Needs review, as the preserved content labels it unsound; other five submissions independently correct. First result retained. |
| Jobava sideline | 8/8 independently correct |
| Alapin sideline | 8/8 independently correct |
| Quiet Caro Advance sideline | 8/8 independently correct |
| Real Stockfish practice | Jobava transfer position handed to local engine, White replied, four Black moves recorded, Plan practice complete recap displayed, return to lesson succeeded |
| White regressions | Vienna opening replay, questions and Be2 response; QGD and Alien opening replay and structure feedback; correct White orientation. Full old lesson paths additionally covered by automated interface tests. |
| Preferences and directory | Original defaults preserved; QGD/London and targeted e4 modules selectable; Foundation core chapters visible; optional Alien/Dragon secondary; chapter progress independent |

Desktop, 390×844 and 320×740 layouts were visually inspected. Mobile document scroll widths equalled the viewport widths (390 and 320). Keyboard selection and tap-square input both worked. No browser error/warning logs were recorded in the production-preview tab. Temporary viewport override was reset.

Screenshots: `sicilian-desktop.png`, `london-390.png`, `vienna-320.png`. `browser-paths.json` contains the authored coordinate/reply paths used for the walkthroughs. Live Stockfish replies were inspected from the board and feedback, not replayed from a mock.

Automation occasionally outran a render during a sequence of clicks; inspecting the current UI and continuing from the displayed checkpoint resolved these tool timeouts. Unknown legal candidates remained ungraded. Engine practice deliberately allows legal exploration and does not claim that every practice move is sound.

Automated coverage, rather than browser clock manipulation, verifies due-review scheduling, exact two-minute reviews, PGN transpositions, remote releases and draft round-trips. No production publishing or deployment was performed.
