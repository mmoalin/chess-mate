import type { User } from '@supabase/supabase-js';
import { BookOpen, Brain, ChevronLeft, ChevronRight, ClipboardList, List, RotateCcw, Swords } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ChessBoardUI } from './components/ChessBoardUI';
import { AuthPanel } from './components/AuthPanel';
import { GameManager } from './core/gameManager';
import type { BoardOrientation, GameMode } from './core/types';
import { starterRepertoires } from './data/repertoires';
import { calculateModuleProgress, starterCurriculumModules } from './features/curriculum/curriculum';
import type { CurriculumTaskProgress } from './features/curriculum/types';
import {
  buildReviewItemFromMistake,
  createLearnerSetup,
  detectOpeningFromHistory,
  recommendNextActivity,
  scoreCurriculumAttempt,
  summarizeLearningProgress
} from './features/journey/journey';
import type { CurriculumAttempt, LearnerSetup, ReviewItem } from './features/journey/types';
import { OpeningTrainer } from './features/openings/openingTrainer';
import type { RepertoireLine, RepertoireSide, TrainingProgress } from './features/openings/types';
import { EngineService } from './services/engineService';
import { createSupabaseBrowserClient, getSupabaseUnavailableReason, SupabasePersistence } from './services/supabasePersistence';
import './styles.css';

const modes: Array<{ id: GameMode; label: string; icon: React.ComponentType<{ size: number }> }> = [
  { id: 'opening-trainer', label: 'Openings', icon: Brain },
  { id: 'curriculum', label: 'Study', icon: BookOpen },
  { id: 'game-review', label: 'Review', icon: ClipboardList },
  { id: 'play-engine', label: 'Play', icon: Swords }
];

