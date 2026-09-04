import type { User } from '@supabase/supabase-js';
import { BookOpen, Brain, ChevronLeft, ChevronRight, ClipboardList, Home, List, Map as MapIcon, RotateCcw, Shield } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChessBoardUI } from './components/ChessBoardUI';
import { AuthPanel } from './components/AuthPanel';
import { GameManager } from './core/gameManager';
import { getErrorMessage, reportBackgroundError } from './core/errors';
import type { BoardOrientation, GameMode } from './core/types';
import { starterRepertoires } from './data/repertoires';
import { recommendGuidedNextActivity } from './domain/repertoire/recommendations';
import { matchPgnToRepertoire } from './domain/repertoire/pgn';
import { buildPositionKey } from './domain/repertoire/positionKey';
import { classifyMove, createInitialMastery, scheduleReview } from './domain/repertoire/training';
import type { LearnerProfile, LearningAttempt, MasteryState, RepertoireBacklogItem, RepertoireGraph, RepertoireSelection } from './domain/repertoire/types';
import { calculateModuleProgress, starterCurriculumModules } from './features/curriculum/curriculum';
import { getStudyChallenge } from './features/curriculum/studyChallenges';
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
import type { CriticalPosition, PositionProgress, RepertoireLine, RepertoireSide, TrainingProgress } from './features/openings/types';
import { AdminPanel } from './features/guided/AdminPanel';
import { GuidedOnboarding, type GuidedOnboardingResult } from './features/guided/GuidedOnboarding';
import { RepertoireMap } from './features/guided/RepertoireMap';
import { TodayPanel } from './features/guided/TodayPanel';
import { IdeaTrainingPanel } from './features/guided/IdeaTrainingPanel';
import { advanceScenario, beginScenarios, completeScenario, createIdeaTrainingSession, evaluateAuthoredMove, evaluateEngineLoss, submitPlanChoice, type IdeaTrainingSession } from './features/guided/ideaTraining';
import { EngineService } from './services/engineService';
import { GuidedContentRepository, embeddedRepertoireGraph } from './services/guidedContentRepository';
import { GuidedLearnerRepository, LOCAL_LEARNER_ID } from './services/guidedLearnerRepository';
import { createSupabaseBrowserClient, getSupabaseUnavailableReason, SupabasePersistence } from './services/supabasePersistence';
import './styles.css';

const modes: Array<{ id: GameMode; label: string; icon: React.ComponentType<{ size: number }> }> = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'repertoire', label: 'Repertoire', icon: MapIcon },
  { id: 'opening-trainer', label: 'Train openings', icon: Brain },
  { id: 'curriculum', label: 'Study', icon: BookOpen },
  { id: 'game-review', label: 'Review', icon: ClipboardList },
];

