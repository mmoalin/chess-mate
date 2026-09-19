import type { User } from '@supabase/supabase-js';
import { openContinuation } from './features/connected/continuationJourney';
import { BookOpen, Brain, ChevronLeft, ChevronRight, ClipboardList, Home, List, Map as MapIcon, RotateCcw, Shield } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChoiceGroup } from './components/ChoiceGroup';
import { ChessBoardUI } from './components/ChessBoardUI';
import { AuthPanel } from './components/AuthPanel';
import { SavedPositionPanel } from './features/guided/SavedPositionPanel';
import { moveLabel } from './core/notation';
import { GameManager } from './core/gameManager';
import { getErrorMessage, reportBackgroundError } from './core/errors';
import type { BoardOrientation, GameMode } from './core/types';
import { starterRepertoires } from './data/repertoires';
import { buildDailySession, currentDailyTarget, finishDailyActivity } from './domain/repertoire/dailySessions';
import { matchPgnToRepertoire } from './domain/repertoire/pgn';
import { lessonForPosition } from './features/connected/course';
import { buildPositionKey, positionKeyToFen } from './domain/repertoire/positionKey';
import { classifyMove, createInitialMastery, scheduleReview } from './domain/repertoire/training';
import type { DailyDuration, DailySession, LearnerProfile, LearningAttempt, MasteryState, RepertoireBacklogItem, RepertoireGraph, RepertoireSelection } from './domain/repertoire/types';
import { calculateModuleProgress, starterCurriculumModules } from './features/curriculum/curriculum';
import { studyPositions } from './features/curriculum/studyPositions';
import { getStudyChallenge } from './features/curriculum/studyChallenges';
import type { CurriculumTaskProgress } from './features/curriculum/types';
import {
  buildReviewItemFromMistake,
  createLearnerSetup,
  scoreCurriculumAttempt
} from './features/journey/journey';
import type { CurriculumAttempt, LearnerSetup, ReviewItem } from './features/journey/types';
import { OpeningTrainer } from './features/openings/openingTrainer';
import type { CriticalPosition, PositionProgress, RepertoireLine, RepertoireSide, TrainingProgress } from './features/openings/types';
import { AdminPanel } from './features/guided/AdminPanel';
import { GuidedOnboarding, type GuidedOnboardingResult } from './features/guided/GuidedOnboarding';
import { RepertoireMap } from './features/guided/RepertoireMap';
import { TodayPanel } from './features/guided/TodayPanel';
import { IdeaTrainingPanel } from './features/guided/IdeaTrainingPanel';
import { DailySessionBar } from './features/guided/DailySessionBar';
import { advanceScenario, beginScenarios, completeScenario, createIdeaTrainingSession, evaluateAuthoredMove, evaluateEngineLoss, submitPlanChoice, type IdeaTrainingSession } from './features/guided/ideaTraining';
import { EngineService } from './services/engineService';
import { usePositionAnalysis } from './services/usePositionAnalysis';
import { GuidedContentRepository, embeddedRepertoireGraph } from './services/guidedContentRepository';
import { GuidedLearnerRepository, LOCAL_LEARNER_ID } from './services/guidedLearnerRepository';
import { createSupabaseBrowserClient, getSupabaseUnavailableReason, SupabasePersistence } from './services/supabasePersistence';
import './styles.css';
import { ConnectedLessonWorkspace } from './features/connected/ConnectedLessonWorkspace';
import { createLessonSession } from './features/connected/session';
import type { LessonSession } from './features/connected/types';

const modes: Array<{ id: GameMode; label: string; icon: React.ComponentType<{ size: number }> }> = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'repertoire', label: 'Repertoire', icon: MapIcon },
  { id: 'opening-trainer', label: 'Train openings', icon: Brain },
  { id: 'curriculum', label: 'Study', icon: BookOpen },
  { id: 'game-review', label: 'Review', icon: ClipboardList },
];

type BoardWorkspace = {
  pgn: string; displayFen: string; ply: number; orientation: BoardOrientation;
  feedback: string; lastMove: { from: string; to: string } | null;
  engineAwaitingReply: boolean; studyPractice: boolean; studyMoveFeedback: string;
};