export default function App() {
  const managerRef = useRef(new GameManager());
  const engineRef = useRef(new EngineService());
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseUnavailableReason = useMemo(() => getSupabaseUnavailableReason(), []);
  const persistence = useMemo(() => new SupabasePersistence(supabaseClient), [supabaseClient]);
  const trainer = useMemo(() => new OpeningTrainer(starterRepertoires), []);

  const [mode, setMode] = useState<GameMode>('opening-trainer');
  const [snapshot, setSnapshot] = useState(managerRef.current.snapshot());
  const [side, setSide] = useState<RepertoireSide>('white');
  const [lineId, setLineId] = useState('white-vienna-main');
  const [themeFilter, setThemeFilter] = useState('all');
  const [moduleId, setModuleId] = useState(starterCurriculumModules[0]?.id ?? '');
  const [moveIndex, setMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState('Choose a repertoire line and play the highlighted sequence.');
  const [lessonCard, setLessonCard] = useState<{ title: string; principle: string; summary: string } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [orientation, setOrientation] = useState<BoardOrientation>('white');
  const [pgnInput, setPgnInput] = useState('1. e4 e5 2. Nf3 Nc6');
  const [reviewPly, setReviewPly] = useState(0);
  const [analysis, setAnalysis] = useState('Engine analysis appears here.');
  const [user, setUser] = useState<User | null>(null);
  const [learnerSetup, setLearnerSetup] = useState<LearnerSetup | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [localProgress, setLocalProgress] = useState<TrainingProgress[]>([]);
  const [hintText, setHintText] = useState('');
  const [studyAnswer, setStudyAnswer] = useState('');
  const [curriculumAttempts, setCurriculumAttempts] = useState<Record<string, CurriculumAttempt>>({});
  const [reviewDetection, setReviewDetection] = useState<{ lineName: string; matchedPlyCount: number; leftBookAtPly: number | null } | null>(
    null
  );
  const [learnerPlan, setLearnerPlan] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const sideLines = trainer.linesForSide(side);
  const visibleSideLines =
    themeFilter === 'all' ? sideLines : sideLines.filter((line) => line.themeTags?.includes(themeFilter));
  const activeLine = visibleSideLines.find((line) => line.id === lineId) ?? visibleSideLines[0] ?? sideLines[0];
  const availableThemes = useMemo(
    () => Array.from(new Set(sideLines.flatMap((line) => line.themeTags ?? []))).sort(),
    [sideLines]
  );
  const activeModule = starterCurriculumModules.find((module) => module.id === moduleId) ?? starterCurriculumModules[0];
  const activeTask = activeModule?.tasks[0];
  const taskProgress: CurriculumTaskProgress[] = activeModule
    ? activeModule.tasks
        .map((task) => curriculumAttempts[task.id])
        .filter((attempt): attempt is CurriculumAttempt => Boolean(attempt))
        .map((attempt) => ({
          taskId: attempt.taskId,
          completed: attempt.completed,
          score: attempt.score,
          attempts: attempt.attempts,
          lastReviewedAt: attempt.lastReviewedAt
        }))
    : [];
  const activeModuleProgress = activeModule ? calculateModuleProgress(activeModule, taskProgress) : null;
  const nextActivity = learnerSetup
    ? recommendNextActivity({
        setup: learnerSetup,
        lines: starterRepertoires,
        reviewItems,
        now: new Date().toISOString()
      })
    : null;
  const progressSummary = summarizeLearningProgress({
    lines: starterRepertoires,
    progress: localProgress,
    reviewItems,
    now: new Date().toISOString()
  });

  function refresh() {
    setSnapshot(managerRef.current.snapshot());
  }

  async function persistProgress(line: RepertoireLine, result: ReturnType<OpeningTrainer['recordMove']>) {
    if (!user) return;

    const now = new Date().toISOString();
    const progress: TrainingProgress = {
      userId: user.id,
      lineId: line.id,
      side: line.side,
      status: result.completed ? 'completed' : result.status === 'incorrect' ? 'needs-review' : 'in-progress',
      correctCount: result.status === 'correct' ? 1 : 0,
      incorrectCount: result.status === 'incorrect' ? 1 : 0,
      nextMoveIndex: result.nextMoveIndex,
      updatedAt: now
    };

    await persistence.upsertProgress(progress);
  }

  function startLearning() {
    const setup = createLearnerSetup({
      sidePreference: 'both',
      experienceLevel: 'beginner',
      studyTimeMinutes: 10,
      openingStyle: 'active',
      lines: starterRepertoires
    });
    setLearnerSetup(setup);
    setMode('opening-trainer');
    setLineId(setup.recommendedWhiteLineId);
    setFeedback('Start with the idea, then play the first move when you are ready.');
  }

  function upsertLocalProgress(line: RepertoireLine, result: ReturnType<OpeningTrainer['recordMove']>) {
    setLocalProgress((items) => {
      const existing = items.find((item) => item.lineId === line.id);
      const next: TrainingProgress = {
        userId: user?.id ?? 'local',
        lineId: line.id,
        side: line.side,
        status: result.completed ? 'mastered' : result.status === 'incorrect' ? 'needs-review' : 'learning',
        correctCount: (existing?.correctCount ?? 0) + (result.status === 'correct' ? 1 : 0),
        incorrectCount: (existing?.incorrectCount ?? 0) + (result.status === 'incorrect' ? 1 : 0),
        nextMoveIndex: result.nextMoveIndex,
        lastReviewedAt: new Date().toISOString(),
        streak: result.status === 'correct' ? (existing?.streak ?? 0) + 1 : 0,
        mistakeCount: (existing?.mistakeCount ?? 0) + (result.status === 'incorrect' ? 1 : 0),
        themeWeaknesses:
          result.status === 'incorrect'
            ? Array.from(new Set([...(existing?.themeWeaknesses ?? []), ...(line.themeTags ?? [])]))
            : existing?.themeWeaknesses ?? [],
        updatedAt: new Date().toISOString()
      };

      return existing ? items.map((item) => (item.lineId === line.id ? next : item)) : [...items, next];
    });
  }

  function addReviewItem(item: ReviewItem) {
    setReviewItems((items) => (items.some((existing) => existing.id === item.id) ? items : [...items, item]));
  }

  function handleMove(from: string, to: string, promotion?: string) {
    const move = managerRef.current.attemptMove(from, to, promotion);
    if (!move.ok) {
      setFeedback(move.reason);
      return false;
    }

    setLastMove({ from, to });

    if (mode === 'opening-trainer' && activeLine) {
      const result = trainer.recordMove(activeLine.id, moveIndex, move.san);
      upsertLocalProgress(activeLine, result);
      if (result.status === 'correct') {
        const explanation = trainer.moveExplanation(activeLine.id, moveIndex);
        setMoveIndex(result.nextMoveIndex);
        setFeedback(result.completed ? `${activeLine.name} completed.` : `Correct: ${move.san}. Next move ready.`);
        setLessonCard(
          explanation
            ? { title: 'Why this move?', principle: explanation.principle, summary: explanation.summary }
            : null
        );
      } else {
        const mistake = trainer.commonMistake(activeLine.id, moveIndex);
        setFeedback(`Try again. Repertoire move: ${result.expectedMove ?? 'none'}.`);
        addReviewItem(
          buildReviewItemFromMistake({
            line: activeLine,
            moveIndex,
            expectedMove: result.expectedMove ?? 'the planned move',
            playedMove: move.san,
            now: new Date().toISOString()
          })
        );
        setLessonCard(
          mistake
            ? { title: 'Common mistake', principle: mistake.principle, summary: mistake.summary }
            : null
        );
      }
      void persistProgress(activeLine, result).catch((error) => setFeedback(error.message));
    }

    if (mode === 'play-engine') {
      void playEngineReply();
    }

    refresh();
    return true;
  }

  async function playEngineReply() {
    setAnalysis('Engine is thinking...');
    try {
      const bestMove = await engineRef.current.bestMove(managerRef.current.snapshot().fen, { depth: 6 });
      if (!bestMove) {
        setAnalysis('Engine did not return a move.');
        return;
      }
      const applied = managerRef.current.attemptMove(bestMove.from, bestMove.to, bestMove.promotion);
      setAnalysis(applied.ok ? `Engine replied ${applied.san}.` : 'Engine returned an illegal move for this position.');
      refresh();
    } catch (error) {
      setAnalysis(error instanceof Error ? error.message : 'Engine failed to respond.');
    }
  }

  function resetBoard() {
    managerRef.current.reset();
    setMoveIndex(0);
    setReviewPly(0);
    setLastMove(null);
    setLessonCard(null);
    setFeedback('Board reset.');
    refresh();
  }

  function selectSide(nextSide: RepertoireSide) {
    const firstLine = trainer.linesForSide(nextSide)[0];
    setSide(nextSide);
    setOrientation(nextSide);
    setThemeFilter('all');
    setLineId(firstLine.id);
    resetBoard();
  }

  function selectLine(nextLineId: string) {
    setLineId(nextLineId);
    resetBoard();
  }

  function selectTheme(nextTheme: string) {
    const nextLines = nextTheme === 'all' ? sideLines : sideLines.filter((line) => line.themeTags?.includes(nextTheme));
    setThemeFilter(nextTheme);
    setLineId(nextLines[0]?.id ?? sideLines[0]?.id ?? lineId);
    resetBoard();
  }

  function showHint() {
    const expectedMove = activeLine?.movesSan[moveIndex];
    setHintText(expectedMove ? `Look for ${expectedMove}: it supports the opening idea before chasing tactics.` : 'This line is complete.');
  }

  function revealMove() {
    const expectedMove = activeLine?.movesSan[moveIndex];
    setFeedback(expectedMove ? `Repertoire move: ${expectedMove}. Play it on the board when you are ready.` : 'This line is complete.');
  }

  function loadReviewPgn() {
    const result = managerRef.current.loadPgn(pgnInput);
    if (!result.ok) {
      setFeedback(result.reason);
      return;
    }

    setReviewPly(managerRef.current.getReplayPositions().length - 1);
    setFeedback('PGN loaded for review.');
    const detection = detectOpeningFromHistory(managerRef.current.snapshot().history, starterRepertoires);
    const detectedLine = starterRepertoires.find((line) => line.id === detection?.lineId);
    setReviewDetection(
      detection && detectedLine
        ? {
            lineName: detectedLine.name,
            matchedPlyCount: detection.matchedPlyCount,
            leftBookAtPly: detection.leftBookAtPly
          }
        : null
    );
    if (detection?.leftBookAtPly && detectedLine) {
      addReviewItem({
        id: `review-pgn-${detectedLine.id}-${detection.leftBookAtPly}`,
        sourceType: 'pgn-position',
        sourceId: detectedLine.id,
        title: `Review ${detectedLine.name} from your PGN`,
        prompt: `You left the repertoire on move ${detection.leftBookAtPly}. Compare the position to the lesson idea.`,
        themeTags: detectedLine.themeTags ?? [],
        dueAt: new Date().toISOString(),
        status: 'due'
      });
    }
    refresh();
  }

  function submitStudyAnswer() {
    if (!activeTask) return;
    const previousAttempts = curriculumAttempts[activeTask.id]?.attempts ?? 0;
    const attempt = scoreCurriculumAttempt({
      task: activeTask,
      answer: studyAnswer,
      previousAttempts,
      now: new Date().toISOString()
    });
    setCurriculumAttempts((items) => ({ ...items, [activeTask.id]: attempt }));
  }

  function stepReview(delta: number) {
    const positions = managerRef.current.getReplayPositions();
    const nextPly = Math.min(Math.max(reviewPly + delta, 0), positions.length - 1);
    setReviewPly(nextPly);
    setSnapshot({ ...snapshot, fen: positions[nextPly] });
  }

  async function analyzeCurrentPosition() {
    if (!learnerPlan.trim()) {
      setAnalysis('Write your plan first, then compare it with Stockfish.');
      return;
    }
    setAnalysis('Analyzing current position...');
    try {
      const result = await engineRef.current.analyze(snapshot.fen, { depth: 8 });
      const score = result.score ? `${result.score.type} ${result.score.value}` : 'no score';
      setAnalysis(`Depth ${result.depth ?? '-'} | ${score} | best ${result.bestMove?.from ?? ''}${result.bestMove?.to ?? ''}`);
    } catch (error) {
      setAnalysis(error instanceof Error ? error.message : 'Analysis failed.');
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Chess Opening Trainer</p>
          <h1>{mode === 'opening-trainer' ? activeLine?.name : modes.find((item) => item.id === mode)?.label}</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            type="button"
            aria-label={isHistoryOpen ? 'Hide moves' : 'Show moves'}
            title={isHistoryOpen ? 'Hide moves' : 'Show moves'}
            onClick={() => setIsHistoryOpen((open) => !open)}
          >
            <List size={18} />
          </button>
          <button className="icon-button" type="button" title="Reset board" onClick={resetBoard}>
            <RotateCcw size={18} />
          </button>
          <AuthPanel
            client={supabaseClient}
            user={user}
            onUserChange={setUser}
            layout="compact"
            unavailableReason={supabaseUnavailableReason}
          />
        </div>
      </header>
      <section className="workspace">
        <div className="board-column">
          <ChessBoardUI
            fen={snapshot.fen}
            orientation={orientation}
            legalTargets={snapshot.legalTargets}
            lastMove={lastMove}
            onMoveAttempt={handleMove}
          />
          <section className="feedback-strip" aria-label="Feedback">
            <div>
              <p className="eyebrow">Feedback</p>
              <p>{feedback}</p>
              <p className="analysis">{analysis}</p>
            </div>
            <button className="secondary-button" type="button" onClick={analyzeCurrentPosition}>
              Analyze position
            </button>
          </section>
          {isHistoryOpen && (
            <section className="history-drawer" aria-label="Move history">
              <div>
                <p className="eyebrow">Move history</p>
                <div className="history">{snapshot.history.length ? snapshot.history.join(' ') : 'No moves yet.'}</div>
              </div>
              <button className="secondary-button" type="button" onClick={() => setIsHistoryOpen(false)}>
                Close history
              </button>
            </section>
          )}
        </div>

        <aside className="task-dock" aria-label="Task dock">
          {!learnerSetup && (
            <section className="dock-summary onboarding-panel">
              <p className="eyebrow">Beginner setup</p>
              <h2>Set up your training</h2>
              <p>
                We will start with one active White line, one Black response, short lessons, and a small daily review queue.
              </p>
              <div className="setup-grid">
                <span>Level: Beginner adult</span>
                <span>Time: 10 minutes</span>
                <span>Style: Active but principled</span>
              </div>
              <button className="primary-button" type="button" onClick={startLearning}>
                Start learning
              </button>
            </section>
          )}

          {learnerSetup && nextActivity && (
            <>
              {!isDashboardOpen && (
                <div className="dashboard-toggle-row">
                  <button className="summary-toggle" type="button" onClick={() => setIsDashboardOpen(true)}>
                    Show today
                  </button>
                </div>
              )}
              {isDashboardOpen && (
                <section className="dock-summary dashboard-panel" aria-label="Today summary">
                  <div className="dashboard-header">
                    <p className="eyebrow">Today</p>
                    <button className="summary-toggle" type="button" onClick={() => setIsDashboardOpen(false)}>
                      Hide today
                    </button>
                  </div>
                  <div className="dashboard-row">
                    <div className="recommendation">
                      <span>Next lesson</span>
                      <strong>{nextActivity.title}</strong>
                    </div>
                    <div className="stat-pills">
                      <span>{progressSummary.dueReviewCount} due</span>
                      <span>{progressSummary.masteredLineCount} mastered</span>
                    </div>
                  </div>
                  <div className="dashboard-detail">
                    <p className="analysis">{progressSummary.todayTarget}</p>
                    {progressSummary.weakThemes.length > 0 && (
                      <div className="tag-cloud" aria-label="Weak themes">
                        {progressSummary.weakThemes.map((theme) => (
                          <span key={theme}>{theme}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          <nav className="mode-tabs" aria-label="Chess modes">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={mode === item.id ? 'active' : ''}
                  type="button"
                  onClick={() => setMode(item.id)}
                  title={item.label}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {learnerSetup && mode === 'opening-trainer' && (
            <section className="dock-panel">
              <p className="eyebrow">Repertoire</p>
              <div className="segmented-control">
                <button className={side === 'white' ? 'selected' : ''} type="button" onClick={() => selectSide('white')}>
                  White
                </button>
                <button className={side === 'black' ? 'selected' : ''} type="button" onClick={() => selectSide('black')}>
                  Black
                </button>
              </div>
              <select value={lineId} onChange={(event) => selectLine(event.target.value)}>
                {visibleSideLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
              <section className="line-progress" aria-label="Repertoire moves">
                <div className="stat-row">
                  <span>Move</span>
                  <strong>
                    {Math.min(moveIndex + 1, activeLine?.movesSan.length ?? 1)} / {activeLine?.movesSan.length}
                  </strong>
                </div>
                <div className="move-strip">
                  {activeLine?.movesSan.map((move, index) => (
                    <span key={`${move}-${index}`} className={index < moveIndex ? 'done' : index === moveIndex ? 'current' : ''}>
                      {move}
                    </span>
                  ))}
                </div>
              </section>
              <label className="field-label">
                Strategic theme
                <select value={themeFilter} onChange={(event) => selectTheme(event.target.value)}>
                  <option value="all">All themes</option>
                  {availableThemes.map((theme) => (
                    <option key={theme} value={theme}>
                      {formatThemeLabel(theme)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="tag-cloud" aria-label="Strategic themes">
                {activeLine?.themeTags?.map((theme) => (
                  <span key={theme}>{formatThemeLabel(theme)}</span>
                ))}
              </div>
              <p>{activeLine?.explanation}</p>
              <div className="lesson-card">
                <p className="eyebrow">Lesson goal</p>
                <strong>Understand the first structure before memorizing</strong>
                <p>
                  Target position: reach move {Math.min(3, activeLine?.movesSan.length ?? 1)} with central control,
                  development, and a clear next move.
                </p>
              </div>
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={showHint}>
                  Hint
                </button>
                <button className="secondary-button" type="button" onClick={revealMove}>
                  Reveal
                </button>
              </div>
              {hintText && <p className="analysis">{hintText}</p>}
              {lessonCard && (
                <div className="lesson-card">
                  <p className="eyebrow">{lessonCard.title}</p>
                  <strong>{lessonCard.principle}</strong>
                  <p>{lessonCard.summary}</p>
                </div>
              )}
            </section>
          )}

          {learnerSetup && mode === 'curriculum' && activeModule && (
            <section className="dock-panel">
              <p className="eyebrow">Curriculum</p>
              <select value={activeModule.id} onChange={(event) => setModuleId(event.target.value)}>
                {starterCurriculumModules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
              <div className="module-header">
                <h2>{activeModule.title}</h2>
                <span>{activeModule.level}</span>
              </div>
              <p>{activeModule.lessonSummary}</p>
              <div className="tag-cloud" aria-label="Curriculum themes">
                {activeModule.themes.map((theme) => (
                  <span key={theme}>{formatThemeLabel(theme)}</span>
                ))}
              </div>
              <div className="stat-row">
                <span>Pass score</span>
                <strong>{activeModule.completionCriteria.minimumScorePercent}%</strong>
              </div>
              <div className="stat-row">
                <span>Progress</span>
                <strong>{activeModuleProgress?.completionPercent ?? 0}%</strong>
              </div>
              <div className="task-list">
                {activeModule.tasks.map((task) => (
                  <article key={task.id}>
                    <div>
                      <p className="eyebrow">{formatTaskType(task.type)}</p>
                      <strong>{task.title}</strong>
                    </div>
                    <p>{task.prompt}</p>
                  </article>
                ))}
              </div>
              {activeTask && (
                <div className="lesson-card">
                  <p className="eyebrow">Try it</p>
                  <strong>{activeTask.title}</strong>
                  <label className="field-label">
                    Your answer
                    <textarea
                      aria-label="Task answer"
                      value={studyAnswer}
                      onChange={(event) => setStudyAnswer(event.target.value)}
                    />
                  </label>
                  <button className="secondary-button" type="button" onClick={submitStudyAnswer}>
                    Submit answer
                  </button>
                  {curriculumAttempts[activeTask.id] && (
                    <p className="analysis">
                      Score {curriculumAttempts[activeTask.id].score}/{activeTask.maxScore}.{' '}
                      {curriculumAttempts[activeTask.id].feedback}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {learnerSetup && mode === 'game-review' && (
            <section className="dock-panel">
              <p className="eyebrow">Game Review</p>
              <textarea aria-label="PGN input" value={pgnInput} onChange={(event) => setPgnInput(event.target.value)} />
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={loadReviewPgn}>
                  Load PGN
                </button>
                <button className="icon-button" type="button" title="Previous move" onClick={() => stepReview(-1)}>
                  <ChevronLeft size={18} />
                </button>
                <button className="icon-button" type="button" title="Next move" onClick={() => stepReview(1)}>
                  <ChevronRight size={18} />
                </button>
              </div>
              {reviewDetection && (
                <div className="lesson-card">
                  <p className="eyebrow">Opening match</p>
                  <strong>
                    Matched {reviewDetection.matchedPlyCount} moves in {reviewDetection.lineName}
                  </strong>
                  <p>
                    {reviewDetection.leftBookAtPly
                      ? `Left book on move ${reviewDetection.leftBookAtPly}.`
                      : 'You stayed inside the starter repertoire.'}
                  </p>
                </div>
              )}
            </section>
          )}

          {learnerSetup && mode === 'play-engine' && (
            <section className="dock-panel">
              <p className="eyebrow">Play Engine</p>
              <p>Make a move on the board. Stockfish replies at a light training depth.</p>
              <label className="field-label">
                My plan before engine
                <textarea
                  aria-label="Learner plan"
                  value={learnerPlan}
                  onChange={(event) => setLearnerPlan(event.target.value)}
                  placeholder="Name your candidate move or plan before asking Stockfish."
                />
              </label>
              <button className="secondary-button" type="button" onClick={playEngineReply}>
                Ask engine to move
              </button>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}

function formatThemeLabel(theme: string): string {
  return theme
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTaskType(taskType: string): string {
  return formatThemeLabel(taskType);
}