export default function App() {
  const managerRef = useRef(new GameManager());
  const engineRef = useRef(new EngineService());
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseUnavailableReason = useMemo(() => getSupabaseUnavailableReason(), []);
  const persistence = useMemo(() => new SupabasePersistence(supabaseClient), [supabaseClient]);
  const contentRepository = useMemo(() => new GuidedContentRepository(supabaseClient), [supabaseClient]);
  const learnerRepository = useMemo(() => new GuidedLearnerRepository(supabaseClient), [supabaseClient]);
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
  const [reviewMode, setReviewMode] = useState<'pgn' | 'engine'>('pgn');
  const [analysis, setAnalysis] = useState('Engine analysis appears here.');
  const [user, setUser] = useState<User | null>(null);
  const [learnerSetup, setLearnerSetup] = useState<LearnerSetup | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [localProgress, setLocalProgress] = useState<TrainingProgress[]>([]);
  const [hintText, setHintText] = useState('');
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [selectedStudyChoice, setSelectedStudyChoice] = useState('');
  const [studySubmitted, setStudySubmitted] = useState(false);
  const [showStudyHint, setShowStudyHint] = useState(false);
  const [curriculumAttempts, setCurriculumAttempts] = useState<Record<string, CurriculumAttempt>>({});
  const [reviewDetection, setReviewDetection] = useState<{ lineName: string; matchedPlyCount: number; leftBookAtPly: number | null } | null>(
    null
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeCriticalPosition, setActiveCriticalPosition] = useState<CriticalPosition | null>(null);
  const [positionProgress, setPositionProgress] = useState<PositionProgress[]>([]);
  const [repertoireGraph, setRepertoireGraph] = useState<RepertoireGraph>(embeddedRepertoireGraph);
  const [guidedProfile, setGuidedProfile] = useState<LearnerProfile | null>(null);
  const [guidedSelections, setGuidedSelections] = useState<RepertoireSelection[]>([]);
  const [guidedMastery, setGuidedMastery] = useState<MasteryState[]>([]);
  const guidedMasteryRef = useRef<MasteryState[]>([]);
  const [guidedBacklog, setGuidedBacklog] = useState<RepertoireBacklogItem[]>([]);
  const [isContentEditor, setIsContentEditor] = useState(false);
  const [contentDraft, setContentDraft] = useState<RepertoireGraph | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [activeConceptKey, setActiveConceptKey] = useState('');
  const [ideaSession, setIdeaSession] = useState<IdeaTrainingSession | null>(null);

  const learnerId = user?.id ?? LOCAL_LEARNER_ID;
  const activeConceptDrill = repertoireGraph.conceptDrills?.[activeConceptKey];

  useEffect(() => { guidedMasteryRef.current = guidedMastery; }, [guidedMastery]);

  useEffect(() => {
    if (!supabaseClient) return;

    let active = true;
    void supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setFeedback(`Could not restore your account session: ${error.message}`);
        return;
      }
      setUser(data.session?.user ?? null);
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabaseClient]);

  useEffect(() => {
    void contentRepository.loadPublished().then(setRepertoireGraph).catch(() => setRepertoireGraph(embeddedRepertoireGraph));
  }, [contentRepository]);

  useEffect(() => {
    let active = true;
    const prepare = user ? learnerRepository.sync?.(user.id) ?? Promise.resolve() : Promise.resolve();
    void prepare.then(() => Promise.all([
      learnerRepository.loadProfile(learnerId), learnerRepository.loadSelections(learnerId),
      learnerRepository.loadMastery(learnerId), learnerRepository.loadBacklog(learnerId)
    ])).then(([profile, selections, mastery, backlog]) => {
      if (!active) return;
      setGuidedProfile(profile); setGuidedSelections(selections); setGuidedMastery(mastery); setGuidedBacklog(backlog);
      if (profile?.onboardingCompleted) setLearnerSetup((current) => current ?? createLegacySetup());
    }).catch((error) => setFeedback(getErrorMessage(error, 'Could not load guided progress.')));
    if (user) {
      void contentRepository.isEditor().then((editor) => {
        if (!active) return;
        setIsContentEditor(editor);
        if (editor) void contentRepository.loadDraft().then(setContentDraft).catch((error) => reportBackgroundError('content draft load', error));
      });
    } else setIsContentEditor(false);
    return () => { active = false; };
  }, [contentRepository, learnerId, learnerRepository, user]);

  useEffect(() => {
    if (!user) return;
    void Promise.all([persistence.loadPositionProgress(user.id), persistence.loadProgress(user.id)]).then(([positions, lines]) => {
      setPositionProgress(positions); setLocalProgress(lines);
      const now = new Date().toISOString();
      const migrated: MasteryState[] = [];
      for (const progress of positions) {
        const node = Object.values(repertoireGraph.positions).find((candidate) => candidate.legacyPositionIds.includes(progress.positionId));
        if (!node) continue;
        const state = createInitialMastery({ learnerId: user.id, itemKey: `legacy-position:${progress.positionId}`, positionKey: node.key, now });
        state.recall = { score: progress.masteryScore, streak: progress.correctCount, intervalDays: Math.max(1, Math.round((new Date(progress.dueAt).getTime() - Date.now()) / 86400000)), status: progress.masteryScore >= 80 ? 'reliable' : 'learning', dueAt: progress.dueAt, lastReviewedAt: progress.lastReviewedAt };
        migrated.push(state);
      }
      for (const progress of lines) {
        const unit = Object.values(repertoireGraph.learningUnits).find((candidate) => candidate.lineKey === progress.lineId);
        if (!unit) continue;
        const state = createInitialMastery({ learnerId: user.id, itemKey: unit.key, positionKey: unit.startPositionKey, now });
        state.recall = { score: progress.status === 'mastered' || progress.status === 'completed' ? 80 : Math.min(70, progress.correctCount * 10), streak: progress.streak ?? 0, intervalDays: 1, status: progress.status === 'mastered' || progress.status === 'completed' ? 'reliable' : 'learning', dueAt: progress.dueAt ?? now, lastReviewedAt: progress.lastReviewedAt };
        migrated.push(state);
      }
      for (const state of migrated) void learnerRepository.saveMastery(state).catch((error) => reportBackgroundError('migrated mastery save', error));
      if (migrated.length) setGuidedMastery((items) => mergeMastery(items, migrated));
    }).catch((error) => setFeedback(getErrorMessage(error, 'Could not load position progress.')));
  }, [learnerRepository, persistence, repertoireGraph, user]);

  const sideLines = trainer.linesForSide(side);
  const visibleSideLines =
    themeFilter === 'all' ? sideLines : sideLines.filter((line) => line.themeTags?.includes(themeFilter));
  const activeLine = visibleSideLines.find((line) => line.id === lineId) ?? visibleSideLines[0] ?? sideLines[0];
  const activeParentLine = activeLine?.parentLineId ? trainer.findLine(activeLine.parentLineId) : activeLine;
  const theoryBranches = activeParentLine ? trainer.theoryBranchesFor(activeParentLine.id) : [];
  const availableThemes = useMemo(
    () => Array.from(new Set(sideLines.flatMap((line) => line.themeTags ?? []))).sort(),
    [sideLines]
  );
  const activeModule = starterCurriculumModules.find((module) => module.id === moduleId) ?? starterCurriculumModules[0];
  const activeTask = activeModule?.tasks[activeTaskIndex] ?? activeModule?.tasks[0];
  const activeStudyChallenge = activeTask ? getStudyChallenge(activeTask) : null;
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
  const selectedOpeningKeys = guidedSelections.length
    ? guidedSelections.map((selection) => selection.openingFamilyKey).filter((key) => Boolean(repertoireGraph.openings[key]))
    : ['white-vienna-main', 'black-caro-kann-main'].filter((key) => Boolean(repertoireGraph.openings[key]));
  const guidedNextActivity = recommendGuidedNextActivity({
    graph: repertoireGraph,
    selectedOpeningKeys,
    mastery: guidedMastery,
    backlog: guidedBacklog,
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

  function createLegacySetup() {
    const setup = createLearnerSetup({
      sidePreference: 'both',
      experienceLevel: 'beginner',
      studyTimeMinutes: 10,
      openingStyle: 'active',
      lines: starterRepertoires
    });
    return setup;
  }

  function startLearning() {
    const setup = createLegacySetup();
    setLearnerSetup(setup);
    setMode('opening-trainer');
    setLineId(trainer.findLine('white-vienna-main') ? 'white-vienna-main' : setup.recommendedWhiteLineId);
    setFeedback('Start with the idea, then play the first move when you are ready.');
  }

  function completeGuidedOnboarding(result: GuidedOnboardingResult) {
    const setup = createLegacySetup();
    setLearnerSetup(setup);
    setGuidedProfile(result.profile);
    const selections = result.openingFamilyKeys.map((openingFamilyKey) => ({
      id: createId(), learnerId, openingFamilyKey, preferredEdges: {}, updatedAt: result.profile.updatedAt
    } satisfies RepertoireSelection));
    setGuidedSelections(selections);
    void learnerRepository.saveProfile(result.profile).catch((error) => setFeedback(getErrorMessage(error, 'Could not save setup.')));
    for (const selection of selections) void learnerRepository.saveSelection(selection).catch((error) => reportBackgroundError('repertoire selection save', error));
    const first = selections.find((selection) => repertoireGraph.openings[selection.openingFamilyKey]?.side === 'white')?.openingFamilyKey;
    if (first) startOpening(first);
    setMode('opening-trainer');
    setFeedback('Your repertoire map is ready. Start with the idea, then recall the move from the board.');
  }

  function startOpening(openingKey: string) {
    const opening = repertoireGraph.openings[openingKey];
    if (!opening) return;
    const line = opening.lineKeys.map((key) => trainer.findLine(key)).find(Boolean);
    if (line) {
      setSide(line.side); setOrientation(line.side); setLineId(line.id); resetBoard();
    }
    setMode('opening-trainer');
  }

  function loadConceptScenario(drill: NonNullable<typeof activeConceptDrill>, index: number) {
    const scenario = drill.scenarios[index];
    if (!scenario) return;
    managerRef.current.reset(scenario.setupFen);
    const opponent = managerRef.current.attemptMove(scenario.opponentMoveUci.slice(0, 2), scenario.opponentMoveUci.slice(2, 4), scenario.opponentMoveUci.slice(4) || undefined);
    setLastMove(opponent.ok ? { from: scenario.opponentMoveUci.slice(0, 2), to: scenario.opponentMoveUci.slice(2, 4) } : null);
    setFeedback(scenario.prompt);
    refresh();
  }

  function startConceptDrill(drillKey: string) {
    const drill = repertoireGraph.conceptDrills?.[drillKey];
    if (!drill) return;
    const opening = repertoireGraph.openings[drill.openingFamilyKey];
    setActiveConceptKey(drill.key);
    setIdeaSession(createIdeaTrainingSession(drill));
    setMode('idea-training');
    setOrientation(opening?.side ?? 'white');
    loadConceptScenario(drill, 0);
  }

  function startIdeasForOpening(openingKey: string) {
    const drills = Object.values(repertoireGraph.conceptDrills ?? {}).filter((drill) => drill.openingFamilyKey === openingKey).sort((a, b) => a.order - b.order);
    const next = drills.find((drill) => !guidedMastery.some((item) => item.itemKey === drill.key && item.understanding.status === 'reliable')) ?? drills[0];
    if (next) startConceptDrill(next.key);
    else startOpening(openingKey);
  }

  function startGuidedTarget(targetKey: string) {
    const concept = repertoireGraph.conceptDrills?.[targetKey];
    const unit = repertoireGraph.learningUnits[targetKey];
    if (concept) startConceptDrill(concept.key);
    else if (unit) startOpening(unit.openingFamilyKey);
    else if (repertoireGraph.openings[targetKey]) startOpening(targetKey);
    else if (repertoireGraph.motifs[targetKey]) {
      const legacyId = targetKey.replace(/^motif:/, '');
      const position = starterRepertoires.flatMap((line) => line.criticalPositions ?? []).find((item) => item.id === legacyId);
      const line = position ? trainer.findLine(position.lineId) : undefined;
      if (line) { setSide(line.side); setLineId(line.id); setOrientation(line.side); }
      if (position) { setMode('opening-trainer'); startCriticalPosition(position); }
      else setMode('game-review');
    } else setMode('game-review');
  }

  function checkIdeaPlan() {
    if (!ideaSession || !activeConceptDrill) return;
    const next = submitPlanChoice(ideaSession, activeConceptDrill);
    setIdeaSession(next);
    if (next.planCorrect !== null) void recordGuidedAttempt({ itemKey: activeConceptDrill.key, positionKey: buildPositionKey(snapshot.fen), dimension: 'understanding', response: next.selectedChoiceId, correct: next.planCorrect, hintUsed: false, revealed: false }).catch((error) => reportBackgroundError('plan attempt save', error));
  }

  function startIdeaScenarios() {
    if (!ideaSession || !activeConceptDrill) return;
    setIdeaSession(beginScenarios(ideaSession));
    loadConceptScenario(activeConceptDrill, 0);
  }

  function nextIdeaScenario() {
    if (!ideaSession || !activeConceptDrill) return;
    const next = advanceScenario(ideaSession, activeConceptDrill);
    setIdeaSession(next);
    if (next.stage === 'scenario') loadConceptScenario(activeConceptDrill, next.scenarioIndex);
    else setFeedback(`${activeConceptDrill.title} session complete.`);
  }

  function retryIdeaScenario() {
    if (!ideaSession || !activeConceptDrill) return;
    setIdeaSession({ ...ideaSession, currentResult: null, evaluating: false, scenarioResults: ideaSession.scenarioResults.slice(0, -1) });
    loadConceptScenario(activeConceptDrill, ideaSession.scenarioIndex);
  }

  async function evaluateIdeaMove(fen: string, playedUci: string) {
    if (!ideaSession || !activeConceptDrill) return;
    const scenario = activeConceptDrill.scenarios[ideaSession.scenarioIndex];
    if (!scenario) return;
    const authored = evaluateAuthoredMove(playedUci, scenario.preferredMovesUci, scenario.acceptableMovesUci);
    let result = authored;
    if (!result) {
      try {
        const comparison = await engineRef.current.compareMove(fen, { from: playedUci.slice(0, 2), to: playedUci.slice(2, 4), promotion: playedUci.slice(4) || undefined }, { depth: 6 });
        result = evaluateEngineLoss(comparison.delta === null ? null : Math.max(0, -comparison.delta));
      } catch {
        result = evaluateEngineLoss(null);
      }
    }
    setIdeaSession((current) => current ? completeScenario(current, result!) : current);
    setFeedback(`${result.feedback} ${scenario.teachingPoint}`);
    if (result.correct !== null) void recordGuidedAttempt({ itemKey: activeConceptDrill.key, positionKey: buildPositionKey(fen), dimension: 'understanding', response: playedUci, correct: result.correct, hintUsed: ideaSession.hintUsed, revealed: ideaSession.revealed }).catch((error) => reportBackgroundError('idea move save', error));
  }

  async function recordGuidedAttempt(input: Omit<LearningAttempt, 'id' | 'learnerId' | 'createdAt'>) {
    const now = new Date().toISOString();
    const attempt: LearningAttempt = { ...input, id: createId(), learnerId, createdAt: now };
    const previous = guidedMasteryRef.current.find((item) => item.itemKey === input.itemKey) ?? createInitialMastery({ learnerId, itemKey: input.itemKey, positionKey: input.positionKey, now });
    const next = scheduleReview(previous, attempt);
    guidedMasteryRef.current = guidedMasteryRef.current.some((item) => item.itemKey === next.itemKey) ? guidedMasteryRef.current.map((item) => item.itemKey === next.itemKey ? next : item) : [...guidedMasteryRef.current, next];
    setGuidedMastery((items) => items.some((item) => item.itemKey === next.itemKey) ? items.map((item) => item.itemKey === next.itemKey ? next : item) : [...items, next]);
    await Promise.all([learnerRepository.appendAttempt(attempt), learnerRepository.saveMastery(next)]);
  }

  function addGuidedBacklog(input: Omit<RepertoireBacklogItem, 'id' | 'learnerId' | 'status' | 'createdAt'>) {
    if (guidedBacklog.some((item) => item.positionKey === input.positionKey && item.reason === input.reason)) return;
    const item: RepertoireBacklogItem = { ...input, id: createId(), learnerId, status: 'new', createdAt: new Date().toISOString() };
    setGuidedBacklog((items) => [...items, item]);
    void learnerRepository.saveBacklogItem(item).catch((error) => reportBackgroundError('repertoire backlog save', error));
  }

  async function resolveUncoveredMove(input: { fen: string; from: string; to: string; promotion?: string; positionKey: string; familyKey: string; title: string }) {
    setFeedback('This move is outside your repertoire. Stockfish is checking whether it is still reasonable…');
    try {
      const comparison = await engineRef.current.compareMove(input.fen, { from: input.from, to: input.to, promotion: input.promotion }, { depth: 6 });
      const loss = comparison.delta === null ? undefined : Math.max(0, -comparison.delta);
      const classification = classifyMove({ graph: repertoireGraph, positionKey: input.positionKey, playedUci: `${input.from}${input.to}${input.promotion ?? ''}`, openingFamilyKey: input.familyKey, engineCentipawnLoss: loss });
      setFeedback(classification.message);
      if (classification.kind !== 'reasonable') addGuidedBacklog({ positionKey: input.positionKey, reason: 'forgotten-move', title: input.title });
    } catch {
      setFeedback('This move is not covered yet. It was saved as a repertoire gap; engine analysis is optional.');
      addGuidedBacklog({ positionKey: input.positionKey, reason: 'forgotten-move', title: input.title });
    }
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
    if (mode === 'idea-training' && ideaSession && (ideaSession.evaluating || ideaSession.currentResult)) {
      setFeedback('Use the coaching card before making another move.');
      return false;
    }
    const positionKeyBefore = buildPositionKey(snapshot.fen);
    const fenBefore = snapshot.fen;
    const familyKey = activeParentLine?.id ?? activeLine?.id ?? '';
    const expectedEdge = Object.values(repertoireGraph.edges).find((edge) => edge.from === positionKeyBefore && edge.legacyLineIds.includes(activeLine?.id ?? '') && edge.order === moveIndex);
    const guidedClassification = familyKey
      ? classifyMove({ graph: repertoireGraph, positionKey: positionKeyBefore, playedUci: `${from}${to}${promotion ?? ''}`, openingFamilyKey: familyKey, preferredEdgeKey: expectedEdge?.key })
      : null;
    const move = managerRef.current.attemptMove(from, to, promotion);
    if (!move.ok) {
      setFeedback(move.reason);
      return false;
    }

    setLastMove({ from, to });

    if (mode === 'idea-training' && ideaSession?.stage === 'scenario' && activeConceptDrill) {
      setIdeaSession({ ...ideaSession, evaluating: true });
      void evaluateIdeaMove(fenBefore, `${from}${to}${promotion ?? ''}`);
      refresh();
      return true;
    }

    if (activeCriticalPosition) {
      const result = trainer.evaluateCriticalMove(activeCriticalPosition, move.san);
      const existing = positionProgress.find((item) => item.positionId === activeCriticalPosition.id);
      const now = new Date();
      const next: PositionProgress = {
        userId: user?.id ?? 'local',
        openingId: activeCriticalPosition.lineId,
        positionId: activeCriticalPosition.id,
        side: activeLine?.side ?? 'white',
        attempts: (existing?.attempts ?? 0) + 1,
        correctCount: (existing?.correctCount ?? 0) + (result.status === 'correct' ? 1 : 0),
        hintCount: existing?.hintCount ?? 0,
        mistakeThemes: result.status === 'incorrect' ? Array.from(new Set([...(existing?.mistakeThemes ?? []), ...activeCriticalPosition.themes])) : existing?.mistakeThemes ?? [],
        masteryScore: Math.min(100, (existing?.masteryScore ?? 0) + (result.status === 'correct' ? 25 : -10)),
        dueAt: new Date(now.getTime() + (result.status === 'correct' ? 3 : 1) * 86400000).toISOString(),
        lastReviewedAt: now.toISOString()
      };
      setPositionProgress((items) => items.some((item) => item.positionId === next.positionId) ? items.map((item) => item.positionId === next.positionId ? next : item) : [...items, next]);
      void persistence.upsertPositionProgress(next).catch((error) => setFeedback(getErrorMessage(error, 'Could not save position progress.')));
      if (result.status === 'incorrect') {
        addReviewItem({ id: `review-position-${activeCriticalPosition.id}`, sourceType: 'theme', sourceId: activeCriticalPosition.id, title: `Review ${activeLine?.name ?? 'Alien Gambit'} critical position`, prompt: activeCriticalPosition.prompt, themeTags: activeCriticalPosition.themes, dueAt: next.dueAt, status: 'due' });
      }
      setFeedback(result.status === 'correct' ? `Correct. ${activeCriticalPosition.teachingPoint ?? ''}` : `Try again. ${activeCriticalPosition.expectedMoves.join(' or ')}. ${activeCriticalPosition.hint ?? ''}`);
      const motif = Object.values(repertoireGraph.motifs).find((item) => item.positionKeys.includes(positionKeyBefore));
      void recordGuidedAttempt({ itemKey: motif?.key ?? `motif:${activeCriticalPosition.id}`, positionKey: positionKeyBefore, dimension: 'tactics', response: move.san, correct: result.status === 'correct', hintUsed: false, revealed: false }).catch((error) => reportBackgroundError('critical-position attempt save', error));
      if (result.status === 'correct') setActiveCriticalPosition(null);
      refresh();
      return true;
    }

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
        const unit = Object.values(repertoireGraph.learningUnits).find((item) => item.lineKey === activeLine.id && item.edgeKeys.includes(expectedEdge?.key ?? ''));
        void recordGuidedAttempt({ itemKey: unit?.key ?? `legacy:${activeLine.id}:${moveIndex}`, positionKey: positionKeyBefore, dimension: 'recall', response: move.san, correct: true, hintUsed: Boolean(hintText), revealed: feedback.startsWith('Repertoire move:') }).catch((error) => reportBackgroundError('opening recall save', error));
      } else {
        const mistake = trainer.commonMistake(activeLine.id, moveIndex);
        const accepted = guidedClassification?.kind === 'alternative' || guidedClassification?.kind === 'transposition' || guidedClassification?.kind === 'reasonable';
        setFeedback(accepted ? guidedClassification.message : guidedClassification?.message ?? `Try again. Repertoire move: ${result.expectedMove ?? 'none'}.`);
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
        const unit = Object.values(repertoireGraph.learningUnits).find((item) => item.lineKey === activeLine.id && item.startPositionKey === positionKeyBefore)
          ?? Object.values(repertoireGraph.learningUnits).find((item) => item.lineKey === activeLine.id);
        void recordGuidedAttempt({ itemKey: unit?.key ?? `legacy:${activeLine.id}:${moveIndex}`, positionKey: positionKeyBefore, dimension: 'recall', response: move.san, correct: accepted, hintUsed: Boolean(hintText), revealed: false }).catch((error) => reportBackgroundError('opening deviation save', error));
        if (guidedClassification?.kind === 'mistake') {
          addGuidedBacklog({ positionKey: positionKeyBefore, reason: 'forgotten-move', title: `Review ${activeLine.name} after ${move.san}` });
        } else if (guidedClassification?.kind === 'uncovered') {
          void resolveUncoveredMove({ fen: snapshot.fen, from, to, promotion, positionKey: positionKeyBefore, familyKey, title: `Review ${activeLine.name} after ${move.san}` });
        }
      }
      void persistProgress(activeLine, result).catch((error) => setFeedback(getErrorMessage(error, 'Could not save training progress.')));
    }

    if (mode === 'game-review' && reviewMode === 'engine') {
      setFeedback(`You played ${move.san}. Stockfish is choosing a reply.`);
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
      setAnalysis(getErrorMessage(error, 'Engine failed to respond.'));
    }
  }

  function resetBoard() {
    managerRef.current.reset();
    setMoveIndex(0);
    setReviewPly(0);
    setLastMove(null);
    setLessonCard(null);
    setActiveCriticalPosition(null);
    setFeedback('Board reset.');
    refresh();
  }

  function showHistoryPly(ply: number) {
    const positions = managerRef.current.getReplayPositions();
    if (!positions[ply]) return;

    const currentSnapshot = managerRef.current.snapshot();
    const isCurrentPosition = ply === positions.length - 1;
    setReviewPly(ply);
    setLastMove(null);
    setSnapshot(
      isCurrentPosition
        ? currentSnapshot
        : {
            ...currentSnapshot,
            fen: positions[ply],
            legalTargets: {}
          }
    );
  }

  function showRepertoireMove(targetMoveIndex: number) {
    if (!activeLine) return;

    managerRef.current.reset();
    for (const move of activeLine.movesSan.slice(0, targetMoveIndex + 1)) {
      const result = managerRef.current.applySanMove(move);
      if (!result.ok) {
        setFeedback(result.reason);
        refresh();
        return;
      }
    }

    setMoveIndex(Math.min(targetMoveIndex + 1, activeLine.movesSan.length));
    setReviewPly(targetMoveIndex + 1);
    setLastMove(null);
    setLessonCard(null);
    setFeedback(`Showing position after ${activeLine.movesSan[targetMoveIndex]}.`);
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

  function startCriticalPosition(position: CriticalPosition) {
    setActiveCriticalPosition(position);
    managerRef.current.reset(position.fen);
    setMoveIndex(position.ply);
    setLastMove(null);
    setFeedback(position.prompt);
    refresh();
  }

  function switchReviewMode(nextMode: 'pgn' | 'engine') {
    setReviewMode(nextMode);
    setReviewDetection(null);
    resetBoard();
    setFeedback(nextMode === 'pgn' ? 'Load a PGN to review a game.' : 'Make a move on the board. Stockfish will reply automatically.');
  }

  function startAlienPractice() {
    const line = side === 'black' ? trainer.findLine('black-alien-gambit-defense') : trainer.findLine('white-alien-gambit-main');
    managerRef.current.reset();
    setLineId(line?.id ?? lineId);
    setActiveCriticalPosition(null);
    setFeedback(`Alien Gambit practice ready for ${side}.`);
    refresh();
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
    let guidedDetection: ReturnType<typeof matchPgnToRepertoire> | null = null;
    try {
      guidedDetection = matchPgnToRepertoire({ pgn: pgnInput, graph: repertoireGraph, selectedOpeningFamilyKeys: selectedOpeningKeys });
    } catch {
      guidedDetection = null;
    }
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
    if (guidedDetection?.divergencePly) {
      const reason = guidedDetection.recommendedAction === 'schedule-tactic' ? 'missed-tactic'
        : guidedDetection.divergingSide === 'learner' ? 'forgotten-move' : 'opponent-deviation';
      addGuidedBacklog({
        positionKey: guidedDetection.lastKnownPositionKey,
        reason,
        title: guidedDetection.divergingSide === 'learner'
          ? `Recall the repertoire move at ply ${guidedDetection.divergencePly}`
          : `Cover the opponent response at ply ${guidedDetection.divergencePly}`
      });
      setFeedback(`Game matched ${guidedDetection.matchedPlyCount} repertoire plies. ${guidedDetection.divergingSide === 'learner' ? 'Your move' : 'The opponent move'} created the first gap.`);
    }
    refresh();
  }

  function selectStudyModule(nextModuleId: string) {
    setModuleId(nextModuleId);
    setActiveTaskIndex(0);
    setSelectedStudyChoice('');
    setStudySubmitted(false);
    setShowStudyHint(false);
  }

  function selectStudyTask(index: number) {
    setActiveTaskIndex(index);
    setSelectedStudyChoice('');
    setStudySubmitted(false);
    setShowStudyHint(false);
  }

  function submitStudyChoice() {
    if (!activeTask || !activeStudyChallenge || !selectedStudyChoice) return;
    const previousAttempts = curriculumAttempts[activeTask.id]?.attempts ?? 0;
    const correct = selectedStudyChoice === activeStudyChallenge.correctChoiceId;
    const attempt = scoreCurriculumAttempt({
      task: activeTask,
      answer: correct ? `${activeTask.title} ${activeTask.themes?.join(' ') ?? ''}` : '',
      previousAttempts,
      now: new Date().toISOString()
    });
    setCurriculumAttempts((items) => ({
      ...items,
      [activeTask.id]: {
        ...attempt,
        score: correct ? activeTask.maxScore : 0,
        completed: correct,
        feedback: correct
          ? 'Correct. ' + activeStudyChallenge.teachingPoint
          : 'Not quite. ' + activeStudyChallenge.teachingPoint
      }
    }));
    setStudySubmitted(true);
    const unit = Object.values(repertoireGraph.learningUnits).find((item) => item.lineKey === activeLine?.id);
    if (unit) void recordGuidedAttempt({ itemKey: unit.key, positionKey: unit.startPositionKey, dimension: 'understanding', response: selectedStudyChoice, correct, hintUsed: showStudyHint, revealed: false }).catch((error) => reportBackgroundError('study attempt save', error));
  }

  function stepReview(delta: number) {
    const positions = managerRef.current.getReplayPositions();
    const nextPly = Math.min(Math.max(reviewPly + delta, 0), positions.length - 1);
    showHistoryPly(nextPly);
  }

  async function analyzeCurrentPosition() {
    setAnalysis('Analyzing current position...');
    try {
      const result = await engineRef.current.analyze(snapshot.fen, { depth: 8 });
      const score = result.score ? `${result.score.type} ${result.score.value}` : 'no score';
      setAnalysis(`Depth ${result.depth ?? '-'} | ${score} | best ${result.bestMove?.from ?? ''}${result.bestMove?.to ?? ''}`);
    } catch (error) {
      setAnalysis(getErrorMessage(error, 'Analysis failed.'));
    }
  }

  async function copyGamePgn() {
    const pgn = managerRef.current.snapshot().pgn;
    if (!pgn) {
      setFeedback('There are no moves to copy yet.');
      return;
    }

    try {
      await copyTextToClipboard(pgn);
      setFeedback('PGN copied. You can paste it here for review or into another chess tool.');
    } catch {
      setFeedback('Could not access the clipboard. Select the moves from Move history and copy them manually.');
    }
  }

  async function createContentDraft() {
    setAdminBusy(true);
    try {
      const draft = await contentRepository.clonePublishedToDraft();
      setContentDraft(draft); setFeedback('Working draft created from the published repertoire.');
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Could not create the content draft.'));
    } finally { setAdminBusy(false); }
  }

  async function saveContentDraft() {
    if (!contentDraft) return;
    setAdminBusy(true);
    try { await contentRepository.saveDraft(contentDraft); setFeedback('Content draft saved.'); }
    catch (error) { setFeedback(getErrorMessage(error, 'Could not save the content draft.')); }
    finally { setAdminBusy(false); }
  }

  async function publishContentDraft() {
    setAdminBusy(true);
    try {
      const published = await contentRepository.publishDraft();
      setRepertoireGraph(published); setContentDraft(null); setFeedback(`Published repertoire release ${published.release.version}.`); setMode('repertoire');
    } catch (error) { setFeedback(getErrorMessage(error, 'Could not publish the content draft.')); }
    finally { setAdminBusy(false); }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Chess Opening Trainer</p>
          <h1>{mode === 'opening-trainer' ? activeLine?.name : mode === 'idea-training' ? activeConceptDrill?.title : mode === 'admin' ? 'Content admin' : modes.find((item) => item.id === mode)?.label}</h1>
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
          {learnerSetup && mode === 'opening-trainer' && activeLine && (
            <section className="line-progress mobile-line-progress" aria-label="Moves near board">
              <div className="stat-row">
                <span>Move</span>
                <strong>{Math.min(moveIndex + 1, activeLine.movesSan.length)} / {activeLine.movesSan.length}</strong>
              </div>
              <div className="move-strip">
                {activeLine.movesSan.map((move, index) => (
                  <button
                    key={`mobile-${move}-${index}`}
                    className={index < moveIndex ? 'done' : index === moveIndex ? 'current' : ''}
                    type="button"
                    aria-label={`Board move ${index + 1}: ${move}`}
                    onClick={() => showRepertoireMove(index)}
                  >
                    {move}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="feedback-strip" aria-label="Feedback">
            <div>
              <p className="eyebrow">Feedback</p>
              <p>{feedback}</p>
              <p className="analysis">{analysis}</p>
            </div>
            <div className="feedback-actions">
              <button className="secondary-button" type="button" onClick={copyGamePgn}>
                Copy PGN
              </button>
              <button className="secondary-button" type="button" onClick={analyzeCurrentPosition}>
                Analyze position
              </button>
            </div>
          </section>
          {isHistoryOpen && (
            <section className="history-drawer" aria-label="Move history">
              <div>
                <p className="eyebrow">Move history</p>
                <div className="history">
                  {snapshot.history.length
                    ? snapshot.history.map((move, index) => {
                        const ply = index + 1;
                        const moveNumber = Math.floor(index / 2) + 1;
                        const movePrefix = index % 2 === 0 ? `${moveNumber}.` : `${moveNumber}...`;

                        return (
                          <button
                            key={`${move}-${index}`}
                            className={reviewPly === ply ? 'selected' : ''}
                            type="button"
                            aria-label={`Move ${ply}: ${move}`}
                            onClick={() => showHistoryPly(ply)}
                          >
                            <span>{movePrefix}</span>
                            {move}
                          </button>
                        );
                      })
                    : 'No moves yet.'}
                </div>
              </div>
              <button className="secondary-button" type="button" onClick={() => setIsHistoryOpen(false)}>
                Close history
              </button>
            </section>
          )}
        </div>

        <aside className="task-dock" aria-label="Task dock">
          {!learnerSetup && (
            <GuidedOnboarding learnerId={learnerId} openings={Object.values(repertoireGraph.openings)} onComplete={completeGuidedOnboarding} />
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
            {isContentEditor && <button className={mode === 'admin' ? 'active' : ''} type="button" onClick={() => setMode('admin')} title="Admin"><Shield size={17} />Admin</button>}
          </nav>

          {learnerSetup && mode === 'today' && <TodayPanel next={guidedNextActivity} mastery={guidedMastery} backlog={guidedBacklog} onStart={startGuidedTarget} />}

          {learnerSetup && mode === 'repertoire' && <RepertoireMap graph={repertoireGraph} selectedKeys={selectedOpeningKeys} mastery={guidedMastery} onTrain={startOpening} onPracticeIdeas={startIdeasForOpening} />}

          {learnerSetup && mode === 'idea-training' && activeConceptDrill && ideaSession && (
            <IdeaTrainingPanel
              drill={activeConceptDrill}
              session={ideaSession}
              onSelectPlan={(choiceId) => setIdeaSession({ ...ideaSession, selectedChoiceId: choiceId })}
              onCheckPlan={checkIdeaPlan}
              onStartScenarios={startIdeaScenarios}
              onHint={() => setIdeaSession({ ...ideaSession, hintUsed: true })}
              onReveal={() => setIdeaSession({ ...ideaSession, hintUsed: true, revealed: true })}
              onNext={nextIdeaScenario}
              onRetryScenario={retryIdeaScenario}
              onRestart={() => startConceptDrill(activeConceptDrill.key)}
              onLinePractice={() => startOpening(activeConceptDrill.openingFamilyKey)}
            />
          )}

          {learnerSetup && mode === 'admin' && isContentEditor && <AdminPanel draft={contentDraft} busy={adminBusy} onCreateDraft={createContentDraft} onChange={setContentDraft} onSave={saveContentDraft} onPublish={publishContentDraft} onPreviewPosition={(fen) => { managerRef.current.reset(fen); refresh(); }} />}

          {learnerSetup && mode === 'opening-trainer' && (
            <section className="dock-panel">
              <p className="eyebrow">Repertoire</p>
              <div className="line-meta-row">
                <span className={`difficulty-badge ${activeLine?.difficulty === 'theory' ? 'theory' : 'beginner'}`}>
                  {formatDifficulty(activeLine)}
                </span>
                {activeLine?.difficulty === 'theory' && activeParentLine && (
                  <button className="link-button" type="button" onClick={() => selectLine(activeParentLine.id)}>
                    Back to {activeParentLine.name}
                  </button>
                )}
              </div>
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
              <section className="line-progress dock-line-progress" aria-label="Repertoire moves">
                <div className="stat-row">
                  <span>Move</span>
                  <strong>
                    {Math.min(moveIndex + 1, activeLine?.movesSan.length ?? 1)} / {activeLine?.movesSan.length}
                  </strong>
                </div>
                <div className="move-strip">
                  {activeLine?.movesSan.map((move, index) => (
                    <button
                      key={`${move}-${index}`}
                      className={index < moveIndex ? 'done' : index === moveIndex ? 'current' : ''}
                      type="button"
                      aria-label={`Repertoire move ${index + 1}: ${move}`}
                      onClick={() => showRepertoireMove(index)}
                    >
                      {move}
                    </button>
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
              {theoryBranches.length > 0 && activeLine?.difficulty !== 'theory' && (
                <section className="theory-branch-list" aria-label="Theory branches">
                  <p className="eyebrow">Build on this</p>
                  {theoryBranches.map((branch) => (
                    <button key={branch.id} className="theory-branch-button" type="button" onClick={() => selectLine(branch.id)}>
                      <span>{branch.name}</span>
                      <small>{branch.explanation}</small>
                    </button>
                  ))}
                </section>
              )}
              {activeLine?.middlegameIdeas && activeLine.middlegameIdeas.length > 0 && (
                <section className="middlegame-ideas" aria-label="Middlegame ideas">
                  <p className="eyebrow">Middlegame ideas</p>
                  {activeLine.middlegameIdeas.map((idea) => (
                    <article key={idea.title} className="plan-card">
                      <strong>{idea.title}</strong>
                      <p>{idea.summary}</p>
                      <span>{formatPlanMoves(idea.planMoves)}</span>
                      {idea.warning && <p className="analysis">{idea.warning}</p>}
                    </article>
                  ))}
                </section>
              )}
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
              <div className="study-kicker-row">
                <p className="eyebrow">Study path</p>
                <span className="study-session-badge">5 min lesson</span>
              </div>
              <select aria-label="Study module" value={activeModule.id} onChange={(event) => selectStudyModule(event.target.value)}>
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
              <div className="study-progress-bar" aria-label="Study progress">
                <span style={{ width: `${activeModuleProgress?.completionPercent ?? 0}%` }} />
              </div>
              <div className="study-task-rail" aria-label="Study tasks">
                {activeModule.tasks.map((task) => (
                  <button
                    key={task.id}
                    className={activeTask?.id === task.id ? 'active' : ''}
                    type="button"
                    onClick={() => selectStudyTask(activeModule.tasks.indexOf(task))}
                  >
                    <span>{curriculumAttempts[task.id]?.completed ? '✓' : activeModule.tasks.indexOf(task) + 1}</span>
                    <strong>{task.title}</strong>
                  </button>
                ))}
              </div>
              {activeTask && (
                <div className="study-challenge-card">
                  <div className="study-challenge-header">
                    <div>
                      <p className="eyebrow">{formatTaskType(activeTask.type)} · Task {activeTaskIndex + 1} of {activeModule.tasks.length}</p>
                      <h3>{activeTask.title}</h3>
                    </div>
                    <span className="study-score-badge">Score {curriculumAttempts[activeTask.id]?.score ?? 0}/{activeTask.maxScore}</span>
                  </div>
                  <p className="study-prompt">{activeTask.prompt}</p>
                  <div className="study-choice-list" role="radiogroup" aria-label="Study choices">
                    {activeStudyChallenge?.choices.map((choice) => (
                      <button
                        key={choice.id}
                        className={selectedStudyChoice === choice.id ? 'selected' : ''}
                        type="button"
                        role="radio"
                        aria-checked={selectedStudyChoice === choice.id}
                        onClick={() => {
                          setSelectedStudyChoice(choice.id);
                          setStudySubmitted(false);
                        }}
                      >
                        <span>{selectedStudyChoice === choice.id ? '●' : '○'}</span>
                        {choice.label}
                      </button>
                    ))}
                  </div>
                  <div className="study-actions">
                    <button className="secondary-button" type="button" onClick={() => setShowStudyHint((visible) => !visible)}>
                      {showStudyHint ? 'Hide hint' : 'Need a hint?'}
                    </button>
                    <button className="primary-button" type="button" disabled={!selectedStudyChoice} onClick={submitStudyChoice}>
                      Check answer
                    </button>
                  </div>
                  {showStudyHint && <p className="study-hint">Hint: {activeStudyChallenge?.hint}</p>}
                  {studySubmitted && curriculumAttempts[activeTask.id] && (
                    <div className={`study-feedback ${curriculumAttempts[activeTask.id].completed ? 'correct' : 'try-again'}`}>
                      <strong>{curriculumAttempts[activeTask.id].completed ? 'Correct choice' : 'Keep exploring'}</strong>
                      <p>{curriculumAttempts[activeTask.id].feedback}</p>
                    </div>
                  )}
                  <div className="study-next-row">
                    <span>{studySubmitted ? 'Your answer is recorded.' : 'Choose the plan you would play.'}</span>
                    {activeTaskIndex < activeModule.tasks.length - 1 && (
                      <button className="link-button" type="button" disabled={!curriculumAttempts[activeTask.id]?.completed} onClick={() => selectStudyTask(activeTaskIndex + 1)}>
                        Next task →
                      </button>
                    )}
                  </div>
                </div>
              )}
              {activeLine?.criticalPositions && activeLine.criticalPositions.length > 0 && (
                <section className="critical-position-card" aria-label="Critical positions">
                  <p className="eyebrow">Critical position</p>
                  <p>{activeCriticalPosition?.prompt ?? 'Practice the decision that defines this branch.'}</p>
                  <button className="secondary-button" type="button" onClick={() => startCriticalPosition(activeLine.criticalPositions![0])}>
                    {activeCriticalPosition ? 'Restart position' : 'Practice position'}
                  </button>
                </section>
              )}
            </section>
          )}

          {learnerSetup && mode === 'game-review' && (
            <section className="dock-panel">
              <p className="eyebrow">Review workspace</p>
              <div className="segmented-control review-mode-switch" aria-label="Review purpose">
                <button className={reviewMode === 'pgn' ? 'selected' : ''} type="button" onClick={() => switchReviewMode('pgn')}>
                  Review a game
                </button>
                <button className={reviewMode === 'engine' ? 'selected' : ''} type="button" onClick={() => switchReviewMode('engine')}>
                  Play vs Stockfish
                </button>
              </div>
              {reviewMode === 'pgn' ? (
                <>
                  <p>Paste a PGN to replay the game, step through positions, and see where it left your opening repertoire.</p>
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
                </>
              ) : (
                <>
                  <p>Make a move on the board. Stockfish replies automatically, so you can play a complete training game without leaving Review.</p>
                  <button className="secondary-button" type="button" onClick={startAlienPractice}>
                    Start Alien Gambit practice
                  </button>
                  <button className="secondary-button" type="button" onClick={resetBoard}>
                    Reset game
                  </button>
                </>
              )}
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

function formatDifficulty(line?: RepertoireLine): string {
  return line?.difficulty === 'theory' ? 'Theory' : 'Beginner';
}

function formatPlanMoves(moves?: string[]): string {
  return moves?.length ? moves.join(' -> ') : 'Choose a plan from the position.';
}

function formatTaskType(taskType: string): string {
  return formatThemeLabel(taskType);
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard access unavailable.');
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `guided-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeMastery(current: MasteryState[], incoming: MasteryState[]): MasteryState[] {
  const merged = new Map(current.map((item) => [item.itemKey, item]));
  for (const item of incoming) {
    const existing = merged.get(item.itemKey);
    if (!existing || item.updatedAt >= existing.updatedAt) merged.set(item.itemKey, item);
  }
  return Array.from(merged.values());
}