export default function App() {
  const managerRef = useRef(new GameManager());
  const engineRef = useRef(new EngineService());
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseUnavailableReason = useMemo(() => getSupabaseUnavailableReason(), []);
  const persistence = useMemo(() => new SupabasePersistence(supabaseClient), [supabaseClient]);
  const contentRepository = useMemo(() => new GuidedContentRepository(supabaseClient), [supabaseClient]);
  const learnerRepository = useMemo(() => new GuidedLearnerRepository(supabaseClient), [supabaseClient]);
  const trainer = useMemo(() => new OpeningTrainer(starterRepertoires), []);

  const [mode, updateMode] = useState<GameMode>('today');
  const boardWorkspaces = useRef<Record<string, BoardWorkspace>>({});
  const boardOwner = useRef('');
  const [snapshot, setSnapshot] = useState(managerRef.current.snapshot());
  const [side, setSide] = useState<RepertoireSide>('white');
  const [lineId, setLineId] = useState('white-vienna-main');
  const [themeFilter, setThemeFilter] = useState('all');
  const [moduleId, setModuleId] = useState(starterCurriculumModules[0]?.id ?? '');
  const [moveIndex, setMoveIndex] = useState(0);
  const [openingRetry, setOpeningRetry] = useState<{ pgn: string; moveIndex: number; expectedMove: string; exploring: boolean } | null>(null);
  const [openingRetryPractice, setOpeningRetryPractice] = useState(false);
  const [feedback, setFeedback] = useState('Choose a repertoire line and play the highlighted sequence.');
  const [lessonCard, setLessonCard] = useState<{ title: string; principle: string; summary: string } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [orientation, setOrientation] = useState<BoardOrientation>('white');
  const [pgnInput, setPgnInput] = useState('1. e4 e5 2. Nf3 Nc6');
  const [reviewPly, setReviewPly] = useState(0);
  const [reviewMode, setReviewMode] = useState<'pgn' | 'engine'>('pgn');
  const [analysis, setAnalysis] = useState('Engine analysis appears here.');
  const engineGeneration = useRef(0);
  const [engineBusy, setEngineBusy] = useState(false);
  const [engineAwaitingReply, setEngineAwaitingReply] = useState(false);
  useEffect(() => { setAnalysis(''); setEngineBusy(false); return () => { engineGeneration.current++; engineRef.current.stop(); }; }, [mode, reviewMode]);
  const [user, setUser] = useState<User | null>(null);
  const [learnerSetup, setLearnerSetup] = useState<LearnerSetup | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [localProgress, setLocalProgress] = useState<TrainingProgress[]>([]);
  const [hintText, setHintText] = useState('');
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [selectedStudyChoice, setSelectedStudyChoice] = useState('');
  const [studySubmitted, setStudySubmitted] = useState(false);
  const [showStudyHint, setShowStudyHint] = useState(false);
  const [studyPractice, setStudyPractice] = useState(false);
  const [studyMoveFeedback, setStudyMoveFeedback] = useState('');
  const [curriculumAttempts, setCurriculumAttempts] = useState<Record<string, CurriculumAttempt>>({});
  const [reviewDetection, setReviewDetection] = useState<{ lineName: string; matchedPlyCount: number; leftBookAtPly: number | null; coverageEnded?: boolean; lessonKey?: string } | null>(
    null
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [planPreview, setPlanPreview] = useState(false);
  const [activeCriticalPosition, setActiveCriticalPosition] = useState<CriticalPosition | null>(null);
  const [positionProgress, setPositionProgress] = useState<PositionProgress[]>([]);
  const [repertoireGraph, setRepertoireGraph] = useState<RepertoireGraph>(embeddedRepertoireGraph);
  const [guidedProfile, setGuidedProfile] = useState<LearnerProfile | null>(null);
  const [guidedSelections, setGuidedSelections] = useState<RepertoireSelection[]>([]);
  const [guidedMastery, setGuidedMastery] = useState<MasteryState[]>([]);
  const guidedMasteryRef = useRef<MasteryState[]>([]);
  const recordedAttemptIds = useRef(new Set<string>());
  const [guidedBacklog, setGuidedBacklog] = useState<RepertoireBacklogItem[]>([]);
  const [dailySession, setDailySession] = useState<DailySession | null>(null);
  const [activeLearningUnitKey, setActiveLearningUnitKey] = useState('');
  const [reviewLearnerSide, setReviewLearnerSide] = useState<'white' | 'black'>('white');
  const [isContentEditor, setIsContentEditor] = useState(false);
  const [contentDraft, setContentDraft] = useState<RepertoireGraph | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [activeConceptKey, setActiveConceptKey] = useState('');
  const [ideaSession, setIdeaSession] = useState<IdeaTrainingSession | null>(null);
  const [lessonSessions, setLessonSessions] = useState<LessonSession[]>([]);
  const [connectedSession, setConnectedSession] = useState<LessonSession | null>(null);
  const [syncStatus, setSyncStatus] = useState('');
  const [activeGapId, setActiveGapId] = useState<string | null>(null);
  const [pgnError, setPgnError] = useState('');
  const [workspaceReady, setWorkspaceReady] = useState<string | null>(null);
  const dockRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = dockRef.current?.querySelector<HTMLElement>('.dock-panel');
    if (panel) {
      panel.scrollTop = 0;
      if (!document.activeElement?.closest('.board-shell')) {
        const heading = panel.querySelector<HTMLElement>('h2, h3');
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      }
    }
    if (dockRef.current) dockRef.current.scrollTop = 0;
  }, [mode, moduleId, activeTaskIndex, activeGapId, activeCriticalPosition?.id]);
  const positionAnalysis = usePositionAnalysis(snapshot.fen, [user?.id ?? 'local', mode, reviewMode, lineId, moduleId, activeTaskIndex, activeCriticalPosition?.id, activeConceptKey, activeGapId].join(':'));

  const learnerId = user?.id ?? LOCAL_LEARNER_ID;
  const learnerIdentity = useRef(learnerId);
  learnerIdentity.current = learnerId;
  const activeConnectedLesson = connectedSession?.learnerId === learnerId ? repertoireGraph.connectedLessons?.[connectedSession.lessonKey] : undefined;
  const activeConceptDrill = repertoireGraph.conceptDrills?.[activeConceptKey];
  const trainingContext = useRef('');
  trainingContext.current = [learnerId, mode, lineId, moduleId, activeTaskIndex, activeConceptKey, activeGapId].join(':');
  const activeGap = guidedBacklog.find((item) => item.id === activeGapId);
  const relatedGapLesson = activeGap ? lessonForPosition(repertoireGraph, { familyKey: activeGap.openingFamilyKey, positionKey: activeGap.positionKey }) : undefined;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('chess-workspace:' + learnerId) ?? 'null');
      boardWorkspaces.current = saved?.boardWorkspaces ?? {};
      boardOwner.current = '';
      if (saved && (modes.some((item) => item.id === saved.mode) || saved.mode === 'idea-training')) {
        const result = managerRef.current.loadPgn(saved.pgn ?? '');
        if (result.ok) {
          const board = managerRef.current.snapshot();
          const replay = managerRef.current.getReplayPositions();
          const ply = Math.max(0, Math.min(saved.reviewPly ?? replay.length - 1, replay.length - 1));
          setSnapshot(saved.mode === 'game-review' ? { ...board, fen: replay[ply] } : board);
          setReviewPly(ply);
        }
        updateMode(saved.mode); setSide(saved.side === 'black' ? 'black' : 'white');
        boardOwner.current = saved.mode === 'game-review' ? (saved.activeGapId ? 'gap:' + saved.activeGapId : 'review:' + (saved.reviewMode === 'engine' ? 'engine' : 'pgn')) : saved.mode === 'curriculum' ? 'study:' + (starterCurriculumModules.find((item) => item.id === saved.moduleId)?.tasks[saved.taskIndex ?? 0]?.id ?? '') : '';
        setOrientation(saved.orientation === 'black' ? 'black' : 'white');
        if (trainer.findLine(saved.lineId)) setLineId(saved.lineId);
        if (starterCurriculumModules.some((module) => module.id === saved.moduleId)) setModuleId(saved.moduleId);
        setActiveTaskIndex(Math.max(0, saved.taskIndex ?? 0)); setMoveIndex(Math.max(0, saved.moveIndex ?? 0));
        setOpeningRetry(saved.openingRetry ?? null); setOpeningRetryPractice(Boolean(saved.openingRetryPractice));
        setReviewMode(saved.reviewMode === 'engine' ? 'engine' : 'pgn');
        setEngineAwaitingReply(Boolean(saved.engineAwaitingReply));
        setPgnInput(saved.pgnInput ?? ''); setReviewDetection(saved.reviewDetection ?? null);
        setActiveGapId(saved.activeGapId ?? null);
        const critical = starterRepertoires.flatMap((line) => line.criticalPositions ?? []).find((position) => position.id === saved.criticalId);
        setActiveCriticalPosition(critical ?? null); setPlanPreview(Boolean(saved.planPreview));
        setFeedback('Your workspace has been restored.');
        if (saved.mode === 'idea-training') {
          const drill = embeddedRepertoireGraph.conceptDrills?.[saved.activeConceptKey];
          if (drill && saved.ideaSession?.drillKey === drill.key) {
            setActiveConceptKey(drill.key);
            setIdeaSession({ ...saved.ideaSession, evaluating: false });
            if (saved.ideaSession.evaluating) {
              const scenario = drill.scenarios[saved.ideaSession.scenarioIndex];
              if (scenario) { loadConceptScenario(drill, saved.ideaSession.scenarioIndex); setFeedback('The interrupted scenario is ready to try again.'); }
            }
          } else updateMode('repertoire');
        }
      } else updateMode('today');
    } catch { boardWorkspaces.current = {}; boardOwner.current = ''; updateMode('today'); }
    setWorkspaceReady(learnerId);
  }, [learnerId, trainer]);

  useEffect(() => {
    if (!learnerSetup || workspaceReady !== learnerId || mode === 'connected-lesson' || mode === 'admin') return;
    rememberBoardWorkspace();
    try { localStorage.setItem('chess-workspace:' + learnerId, JSON.stringify({
      mode, side, orientation, lineId, moduleId, taskIndex: activeTaskIndex, moveIndex,
      pgn: managerRef.current.snapshot().pgn, reviewPly, reviewMode, engineAwaitingReply, pgnInput, reviewDetection, activeGapId,
      criticalId: activeCriticalPosition?.id, planPreview, activeConceptKey, ideaSession, boardWorkspaces: boardWorkspaces.current, openingRetry, openingRetryPractice
    })); } catch { /* The workspace remains usable when storage is unavailable. */ }
  }, [learnerId, workspaceReady, learnerSetup, mode, side, orientation, lineId, moduleId, activeTaskIndex, moveIndex, snapshot.fen, reviewPly, reviewMode, engineAwaitingReply, pgnInput, reviewDetection, activeGapId, activeCriticalPosition, planPreview, activeConceptKey, ideaSession, feedback, studyPractice, studyMoveFeedback, openingRetry, openingRetryPractice]);

  function backgroundSyncError(context: string, error: unknown) {
    reportBackgroundError(context, error);
    setSyncStatus(getErrorMessage(error, 'Progress sync needs attention.'));
  }

  useEffect(() => {
    let active = true;
    void learnerRepository.loadLessonSessions(learnerId).then((sessions) => {
      if (!active) return;
      setLessonSessions((current) => mergeLessonSessions(current, sessions));
      const id = localStorage.getItem('connected-active:' + learnerId);
      const saved = sessions.find((session) => session.id === id);
      if (saved && repertoireGraph.connectedLessons?.[saved.lessonKey]) {
        setConnectedSession(saved); setLearnerSetup((setup) => setup ?? createLegacySetup()); setMode('connected-lesson');
      }
    }).catch((error) => { if (active) backgroundSyncError('lesson session load', error); });
    const retry = () => { void learnerRepository.retryLessonSync(learnerId).catch((error) => { if (active) backgroundSyncError('lesson sync', error); }); };
    window.addEventListener('online', retry);
    return () => { active = false; window.removeEventListener('online', retry); };
  }, [learnerId, learnerRepository, repertoireGraph]);

  function trackLessonSession(session: LessonSession) {
    if (session.learnerId !== learnerIdentity.current) return;
    setConnectedSession(session);
    localStorage.setItem('connected-active:' + session.learnerId, session.id);
    setLessonSessions((sessions) => [...sessions.filter((item) => item.id !== session.id), session]);
  }

  function refreshLessonProgress() {
    const identity = learnerId;
    void learnerRepository.loadMastery(identity).then((mastery) => {
      if (learnerIdentity.current === identity) { setGuidedMastery(mastery); guidedMasteryRef.current = mastery; }
    }).catch((error) => { if (learnerIdentity.current === identity) backgroundSyncError('lesson mastery load', error); });
  }

  function startConnectedLesson(target: string) {
    const saved = target.startsWith('session:') ? lessonSessions.find((s) => s.id === target.slice(8) && s.learnerId === learnerId) : undefined;
    const lesson = saved ? repertoireGraph.connectedLessons?.[saved.lessonKey] : Object.values(repertoireGraph.connectedLessons ?? {}).find((l) => target === l.key || target.startsWith(l.key + '/'));
    if (!lesson) return;
    const journeyTarget = target === lesson.key + '/journey';
    const continuationTarget = target === lesson.key + '/continuation';
    const checkpoint = !journeyTarget && !continuationTarget && target.startsWith(lesson.key + '/') ? target.slice(lesson.key.length + 1) : undefined;
    const unfinished = lessonSessions.filter((s) => s.learnerId === learnerId && s.lessonKey === lesson.key && !s.supersededAt && (checkpoint
      ? s.reviewCheckpointId === checkpoint && (!s.completedAt || (currentDailyTarget(dailySession)?.contentKey === target && s.completedAt >= dailySession!.createdAt))
      : !s.reviewCheckpointId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const destination = mode === 'today' || mode === 'repertoire' || (mode === 'game-review' && activeGap) ? mode : 'opening-trainer';
    engineRef.current.stop();
    const next = saved ?? unfinished ?? createLessonSession(lesson, learnerId, destination, checkpoint);
    const opened = continuationTarget && lesson.continuation ? openContinuation(next, lesson.continuation) : next;
    trackLessonSession({ ...opened, returnDestination: destination, ...(journeyTarget && lesson.endgame ? { journey: { ...(next.journey ?? { step: 0 }), active: true }, continuation: next.continuation ? { ...next.continuation, active: false } : undefined } : {}) });
    setMode('connected-lesson');
  }

  function exitConnectedLesson(destination: LessonSession['returnDestination']) {
    localStorage.removeItem('connected-active:' + learnerId);
    setMode(destination);
    if (destination === 'game-review' && activeGapId) startGuidedTarget(activeGapId);
    if (destination === 'opening-trainer' && activeConnectedLesson) startOpening(activeConnectedLesson.openingFamilyKey);
  }

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
      learnerRepository.loadMastery(learnerId), learnerRepository.loadBacklog(learnerId), learnerRepository.loadLessonSessions(learnerId), learnerRepository.loadDailySessions(learnerId), learnerRepository.loadAttempts(learnerId)
    ])).then(([profile, selections, mastery, backlog, sessions, dailySessions, attempts]) => {
      if (!active) return;
      setGuidedProfile(profile); setGuidedSelections(selections); setGuidedMastery(mastery); setGuidedBacklog(backlog);
      setLessonSessions((current) => mergeLessonSessions(current, sessions));
      recordedAttemptIds.current = new Set(attempts.map((attempt) => attempt.id));
      const recent = [...dailySessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      setDailySession(recent?.status === 'active' || recent?.completedAt?.slice(0, 10) === new Date().toISOString().slice(0, 10) ? recent : null);
      if (profile?.onboardingCompleted) setLearnerSetup((current) => current ?? createLegacySetup());
    }).catch((error) => backgroundSyncError('guided progress load', error));
    if (user) {
      void contentRepository.isEditor().then((editor) => {
        if (!active) return;
        setIsContentEditor(editor);
        if (editor) void contentRepository.loadDraft().then(setContentDraft).catch((error) => backgroundSyncError('content draft load', error));
      });
    } else setIsContentEditor(false);
    return () => { active = false; };
  }, [contentRepository, learnerId, learnerRepository, user]);

  useEffect(() => {
    let active = true;
    void Promise.all([persistence.loadPositionProgress(learnerId), persistence.loadProgress(learnerId)]).then(([positions, lines]) => {
      if (!active) return;
      setPositionProgress(positions); setLocalProgress(lines);
      if (!user) return;
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
      for (const state of migrated) void learnerRepository.saveMastery(state).catch((error) => backgroundSyncError('migrated mastery save', error));
      if (migrated.length) setGuidedMastery((items) => mergeMastery(items, migrated));
    }).catch((error) => setFeedback(getErrorMessage(error, 'Could not load position progress.')));
    return () => { active = false; };
  }, [learnerRepository, persistence, repertoireGraph, user, learnerId]);

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
  const studyPosition = activeTask ? studyPositions[activeTask.id] : undefined;
  useEffect(() => {
    if (mode !== 'curriculum' || !studyPosition) return;
    const key = 'study:' + activeTask.id;
    if (restoreBoardWorkspace(key)) return;
    boardOwner.current = key;
    managerRef.current.reset(studyPosition.fen); setOrientation(studyPosition.side);
    setActiveCriticalPosition(null); setPlanPreview(false); setLastMove(null);
    setStudyPractice(false); setStudyMoveFeedback('');
    setFeedback(studyPosition.prompt); refresh();
  }, [mode, activeTask?.id]);
  useEffect(() => {
    let active = true;
    void persistence.loadCurriculumProgress(learnerId).then((items) => {
      if (!active) return;
      setCurriculumAttempts(Object.fromEntries(items.map((item) => [item.taskId, { taskId: item.taskId, answer: '', score: item.score, attempts: item.attempts, completed: item.status === 'passed', lastReviewedAt: item.lastReviewedAt, feedback: item.status === 'passed' ? 'Previously completed.' : 'Ready to practise again.' }])));
    }).catch((error) => backgroundSyncError('study progress load', error));
    return () => { active = false; };
  }, [learnerId, persistence]);
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
  const selectedOpeningKeys = guidedSelections.length
    ? guidedSelections.map((selection) => selection.openingFamilyKey).filter((key) => Boolean(repertoireGraph.openings[key]))
    : ['white-vienna-main', 'black-caro-kann-main'].filter((key) => Boolean(repertoireGraph.openings[key]));
  const effectiveProfile: LearnerProfile = guidedProfile ?? { learnerId, depth: 'foundation', goal: 'basic-plans', dailyDurationMinutes: 10, onboardingCompleted: true, updatedAt: new Date(0).toISOString() };
  const dailyPreview = useMemo(() => buildDailySession({ learnerId, durationMinutes: effectiveProfile.dailyDurationMinutes ?? 10, graph: repertoireGraph, selectedOpeningKeys, mastery: guidedMastery, backlog: guidedBacklog, lessonSessions: lessonSessions.filter((session) => session.learnerId === learnerId), profile: effectiveProfile, now: new Date().toISOString() }), [learnerId, effectiveProfile.dailyDurationMinutes, effectiveProfile.depth, effectiveProfile.goal, repertoireGraph, selectedOpeningKeys.join('|'), guidedMastery, guidedBacklog, lessonSessions]);
  function reviewMoveLabel(ply: number, san = '') { return moveLabel(ply, san, managerRef.current.getReplayPositions()[0]); }

  function refresh() {
    setSnapshot(managerRef.current.snapshot());
  }

  function currentBoardKey() {
    return mode === 'game-review' ? (activeGapId ? 'gap:' + activeGapId : 'review:' + reviewMode)
      : mode === 'curriculum' ? 'study:' + activeTask.id : '';
  }

  function rememberBoardWorkspace() {
    const key = currentBoardKey();
    if (!key || boardOwner.current !== key || workspaceReady !== learnerId) return;
    // Use the rendered snapshot: a destination handler may already have loaded
    // another position into the manager before requesting navigation.
    boardWorkspaces.current[key] = { pgn: snapshot.pgn, displayFen: snapshot.fen, ply: reviewPly, orientation, feedback, lastMove, engineAwaitingReply, studyPractice, studyMoveFeedback };
  }

  function restoreBoardWorkspace(key: string) {
    const saved = boardWorkspaces.current[key];
    if (!saved || typeof saved.pgn !== 'string' || !managerRef.current.loadPgn(saved.pgn).ok) return false;
    boardOwner.current = key;
    const board = managerRef.current.snapshot();
    const positions = managerRef.current.getReplayPositions();
    const selected = positions[saved.ply] === saved.displayFen ? saved.ply : positions.lastIndexOf(saved.displayFen);
    const ply = selected >= 0 ? selected : positions.length - 1;
    setSnapshot({ ...board, fen: positions[ply], legalTargets: ply === positions.length - 1 ? board.legalTargets : {} });
    setReviewPly(ply); setOrientation(saved.orientation); setLastMove(saved.lastMove);
    setFeedback(saved.feedback); setEngineAwaitingReply(key === 'review:engine' && saved.engineAwaitingReply);
    setStudyPractice(saved.studyPractice); setStudyMoveFeedback(saved.studyMoveFeedback);
    return true;
  }

  function openReviewBoard(next: 'pgn' | 'engine', gapId: string | null = null) {
    const key = gapId ? 'gap:' + gapId : 'review:' + next;
    if (restoreBoardWorkspace(key)) return;
    boardOwner.current = key;
    managerRef.current.reset(); setReviewPly(0); setLastMove(null); setEngineAwaitingReply(false);
    setOrientation(next === 'pgn' ? reviewLearnerSide : 'white');
    setFeedback(next === 'pgn' ? 'Load a PGN to review a game.' : 'Make a move on the board. Stockfish will reply automatically.');
    refresh();
  }

  function setMode(next: GameMode) {
    if (next === mode) { updateMode(next); return; }
    rememberBoardWorkspace();
    engineGeneration.current++; engineRef.current.stop(); setEngineBusy(false); setAnalysis('');
    boardOwner.current = '';
    if (next === 'game-review') openReviewBoard(reviewMode, activeGapId);
    updateMode(next);
  }

  useEffect(() => {
    if (workspaceReady === learnerId && mode === 'game-review' && reviewMode === 'engine' && !activeGapId && engineAwaitingReply && !engineBusy) void playEngineReply();
  }, [mode, reviewMode, workspaceReady]);

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

  function completeGuidedOnboarding(result: GuidedOnboardingResult) {
    const setup = createLegacySetup();
    setLearnerSetup(setup);
    setGuidedProfile(result.profile);
    const selections = result.openingFamilyKeys.map((openingFamilyKey) => ({
      id: createId(), learnerId, openingFamilyKey, preferredEdges: {}, updatedAt: result.profile.updatedAt
    } satisfies RepertoireSelection));
    setGuidedSelections(selections);
    void learnerRepository.saveProfile(result.profile).catch((error) => backgroundSyncError('setup save', error));
    for (const selection of selections) void learnerRepository.saveSelection(selection).catch((error) => backgroundSyncError('repertoire selection save', error));
    const first = selections.find((selection) => repertoireGraph.openings[selection.openingFamilyKey]?.side === 'white')?.openingFamilyKey;
    if (first) startOpening(first);
    setMode('today');
    setFeedback('Your repertoire map is ready. Start with the idea, then recall the move from the board.');
  }

  function saveDaily(next: DailySession) {
    setDailySession(next);
    void learnerRepository.saveDailySession(next).catch((error) => backgroundSyncError('daily session save', error));
  }

  function startDaily(next = dailyPreview) {
    const target = currentDailyTarget(next);
    if (target && !dailyTargetAvailable(target.kind, target.contentKey)) {
      const recovered = finishDailyActivity(next, { status: 'skipped', correct: 0, total: 0, assistanceUsed: 0, takeaway: 'This activity changed or is no longer available, so it was safely replaced by the next item.' }, new Date().toISOString());
      saveDaily(recovered); startDaily(recovered); return;
    }
    saveDaily(next);
    if (target) startGuidedTarget(target.contentKey); else setMode('today');
  }

  function dailyTargetAvailable(kind: string, key: string) {
    if (kind === 'connected-lesson') return key.startsWith('session:') ? lessonSessions.some((session) => session.id === key.slice(8)) : Object.values(repertoireGraph.connectedLessons ?? {}).some((lesson) => key === lesson.key || key.startsWith(lesson.key + '/'));
    if (kind === 'opening-unit') return Boolean(repertoireGraph.learningUnits[key]);
    if (kind === 'concept-drill') return Boolean(repertoireGraph.conceptDrills?.[key]);
    if (kind === 'study') return starterCurriculumModules.some((module) => module.tasks.some((task) => `study:${task.id}` === key));
    if (kind === 'tactic') return Boolean(repertoireGraph.motifs[key]);
    if (kind === 'saved-position') return guidedBacklog.some((item) => item.id === key);
    return false;
  }

  function dailyActivityMatches() {
    const target = currentDailyTarget(dailySession);
    if (!target) return false;
    if (target.kind === 'connected-lesson') return mode === 'connected-lesson' && Boolean(connectedSession && (target.contentKey === 'session:' + connectedSession.id || (!connectedSession.reviewCheckpointId && target.contentKey === connectedSession.lessonKey) || target.contentKey === connectedSession.lessonKey + '/' + connectedSession.reviewCheckpointId));
    if (target.kind === 'concept-drill') return mode === 'idea-training' && activeConceptKey === target.contentKey;
    if (target.kind === 'study') return mode === 'curriculum' && target.contentKey === 'study:' + activeTask?.id;
    if (target.kind === 'saved-position') return mode === 'game-review' && activeGapId === target.contentKey;
    if (target.kind === 'opening-unit') return mode === 'opening-trainer' && activeLearningUnitKey === target.contentKey;
    return target.kind === 'tactic' && mode === 'opening-trainer' && target.contentKey === 'motif:' + activeCriticalPosition?.id;
  }

  function dailyActivityComplete() {
    const target = currentDailyTarget(dailySession);
    if (!target || !dailySession || !dailyActivityMatches()) return false;
    if (target.kind === 'connected-lesson') return target.lessonCheckpointId ? Boolean(connectedSession?.completedCheckpoints.includes(target.lessonCheckpointId)) : Boolean(connectedSession?.completedAt);
    if (target.kind === 'concept-drill') return mode === 'idea-training' && ideaSession?.drillKey === target.contentKey && ideaSession.stage === 'summary';
    if (target.kind === 'study') return mode === 'curriculum' && target.contentKey === 'study:' + activeTask?.id && Boolean(activeTask && curriculumAttempts[activeTask.id]?.lastReviewedAt >= dailySession.createdAt);
    if (target.kind === 'saved-position') return mode === 'game-review' && activeGapId === target.contentKey && activeGap?.status === 'resolved';
    if (target.kind === 'opening-unit') {
      const unit = repertoireGraph.learningUnits[target.contentKey];
      return mode === 'opening-trainer' && activeLearningUnitKey === target.contentKey && Boolean(unit && buildPositionKey(snapshot.fen) === unit.endPositionKey && guidedMastery.some((m) => m.itemKey === target.contentKey && (m.recall.lastReviewedAt ?? '') >= dailySession.createdAt));
    }
    return target.kind === 'tactic' && guidedMastery.some((m) => m.itemKey === target.contentKey && (m.tactics.lastReviewedAt ?? '') >= dailySession.createdAt);
  }

  function finishDaily(status: 'completed' | 'skipped') {
    if (!dailySession || (status === 'completed' && !dailyActivityComplete())) return;
    const target = currentDailyTarget(dailySession);
    const result = outcomeForCurrentActivity('completed', target?.title);
    if (mode === 'connected-lesson') localStorage.removeItem('connected-active:' + learnerId);
    const outcome = status === 'skipped' ? { ...result, status: result.total > 0 ? 'partial' as const : 'skipped' as const, takeaway: `${target?.title ?? 'This activity'} is saved for later.` } : result;
    const next = finishDailyActivity(dailySession, outcome, new Date().toISOString());
    saveDaily(next);
    const following = currentDailyTarget(next);
    if (following) startGuidedTarget(following.contentKey);
    else setMode('today');
  }

  function outcomeForCurrentActivity(status: 'completed' | 'skipped', title?: string) {
    if (status === 'skipped') return { status, correct: 0, total: 0, assistanceUsed: 0, takeaway: `${title ?? 'This activity'} remains available for a later session.` } as const;
    if (mode === 'connected-lesson' && connectedSession) {
      const checkpoint = currentDailyTarget(dailySession)?.lessonCheckpointId;
      const answers = Object.entries(connectedSession.answers).filter(([key]) => !checkpoint || key === checkpoint).map(([, answer]) => answer);
      const assistance = Object.entries(connectedSession.assistance).filter(([key]) => !checkpoint || key === checkpoint).map(([, value]) => value);
      return { status, correct: answers.filter((answer) => answer.correct).length, total: answers.length, assistanceUsed: assistance.filter((item) => item.hint || item.revealed || item.analysis).length, takeaway: activeConnectedLesson?.continuation?.steps.find((step) => 'continuation:' + step.id === checkpoint)?.takeaway ?? activeConnectedLesson?.takeaway } as const;
    }
    if (mode === 'idea-training' && ideaSession && activeConceptDrill) { const results = [ideaSession.planCorrect, ...ideaSession.scenarioResults.map((item) => item.correct)].filter((value) => value !== null); return { status, correct: results.filter(Boolean).length, total: results.length, assistanceUsed: Number(ideaSession.hintUsed || ideaSession.revealed), takeaway: activeConceptDrill.principle } as const; }
    if (mode === 'curriculum' && activeTask) { const attempt = curriculumAttempts[activeTask.id]; return { status, correct: attempt?.completed ? 1 : 0, total: attempt ? 1 : 0, assistanceUsed: Number(showStudyHint), takeaway: activeStudyChallenge?.teachingPoint } as const; }
    return { status, correct: 0, total: 0, assistanceUsed: Number(Boolean(hintText)), takeaway: lessonCard?.principle ?? feedback } as const;
  }

  function updatePreferences(profile: LearnerProfile, openingKeys: string[]) {
    setGuidedProfile(profile);
    void learnerRepository.saveProfile(profile).catch((error) => backgroundSyncError('preferences save', error));
    const now = profile.updatedAt;
    for (const selection of guidedSelections.filter((item) => !openingKeys.includes(item.openingFamilyKey))) void learnerRepository.removeSelection(learnerId, selection.openingFamilyKey).catch((error) => backgroundSyncError('repertoire preference removal', error));
    const next = openingKeys.map((openingFamilyKey) => guidedSelections.find((item) => item.openingFamilyKey === openingFamilyKey) ?? { id: createId(), learnerId, openingFamilyKey, preferredEdges: {}, updatedAt: now });
    setGuidedSelections(next);
    for (const selection of next) void learnerRepository.saveSelection({ ...selection, updatedAt: now }).catch((error) => backgroundSyncError('repertoire preference save', error));
  }

  function setDailyDuration(duration: DailyDuration) { updatePreferences({ ...effectiveProfile, dailyDurationMinutes: duration, updatedAt: new Date().toISOString() }, selectedOpeningKeys); }

  function startOpening(openingKey: string) {
    setActiveLearningUnitKey('');
    const opening = repertoireGraph.openings[openingKey];
    if (!opening) return;
    const line = opening.lineKeys.map((key) => trainer.findLine(key)).find(Boolean);
    if (line) {
      setThemeFilter('all'); setSide(line.side); setOrientation(line.side); setLineId(line.id); resetBoard();
    }
    setMode('opening-trainer');
  }

  function startLearningUnit(unitKey: string) {
    const unit = repertoireGraph.learningUnits[unitKey];
    const line = unit ? trainer.findLine(unit.lineKey) : undefined;
    if (!unit || !line) return;
    setActiveLearningUnitKey(unit.key); setThemeFilter('all'); setSide(line.side); setOrientation(line.side); setLineId(line.id);
    const firstEdge = repertoireGraph.edges[unit.edgeKeys[0]];
    setMoveIndex(firstEdge?.order ?? 0); managerRef.current.reset(positionKeyToFen(unit.startPositionKey)); setLastMove(null); setFeedback(`Review ${unit.title}. Play your side; opponent replies are automatic.`); refresh(); setMode('opening-trainer');
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
    setPlanPreview(false);
    setActiveCriticalPosition(null);
    setHintText('');
    const drill = repertoireGraph.conceptDrills?.[drillKey];
    if (!drill) return;
    const opening = repertoireGraph.openings[drill.openingFamilyKey];
    const line = opening?.lineKeys.map((key) => trainer.findLine(key)).find(Boolean);
    if (line) { setSide(line.side); setLineId(line.id); setThemeFilter('all'); }
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
    if (targetKey.startsWith('study:')) {
      const taskId = targetKey.slice(6);
      const module = starterCurriculumModules.find((item) => item.tasks.some((task) => task.id === taskId));
      if (module) { selectStudyModule(module.id); selectStudyTask(module.tasks.findIndex((task) => task.id === taskId)); setMode('curriculum'); }
      return;
    }
    if (targetKey.startsWith('lesson:') || targetKey.startsWith('session:')) { startConnectedLesson(targetKey); return; }
    const concept = repertoireGraph.conceptDrills?.[targetKey];
    const unit = repertoireGraph.learningUnits[targetKey];
    const gap = guidedBacklog.find((item) => item.id === targetKey);
    if (gap) {
      rememberBoardWorkspace();
      setActiveGapId(gap.id); setReviewDetection(null); setPgnError('');
      setPlanPreview(false);
      setMode('game-review'); setReviewMode('pgn'); setActiveCriticalPosition(null);
      boardOwner.current = 'gap:' + gap.id;
      managerRef.current.reset(positionKeyToFen(gap.positionKey));
      setLastMove(null); setReviewPly(0);
      setFeedback('Saved gap: ' + gap.title + '. Try a candidate, analyse it, and save what you learned.');
      refresh();
    } else if (concept) startConceptDrill(concept.key);
    else if (unit) startLearningUnit(unit.key);
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
    if (next.planCorrect !== null) void recordGuidedAttempt({ itemKey: activeConceptDrill.key, positionKey: buildPositionKey(snapshot.fen), dimension: 'understanding', response: next.selectedChoiceId, correct: next.planCorrect, hintUsed: false, revealed: false }).catch((error) => backgroundSyncError('plan attempt save', error));
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
    const context = trainingContext.current;
    const expectedFen = managerRef.current.snapshot().fen;
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
    if (context !== trainingContext.current || expectedFen !== managerRef.current.snapshot().fen) return;
    setIdeaSession((current) => current ? completeScenario(current, result!) : current);
    setFeedback(`${result.feedback} ${scenario.teachingPoint}`);
    if (result.correct !== null) void recordGuidedAttempt({ itemKey: activeConceptDrill.key, positionKey: buildPositionKey(fen), dimension: 'understanding', response: playedUci, correct: result.correct, hintUsed: ideaSession.hintUsed, revealed: ideaSession.revealed }).catch((error) => backgroundSyncError('idea move save', error));
  }

  async function recordGuidedAttempt(input: Omit<LearningAttempt, 'id' | 'learnerId' | 'createdAt'>) {
    const now = new Date().toISOString();
    const target = currentDailyTarget(dailySession);
    const belongsToTarget = target && (target.contentKey === input.itemKey || target.contentKey === `study:${input.itemKey.replace(/^study:/, '')}` || (target.kind === 'opening-unit' && target.contentKey === input.itemKey));
    const attemptId = belongsToTarget ? target.attemptId : createId();
    if (recordedAttemptIds.current.has(attemptId)) return;
    recordedAttemptIds.current.add(attemptId);
    const attempt: LearningAttempt = { ...input, id: attemptId, learnerId, createdAt: now };
    const previous = guidedMasteryRef.current.find((item) => item.itemKey === input.itemKey) ?? createInitialMastery({ learnerId, itemKey: input.itemKey, positionKey: input.positionKey, now });
    const eligibleForMastery = previous[input.dimension].status === 'unseen' || previous[input.dimension].dueAt <= now;
    const next = eligibleForMastery ? scheduleReview(previous, attempt) : previous;
    guidedMasteryRef.current = guidedMasteryRef.current.some((item) => item.itemKey === next.itemKey) ? guidedMasteryRef.current.map((item) => item.itemKey === next.itemKey ? next : item) : [...guidedMasteryRef.current, next];
    setGuidedMastery((items) => items.some((item) => item.itemKey === next.itemKey) ? items.map((item) => item.itemKey === next.itemKey ? next : item) : [...items, next]);
    try { await Promise.all([learnerRepository.appendAttempt(attempt), ...(eligibleForMastery ? [learnerRepository.saveMastery(next)] : [])]); }
    catch (error) { recordedAttemptIds.current.delete(attemptId); throw error; }
  }

  function saveGap(item: RepertoireBacklogItem) {
    setGuidedBacklog((items) => items.map((existing) => existing.id === item.id ? item : existing));
    void learnerRepository.saveBacklogItem(item).catch((error) => backgroundSyncError('saved position update', error));
  }

  function addGuidedBacklog(input: Omit<RepertoireBacklogItem, 'id' | 'learnerId' | 'status' | 'createdAt'>) {
    if (guidedBacklog.some((item) => item.positionKey === input.positionKey && item.reason === input.reason)) return;
    const item: RepertoireBacklogItem = { ...input, id: createId(), learnerId, status: 'new', createdAt: new Date().toISOString() };
    setGuidedBacklog((items) => [...items, item]);
    void learnerRepository.saveBacklogItem(item).catch((error) => backgroundSyncError('repertoire backlog save', error));
  }

  async function resolveUncoveredMove(input: { fen: string; from: string; to: string; promotion?: string; positionKey: string; familyKey: string; title: string }) {
    const context = trainingContext.current;
    const expectedFen = managerRef.current.snapshot().fen;
    setFeedback('This move is outside your repertoire. Stockfish is checking whether it is still reasonable…');
    try {
      const comparison = await engineRef.current.compareMove(input.fen, { from: input.from, to: input.to, promotion: input.promotion }, { depth: 6 });
      if (context !== trainingContext.current || expectedFen !== managerRef.current.snapshot().fen) return;
      const loss = comparison.delta === null ? undefined : Math.max(0, -comparison.delta);
      const classification = classifyMove({ graph: repertoireGraph, positionKey: input.positionKey, playedUci: `${input.from}${input.to}${input.promotion ?? ''}`, openingFamilyKey: input.familyKey, engineCentipawnLoss: loss });
      setFeedback(classification.kind === 'uncovered' ? 'This move is outside your prepared lines. Saved to Today → Saved positions for review.' : classification.message);
      if (classification.kind !== 'reasonable') addGuidedBacklog({ positionKey: input.positionKey, openingFamilyKey: input.familyKey, reason: 'forgotten-move', title: input.title });
    } catch {
      if (context !== trainingContext.current || expectedFen !== managerRef.current.snapshot().fen) return;
      setFeedback('This move is outside your prepared lines. Saved to Today → Saved positions for review.');
      addGuidedBacklog({ positionKey: input.positionKey, openingFamilyKey: input.familyKey, reason: 'forgotten-move', title: input.title });
    }
  }

  function upsertLocalProgress(line: RepertoireLine, result: ReturnType<OpeningTrainer['recordMove']>) {
    const existing = localProgress.find((item) => item.lineId === line.id);
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

      void persistence.upsertProgress(next).catch((error) => backgroundSyncError('training progress save', error));
      setLocalProgress((items) => existing ? items.map((item) => (item.lineId === line.id ? next : item)) : [...items, next]);
  }

  function addReviewItem(item: ReviewItem) {
    setReviewItems((items) => (items.some((existing) => existing.id === item.id) ? items : [...items, item]));
  }

  function handleMove(from: string, to: string, promotion?: string) {
    if (mode === 'opening-trainer' && openingRetry && !openingRetry.exploring) return false;
    if (engineBusy || (mode === 'game-review' && reviewMode === 'engine' && engineAwaitingReply) || snapshot.fen !== managerRef.current.snapshot().fen || (mode === 'curriculum' && !studyPractice)) return false;
    if (planPreview) { setFeedback('This position is in review mode. Choose a lesson action or return to the opening line to practise.'); return false; }
    if (mode === 'idea-training' && ideaSession && (ideaSession.stage !== 'scenario' || ideaSession.evaluating || ideaSession.currentResult)) {
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

    if (mode === 'curriculum' && studyPosition && activeTask) {
      const correct = studyPosition.moves.includes(move.san);
      const message = correct ? 'Correct. ' + studyPosition.explanation : 'Try again. ' + studyPosition.prompt;
      setStudyMoveFeedback(message); setFeedback(message);
      if (!correct) managerRef.current.undo();
      else { setStudyPractice(false); setLastMove({ from, to }); }
      void recordGuidedAttempt({ itemKey: 'study:' + activeTask.id, positionKey: positionKeyBefore, dimension: 'understanding', response: move.san, correct, hintUsed: true, revealed: true }).catch((error) => backgroundSyncError('study practice save', error));
      refresh(); return correct;
    }
    if (mode === 'game-review') setReviewPly(managerRef.current.getReplayPositions().length - 1);
    setLastMove({ from, to });

    if (mode === 'opening-trainer' && openingRetry?.exploring) {
      setFeedback(`${move.san}. Exploration only. Retry this move to return to the repertoire decision.`);
      refresh(); return true;
    }

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
        hintCount: (existing?.hintCount ?? 0) + (hintText ? 1 : 0),
        mistakeThemes: result.status === 'incorrect' ? Array.from(new Set([...(existing?.mistakeThemes ?? []), ...activeCriticalPosition.themes])) : existing?.mistakeThemes ?? [],
        masteryScore: Math.max(0, Math.min(100, (existing?.masteryScore ?? 0) + (result.status === 'correct' ? (hintText ? 0 : 25) : -10))),
        dueAt: new Date(now.getTime() + (result.status === 'correct' ? 3 : 1) * 86400000).toISOString(),
        lastReviewedAt: now.toISOString()
      };
      setPositionProgress((items) => items.some((item) => item.positionId === next.positionId) ? items.map((item) => item.positionId === next.positionId ? next : item) : [...items, next]);
      void persistence.upsertPositionProgress(next).catch((error) => backgroundSyncError('position progress save', error));
      if (result.status === 'incorrect') {
        addReviewItem({ id: `review-position-${activeCriticalPosition.id}`, sourceType: 'theme', sourceId: activeCriticalPosition.id, title: `Review ${activeLine?.name ?? 'Alien Gambit'} critical position`, prompt: activeCriticalPosition.prompt, themeTags: activeCriticalPosition.themes, dueAt: next.dueAt, status: 'due' });
      }
      setFeedback(result.status === 'correct' ? `Correct. ${activeCriticalPosition.teachingPoint ?? ''}` : `Try again. ${activeCriticalPosition.expectedMoves.join(' or ')}. ${activeCriticalPosition.hint ?? ''}`);
      const motif = Object.values(repertoireGraph.motifs).find((item) => item.positionKeys.includes(positionKeyBefore));
      void recordGuidedAttempt({ itemKey: motif?.key ?? `motif:${activeCriticalPosition.id}`, positionKey: positionKeyBefore, dimension: 'tactics', response: move.san, correct: result.status === 'correct', hintUsed: Boolean(hintText), revealed: hintText.startsWith('Candidate:') }).catch((error) => backgroundSyncError('critical-position attempt save', error));
      if (result.status === 'correct') { setActiveCriticalPosition(null); setPlanPreview(true); }
      else { managerRef.current.undo(); setLastMove(null); setHintText('Candidate: ' + activeCriticalPosition.expectedMoves.join(' or ')); }
      refresh();
      return true;
    }

    if (mode === 'opening-trainer' && activeLine) {
      const result = trainer.recordMove(activeLine.id, moveIndex, move.san);
      if (!openingRetryPractice) upsertLocalProgress(activeLine, result);
      if (result.status === 'correct') {
        setOpeningRetryPractice(false);
        const explanation = trainer.moveExplanation(activeLine.id, moveIndex);
        setMoveIndex(result.nextMoveIndex);
        setFeedback(result.completed ? `${activeLine.name} completed.` : `Correct: ${move.san}. Next move ready.`);
        setLessonCard(
          explanation
            ? { title: 'Why this move?', principle: explanation.principle, summary: explanation.summary }
            : null
        );
        const unit = activeLearningUnitKey ? repertoireGraph.learningUnits[activeLearningUnitKey] : Object.values(repertoireGraph.learningUnits).find((item) => item.lineKey === activeLine.id && item.edgeKeys.includes(expectedEdge?.key ?? ''));
        if (unit && activeLearningUnitKey && expectedEdge) {
          let nextStep = unit.edgeKeys.indexOf(expectedEdge.key) + 1;
          let lastApplied = { from, to };
          while (nextStep < unit.edgeKeys.length) {
            const edge = repertoireGraph.edges[unit.edgeKeys[nextStep]];
            const position = repertoireGraph.positions[edge.from];
            if (!edge || position?.sideToMove === activeLine.side) break;
            const reply = managerRef.current.attemptMove(edge.uci.slice(0, 2), edge.uci.slice(2, 4), edge.uci.slice(4) || undefined);
            if (!reply.ok) break;
            lastApplied = { from: edge.uci.slice(0, 2), to: edge.uci.slice(2, 4) };
            nextStep += 1;
          }
          const complete = nextStep >= unit.edgeKeys.length;
          setLastMove(lastApplied); setMoveIndex(complete ? (repertoireGraph.edges[unit.edgeKeys.at(-1)!]?.order ?? moveIndex) + 1 : repertoireGraph.edges[unit.edgeKeys[nextStep]]?.order ?? result.nextMoveIndex);
          setFeedback(complete ? `${unit.title} complete. Mark the activity complete when you are ready.` : `Correct. The opponent replied automatically; your next move is ready.`);
          if (complete && !openingRetryPractice) void recordGuidedAttempt({ itemKey: unit.key, positionKey: unit.startPositionKey, dimension: 'recall', response: managerRef.current.snapshot().history.join(' '), correct: true, hintUsed: Boolean(hintText), revealed: feedback.startsWith('Repertoire move:') }).catch((error) => backgroundSyncError('opening unit result save', error));
        } else if (!openingRetryPractice) void recordGuidedAttempt({ itemKey: unit?.key ?? `legacy:${activeLine.id}:${moveIndex}`, positionKey: positionKeyBefore, dimension: 'recall', response: move.san, correct: true, hintUsed: Boolean(hintText), revealed: feedback.startsWith('Repertoire move:') }).catch((error) => backgroundSyncError('opening recall save', error));
      } else {
        setOpeningRetry({ pgn: snapshot.pgn, moveIndex, expectedMove: result.expectedMove ?? '', exploring: false });
        const explanation = trainer.moveExplanation(activeLine.id, moveIndex);
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
          explanation
            ? { title: 'The repertoire idea', principle: explanation.principle, summary: explanation.summary }
            : null
        );
        const unit = (activeLearningUnitKey ? repertoireGraph.learningUnits[activeLearningUnitKey] : undefined) ?? Object.values(repertoireGraph.learningUnits).find((item) => item.lineKey === activeLine.id && item.startPositionKey === positionKeyBefore)
          ?? Object.values(repertoireGraph.learningUnits).find((item) => item.lineKey === activeLine.id);
        if (!openingRetryPractice) void recordGuidedAttempt({ itemKey: unit?.key ?? `legacy:${activeLine.id}:${moveIndex}`, positionKey: positionKeyBefore, dimension: 'recall', response: move.san, correct: accepted, hintUsed: Boolean(hintText), revealed: false }).catch((error) => backgroundSyncError('opening deviation save', error));
        if (guidedClassification?.kind === 'mistake') {
          addGuidedBacklog({ positionKey: positionKeyBefore, reason: 'forgotten-move', title: `Review ${activeLine.name} after ${move.san}` });
        } else if (guidedClassification?.kind === 'uncovered') {
          void resolveUncoveredMove({ fen: snapshot.fen, from, to, promotion, positionKey: positionKeyBefore, familyKey, title: `Review ${activeLine.name} after ${move.san}` });
        }
      }
    }

    if (mode === 'game-review' && reviewMode === 'engine') {
      setFeedback(`You played ${move.san}. Stockfish is choosing a reply.`);
      void playEngineReply();
    }

    refresh();
    return true;
  }

  async function playEngineReply() {
    if (managerRef.current.snapshot().isGameOver) { setEngineAwaitingReply(false); setFeedback('The game has ended. Review the final position or start a new game.'); return; }
    setEngineAwaitingReply(true);
    const request = ++engineGeneration.current;
    const fen = managerRef.current.snapshot().fen;
    setEngineBusy(true);
    setAnalysis('Engine is thinking...');
    try {
      const bestMove = await engineRef.current.bestMove(fen, { depth: 6 });
      if (request !== engineGeneration.current || managerRef.current.snapshot().fen !== fen) return;
      if (!bestMove) {
        setAnalysis('Engine did not return a move.');
        return;
      }
      const applied = managerRef.current.attemptMove(bestMove.from, bestMove.to, bestMove.promotion);
      if (applied.ok) setEngineAwaitingReply(false);
      setAnalysis(applied.ok ? `Engine replied ${applied.san}.` : 'Engine returned an illegal move for this position.');
      setReviewPly(managerRef.current.getReplayPositions().length - 1);
      refresh();
    } catch (error) {
      if (request === engineGeneration.current) setAnalysis('Engine unavailable. Your position is preserved. Try again.');
    } finally { if (request === engineGeneration.current) setEngineBusy(false); }
  }

  function resetBoard() {
    setOpeningRetry(null); setOpeningRetryPractice(false);
    engineGeneration.current++; engineRef.current.stop(); setEngineBusy(false); setAnalysis('');
    setEngineAwaitingReply(false);
    setPlanPreview(false);
    setActiveLearningUnitKey('');
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
    setOpeningRetry(null); setOpeningRetryPractice(false);
    setPlanPreview(false);
    if (!activeLine) return;

    setActiveCriticalPosition(null);
    setHintText('');
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

  function showPlanMove(moves: string[], index: number, title: string) {
    if (!activeLine) return;
    setActiveCriticalPosition(null); setHintText(''); setPlanPreview(true);
    managerRef.current.reset();
    for (const move of [...activeLine.movesSan.slice(0, activeLine.modelPositionPly ?? activeLine.movesSan.length), ...moves.slice(0, index + 1)]) {
      const result = managerRef.current.applySanMove(move);
      if (!result.ok) { setFeedback(result.reason); refresh(); return; }
    }
    setLastMove(null);
    setFeedback(title + ': showing ' + moves[index] + '. This is an example continuation; the opponent can choose other replies.');
    refresh();
  }

  function selectTheme(nextTheme: string) {
    const nextLines = nextTheme === 'all' ? sideLines : sideLines.filter((line) => line.themeTags?.includes(nextTheme));
    setThemeFilter(nextTheme);
    setLineId(nextLines[0]?.id ?? sideLines[0]?.id ?? lineId);
    resetBoard();
  }

  function startCriticalPosition(position: CriticalPosition) {
    setPlanPreview(false);
    setMode('opening-trainer');
    setHintText('');
    setActiveCriticalPosition(position);
    managerRef.current.reset(position.fen);
    setMoveIndex(position.ply);
    setLastMove(null);
    setFeedback(position.prompt);
    refresh();
  }

  function switchReviewMode(nextMode: 'pgn' | 'engine') {
    if (nextMode === reviewMode && !activeGapId) return;
    rememberBoardWorkspace();
    engineGeneration.current++; engineRef.current.stop(); setEngineBusy(false); setAnalysis('');
    setActiveGapId(null); setPgnError('');
    setReviewMode(nextMode);
    setPlanPreview(false); setActiveCriticalPosition(null);
    openReviewBoard(nextMode);
  }

  function startAlienPractice() {
    engineGeneration.current++; engineRef.current.stop(); setEngineBusy(false); setEngineAwaitingReply(false);
    const line = side === 'black' ? trainer.findLine('black-alien-gambit-defense') : trainer.findLine('white-alien-gambit-main');
    managerRef.current.reset();
    setLineId(line?.id ?? lineId);
    setActiveCriticalPosition(null);
    setFeedback(`Alien Gambit practice ready for ${side}.`);
    refresh();
  }

  function showHint() {
    if (activeCriticalPosition) { setHintText(activeCriticalPosition.hint ?? activeCriticalPosition.prompt); return; }
    const expectedMove = activeLine?.movesSan[moveIndex];
    setHintText(expectedMove ? `Look for ${expectedMove}: it supports the opening idea before chasing tactics.` : 'This line is complete.');
  }

  function revealMove() {
    if (activeCriticalPosition) { const text = 'Candidate: ' + activeCriticalPosition.expectedMoves.join(' or ') + '. ' + (activeCriticalPosition.teachingPoint ?? ''); setHintText(text); setFeedback(text); return; }
    const expectedMove = activeLine?.movesSan[moveIndex];
    if (openingRetry) retryOpeningMove();
    setFeedback(expectedMove ? `Repertoire move: ${expectedMove}. Play it on the board when you are ready.` : 'This line is complete.');
  }

  function retryOpeningMove() {
    if (!openingRetry || !managerRef.current.loadPgn(openingRetry.pgn).ok) return;
    engineGeneration.current++; engineRef.current.stop(); setEngineBusy(false); setAnalysis('');
    setMoveIndex(openingRetry.moveIndex); setReviewPly(managerRef.current.getReplayPositions().length - 1);
    setOpeningRetry(null); setOpeningRetryPractice(true); setLastMove(null); setLessonCard(null);
    setFeedback('Try the repertoire move again. Your first answer remains recorded; this retry is practice.');
    refresh();
  }

  function loadReviewPgn() {
    if (!pgnInput.trim()) { setPgnError('Paste a PGN first. Example: 1. e4 e5 2. Nf3 Nc6. Your current board has been kept.'); return; }
    const result = managerRef.current.loadPgn(pgnInput);
    if (!result.ok) {
      setPgnError('This game could not be read. Check the move notation or paste a fresh PGN export. Example: 1. e4 e5 2. Nf3 Nc6. Your current board has been kept.');
      return;
    }

    setActiveGapId(null); setPgnError('');
    setReviewPly(managerRef.current.getReplayPositions().length - 1);
    setFeedback('PGN loaded for review.');
    let guidedDetection: ReturnType<typeof matchPgnToRepertoire> | null = null;
    try {
      guidedDetection = matchPgnToRepertoire({ pgn: pgnInput, graph: repertoireGraph, selectedOpeningFamilyKeys: selectedOpeningKeys.filter((key) => repertoireGraph.openings[key]?.side === reviewLearnerSide) });
    } catch {
      guidedDetection = null;
    }
    const matchedFamilies = guidedDetection?.ambiguousOpeningFamilyKeys ?? [];
    const matchedOpening = guidedDetection?.matchedOpeningFamilyKey ? repertoireGraph.openings[guidedDetection.matchedOpeningFamilyKey] : undefined;
    setReviewDetection(guidedDetection && guidedDetection.matchedPlyCount ? { lineName: matchedFamilies.length > 1 ? `Ambiguous match: ${matchedFamilies.map((key) => repertoireGraph.openings[key]?.name).filter(Boolean).join(' or ')}` : matchedOpening?.name ?? 'Selected repertoire', matchedPlyCount: guidedDetection.matchedPlyCount, leftBookAtPly: guidedDetection.divergencePly, coverageEnded: guidedDetection.coverageEnded, lessonKey: lessonForPosition(repertoireGraph, { familyKey: matchedOpening?.key, pgn: pgnInput })?.key } : null);
    if (guidedDetection?.coverageEnded) {
      setFeedback('You reached the end of this stored line. Choose a middlegame plan; the next move has not been classified as a mistake.');
    } else if (guidedDetection?.divergencePly && guidedDetection.matchedOpeningFamilyKey) {
      const reason = guidedDetection.divergingSide === 'learner' ? 'forgotten-move' : 'opponent-deviation';
      addGuidedBacklog({
        positionKey: guidedDetection.lastKnownPositionKey,
        reason,
        openingFamilyKey: guidedDetection.matchedOpeningFamilyKey ?? undefined,
        title: guidedDetection.divergingSide === 'learner'
          ? `Compare the repertoire choice before ${reviewMoveLabel(guidedDetection.divergencePly, managerRef.current.snapshot().history[guidedDetection.divergencePly - 1])}`
          : `Cover the opponent response at ${reviewMoveLabel(guidedDetection.divergencePly, managerRef.current.snapshot().history[guidedDetection.divergencePly - 1])}`
      });
      setFeedback(`As ${reviewLearnerSide}, this game follows ${matchedOpening?.name ?? 'your repertoire'} through ${reviewMoveLabel(guidedDetection.matchedPlyCount, managerRef.current.snapshot().history[guidedDetection.matchedPlyCount - 1])}. ${guidedDetection.divergingSide === 'learner' ? 'Your move' : "The opponent's move"} differed from the stored line. This is a repertoire difference, not an evaluated mistake.`);
    } else if (guidedDetection?.matchedPlyCount) setFeedback(`As ${reviewLearnerSide}, the game stayed inside ${matchedOpening?.name ?? 'your selected repertoire'}.`);
    else setFeedback(`No ${reviewLearnerSide} repertoire match was found. The game is loaded and no review item was created.`);
    refresh();
  }

  function selectStudyModule(nextModuleId: string) {
    rememberBoardWorkspace();
    setModuleId(nextModuleId);
    setActiveTaskIndex(0);
    setSelectedStudyChoice('');
    setStudySubmitted(false);
    setShowStudyHint(false);
  }

  function selectStudyTask(index: number) {
    rememberBoardWorkspace();
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
    void persistence.upsertCurriculumProgress({ userId: learnerId, moduleId, taskId: activeTask.id, score: correct ? activeTask.maxScore : 0, attempts: previousAttempts + 1, status: correct ? 'passed' : 'needs-review', lastReviewedAt: new Date().toISOString() }).catch((error) => backgroundSyncError('study progress save', error));
    void recordGuidedAttempt({ itemKey: 'study:' + activeTask.id, positionKey: buildPositionKey(studyPosition?.fen ?? snapshot.fen), dimension: 'understanding', response: selectedStudyChoice, correct, hintUsed: showStudyHint, revealed: false }).catch((error) => backgroundSyncError('study attempt save', error));
  }

  function stepReview(delta: number) {
    const positions = managerRef.current.getReplayPositions();
    const nextPly = Math.min(Math.max(reviewPly + delta, 0), positions.length - 1);
    showHistoryPly(nextPly);
  }

  async function analyzeCurrentPosition() {
    await positionAnalysis.run();
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
    <main className={`app-shell ${mode === 'idea-training' ? 'idea-workspace' : ''} ${!learnerSetup || mode === 'today' || mode === 'repertoire' ? 'overview-workspace' : ''}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Chess Opening Trainer</p>
          <h1>{!learnerSetup ? 'Welcome to your chess training' : mode === 'connected-lesson' ? activeConnectedLesson?.title : mode === 'opening-trainer' ? activeLine?.name : mode === 'idea-training' ? activeConceptDrill?.title : mode === 'admin' ? 'Content admin' : modes.find((item) => item.id === mode)?.label}</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            type="button"
            hidden={mode === 'connected-lesson'}
            aria-label={isHistoryOpen ? 'Hide moves' : 'Show moves'}
            title={isHistoryOpen ? 'Hide moves' : 'Show moves'}
            onClick={() => setIsHistoryOpen((open) => !open)}
          >
            <List size={18} />
          </button>
          <button hidden={mode === 'connected-lesson'} className="icon-button" type="button" title="Reset board" onClick={() => { if (mode === 'game-review' && activeGap) startGuidedTarget(activeGap.id); else if (mode === 'curriculum' && studyPosition) { managerRef.current.reset(studyPosition.fen); setStudyPractice(false); setStudyMoveFeedback(''); setFeedback(studyPosition.prompt); refresh(); } else resetBoard(); }}>
            <RotateCcw size={18} />
          </button>
          <details className="account-menu"><summary>{user ? 'Account' : 'Sign in / sync'}</summary><AuthPanel
            client={supabaseClient}
            user={user}
            onUserChange={setUser}
            layout="compact"
            unavailableReason={supabaseUnavailableReason}
          /></details>
        </div>
      </header>
      {learnerSetup && dailySession?.status === 'active' && mode !== 'today' && <DailySessionBar session={dailySession} canComplete={dailyActivityComplete()} active={dailyActivityMatches()} onResume={() => startDaily(dailySession)} onComplete={() => finishDaily('completed')} onSkip={() => finishDaily('skipped')} onSave={() => mode === 'connected-lesson' ? exitConnectedLesson('today') : setMode('today')} />}
      {mode === 'connected-lesson' && activeConnectedLesson && connectedSession ? <ConnectedLessonWorkspace key={learnerId + ':' + connectedSession.id} lesson={activeConnectedLesson} initialSession={connectedSession} depth={effectiveProfile.depth} repository={learnerRepository} onSessionChange={trackLessonSession} onPersisted={refreshLessonProgress} onExit={exitConnectedLesson} /> : <section className="workspace">
        {learnerSetup && mode !== 'today' && mode !== 'repertoire' && <div className="board-column">
          <ChessBoardUI
            fen={snapshot.fen}
            orientation={orientation}
            legalTargets={engineBusy || (mode === 'game-review' && reviewMode === 'engine' && engineAwaitingReply) || (mode === 'opening-trainer' && openingRetry && !openingRetry.exploring) || snapshot.fen !== managerRef.current.snapshot().fen || (mode === 'curriculum' && !studyPractice) || planPreview ? {} : snapshot.legalTargets}
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
          {mode !== 'idea-training' && <section className="feedback-strip" aria-label="Feedback">
            <div>
              <p className="eyebrow">Feedback</p>
              <p>{feedback}</p>
              {mode === 'opening-trainer' && openingRetry && <div className="opening-recovery"><p>{openingRetry.exploring ? 'Exploration is ungraded.' : 'Your move is recorded. Retry from the previous position or explore this continuation.'}</p><div className="button-row"><button className="primary-button" onClick={retryOpeningMove}>Retry this move</button>{!openingRetry.exploring && <button className="secondary-button" onClick={() => { setOpeningRetry({ ...openingRetry, exploring: true }); setFeedback('Explore either side without grading. Retry this move returns to the original decision.'); }}>Explore this continuation</button>}</div></div>}
              <p className="analysis" role="status">{mode === 'game-review' && reviewMode === 'engine' ? analysis : positionAnalysis.text}</p>
            </div>
            <div className="feedback-actions">
              <button className="secondary-button" type="button" onClick={copyGamePgn}>
                Copy PGN
              </button>
              <button className="secondary-button" type="button" disabled={positionAnalysis.busy || engineBusy} onClick={analyzeCurrentPosition}>
                Analyze position
              </button>
              {positionAnalysis.busy && <button className="secondary-button" onClick={positionAnalysis.stop}>Stop analysis</button>}
              {mode === 'game-review' && reviewMode === 'engine' && engineAwaitingReply && !engineBusy && <button className="secondary-button" onClick={() => void playEngineReply()}>Retry engine reply</button>}
            </div>
          </section>}
          {syncStatus && <div className="sync-status" role="status"><span>Progress sync: {syncStatus}</span><button className="link-button" onClick={() => setSyncStatus('')}>Dismiss</button></div>}
          {isHistoryOpen && (
            <section className="history-drawer" aria-label="Move history">
              <div>
                <p className="eyebrow">Move history</p>
                <div className="history">
                  {snapshot.history.length
                    ? snapshot.history.map((move, index) => {
                        const ply = index + 1;
                        const movePrefix = reviewMoveLabel(ply);

                        return (
                          <button
                            key={`${move}-${index}`}
                            className={reviewPly === ply ? 'selected' : ''}
                            type="button"
                            aria-label={`Move ${reviewMoveLabel(ply, move)}`}
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
        </div>}

        <aside ref={dockRef} className="task-dock" aria-label="Task dock">
          {!learnerSetup && (
            <GuidedOnboarding learnerId={learnerId} openings={Object.values(repertoireGraph.openings)} onComplete={completeGuidedOnboarding} />
          )}

          <nav hidden={!learnerSetup} className="mode-tabs" aria-label="Chess modes">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={mode === item.id || (mode === 'idea-training' && item.id === 'repertoire') ? 'active' : ''}
                  type="button"
                  onClick={() => { if (item.id === 'game-review' && activeGapId) { startGuidedTarget(activeGapId); return; } setPlanPreview(false); setActiveCriticalPosition(null); if (item.id === 'opening-trainer') { setOrientation(side); resetBoard(); } setMode(item.id); }}
                  title={item.label}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
            {isContentEditor && <button className={mode === 'admin' ? 'active' : ''} type="button" onClick={() => setMode('admin')} title="Admin"><Shield size={17} />Admin</button>}
          </nav>

          {learnerSetup && mode === 'today' && <TodayPanel dailySession={dailySession} preview={dailyPreview} profile={effectiveProfile} openings={Object.values(repertoireGraph.openings)} selectedOpeningKeys={selectedOpeningKeys} mastery={guidedMastery} sessions={lessonSessions} lessons={repertoireGraph.connectedLessons} backlog={guidedBacklog} onStart={startGuidedTarget} onStartSession={() => startDaily()} onContinueSession={() => dailySession && startDaily(dailySession)} onDuration={setDailyDuration} onPreferences={updatePreferences} />}

          {learnerSetup && mode === 'repertoire' && <RepertoireMap onLine={(key) => { const line = trainer.findLine(key); if (line) { startOpening(line.parentLineId ?? key); setLineId(key); } }} sessions={lessonSessions} graph={repertoireGraph} selectedKeys={selectedOpeningKeys} mastery={guidedMastery} onTrain={startOpening} onPracticeIdeas={startIdeasForOpening} onConcept={startConceptDrill} onLesson={startConnectedLesson} />}

          {learnerSetup && mode === 'idea-training' && activeConceptDrill && ideaSession && (
            <IdeaTrainingPanel
              depth={effectiveProfile.depth}
              openingName={repertoireGraph.openings[activeConceptDrill.openingFamilyKey]?.name}
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
              notice={feedback.startsWith('The interrupted scenario') ? feedback : undefined}
              boardTools={<><div className="button-row"><button className="secondary-button" onClick={copyGamePgn}>Copy PGN</button><button className="secondary-button" disabled={positionAnalysis.busy} onClick={analyzeCurrentPosition}>Analyze position</button>{positionAnalysis.busy && <button onClick={positionAnalysis.stop}>Stop analysis</button>}</div><p role="status">{positionAnalysis.text}</p></>}
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
              <select aria-label="Repertoire line" value={lineId} onChange={(event) => selectLine(event.target.value)}>
                {visibleSideLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
              {activeLine && <section className="opening-bridge" aria-label="Opening to middlegame">
                {Object.values(repertoireGraph.connectedLessons ?? {}).filter((lesson) => lesson.lineKey === activeLine.id).map((lesson) => <button key={lesson.key} className="primary-button" onClick={() => startConnectedLesson(lesson.key)}>Learn this opening</button>)}
                <p className="eyebrow">From these moves to a playable plan</p>
                <h3>{activeCriticalPosition ? 'Tactical decision' : 'What comes after the opening?'}</h3>
                <p>{activeCriticalPosition?.prompt ?? activeLine.middlegameIdeas?.[0]?.summary ?? activeLine.explanation}</p>
                <div className="learning-actions">
                  <button className="secondary-button" type="button" onClick={() => showRepertoireMove((activeLine.modelPositionPly ?? activeLine.movesSan.length) - 1)}>See the resulting position</button>
                  {Object.values(repertoireGraph.conceptDrills ?? {}).some((drill) => repertoireGraph.openings[drill.openingFamilyKey]?.lineKeys.includes(activeLine.id)) && <button className="primary-button" type="button" onClick={() => {
                    const family = Object.values(repertoireGraph.openings).find((opening) => opening.lineKeys.includes(activeLine.id));
                    if (family) startIdeasForOpening(family.key);
                  }}>Practise opening plans</button>}
                  {(activeLine.criticalPositions ?? []).map((position, index) => <button className="secondary-button" key={position.id} type="button" onClick={() => startCriticalPosition(position)}>Tactical decision {index + 1} · {position.themes.map(formatThemeLabel).join(' / ')}</button>)}
                </div>
                {(activeCriticalPosition || planPreview) && <button className="link-button" type="button" onClick={resetBoard}>Return to the opening line</button>}
              </section>}
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
                      <div className="move-strip" aria-label={idea.title + ' continuation'}>{idea.planMoves?.map((move, index) => <button key={index} type="button" aria-label={'Show plan move ' + (index + 1) + ': ' + move} onClick={() => showPlanMove(idea.planMoves!, index, idea.title)}>{index + 1}. {move}</button>)}</div>
                      <small>Click through this example from the opening’s model position.</small>
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
                    <span>{curriculumAttempts[task.id]?.completed ? '✓' : activeModule.tasks.indexOf(task) + 1}</span>{' '}
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
                  <ChoiceGroup label="Study choices" choices={activeStudyChallenge?.choices ?? []} value={selectedStudyChoice} onChange={(id) => { setSelectedStudyChoice(id); setStudySubmitted(false); }} />
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
              {studyPosition && <section className="critical-position-card" aria-label="Study position practice">
                <h3>Try the idea on the board</h3><p>{studyPosition.prompt}</p><p className="analysis">Follow the prompt for guided practice. This exercise does not count as an unassisted answer.</p>
                <button className="secondary-button" onClick={() => { managerRef.current.reset(studyPosition.fen); setStudyPractice(true); setStudyMoveFeedback(''); setFeedback(studyPosition.prompt); setLastMove(null); refresh(); }}>{studyPractice ? 'Restart exercise' : 'Practise this position'}</button>
                {studyPractice && <p role="status">You play {studyPosition.side}. Tap a piece and its destination, drag, or use the keyboard.</p>}
                {studyMoveFeedback && <p className="study-feedback" role="status">{studyMoveFeedback}</p>}
              </section>}
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
              {activeGap ? <SavedPositionPanel key={activeGap.id} item={activeGap} lessonTitle={relatedGapLesson?.title} onSave={saveGap} onReset={() => startGuidedTarget(activeGap.id)} onClose={() => setMode('today')} onLesson={() => relatedGapLesson && startConnectedLesson(relatedGapLesson.key)} /> : reviewMode === 'pgn' ? (
                <>
                  <section className="review-queue" aria-label="Due practice"><h3>Due practice</h3>{guidedMastery.filter((item) => [item.recall, item.understanding, item.tactics].some((dimension) => dimension.status !== 'unseen' && dimension.dueAt <= new Date().toISOString())).slice(0, 4).map((item) => <button className="theory-branch-button" key={item.itemKey} onClick={() => startGuidedTarget(item.itemKey)}>{item.itemKey.replace(/^(unit:|concept:|study:|motif:)/, '').replaceAll('-', ' ')}</button>)}{!guidedMastery.some((item) => [item.recall, item.understanding, item.tactics].some((dimension) => dimension.status !== 'unseen' && dimension.dueAt <= new Date().toISOString())) && <p className="analysis">Nothing is due right now.</p>}</section>
                  <section className="review-queue" aria-label="Saved positions"><h3>Saved positions</h3>{guidedBacklog.filter((item) => item.status !== 'resolved').map((item) => <button className="theory-branch-button" key={item.id} onClick={() => startGuidedTarget(item.id)}>{item.title}</button>)}{guidedBacklog.every((item) => item.status === 'resolved') && <p className="analysis">No saved positions awaiting review.</p>}</section>
                  <h3>Import a game</h3>
                  <p>Paste a PGN to replay the game, step through positions, and see where it left your opening repertoire.</p>
                  <div className="segmented-control" role="group" aria-label="Your colour in this game"><button className={reviewLearnerSide === 'white' ? 'selected' : ''} onClick={() => setReviewLearnerSide('white')}>I played White</button><button className={reviewLearnerSide === 'black' ? 'selected' : ''} onClick={() => setReviewLearnerSide('black')}>I played Black</button></div>
                  <textarea aria-invalid={Boolean(pgnError)} aria-describedby={pgnError ? 'pgn-error' : undefined} aria-label="PGN input" value={pgnInput} onChange={(event) => { setPgnInput(event.target.value); setPgnError(''); }} />
                  {pgnError && <p id="pgn-error" role="alert">{pgnError}</p>}
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
                        {reviewDetection.lineName}: matched through {reviewMoveLabel(reviewDetection.matchedPlyCount, snapshot.history[reviewDetection.matchedPlyCount - 1])}
                      </strong>
                      <p>
                        {reviewDetection.coverageEnded ? 'End of stored coverage. Continue with a middlegame plan.' : reviewDetection.leftBookAtPly
                          ? `First different move: ${reviewMoveLabel(reviewDetection.leftBookAtPly, snapshot.history[reviewDetection.leftBookAtPly - 1])}.`
                          : 'You stayed inside the starter repertoire.'}
                        {reviewDetection.leftBookAtPly && <button className="link-button" onClick={() => showHistoryPly(reviewDetection.leftBookAtPly! - 1)}>Inspect position before the difference</button>}
                      </p>
                      {reviewDetection.lessonKey && <button className="primary-button" onClick={() => startConnectedLesson(reviewDetection.lessonKey + '/structure')}>Choose a middlegame plan</button>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p>Make a move on the board. Stockfish replies automatically, so you can play a complete training game without leaving Review.</p>
                  {engineAwaitingReply && !engineBusy && <button className="primary-button" onClick={playEngineReply}>Get Stockfish reply</button>}
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
      </section>}
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

function mergeLessonSessions(current: LessonSession[], incoming: LessonSession[]): LessonSession[] {
  const merged = new Map(current.map((session) => [session.learnerId + ':' + session.id, session]));
  for (const session of incoming) {
    const key = session.learnerId + ':' + session.id;
    const previous = merged.get(key);
    if (!previous || session.updatedAt >= previous.updatedAt) merged.set(key, session);
  }
  return [...merged.values()];
}
