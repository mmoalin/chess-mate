import type { LessonSession } from '../../features/connected/types';
import type {
  LearnerProfile,
  LearningAttempt,
  MasteryState,
  RepertoireBacklogItem,
  RepertoireGraph,
  RepertoireSelection
} from './types';

export interface ContentRepository {
  loadPublished(): Promise<RepertoireGraph>;
  loadDraft(): Promise<RepertoireGraph | null>;
  saveDraft(graph: RepertoireGraph): Promise<void>;
  clonePublishedToDraft(): Promise<RepertoireGraph>;
  publishDraft(): Promise<RepertoireGraph>;
  isEditor(): Promise<boolean>;
}

export interface LearnerRepository {
  loadLessonSessions(learnerId: string): Promise<LessonSession[]>;
  saveLessonSession(session: LessonSession): Promise<void>;
  retryLessonSync(learnerId: string): Promise<void>;
  loadProfile(learnerId: string): Promise<LearnerProfile | null>;
  saveProfile(profile: LearnerProfile): Promise<void>;
  loadSelections(learnerId: string): Promise<RepertoireSelection[]>;
  saveSelection(selection: RepertoireSelection): Promise<void>;
  loadMastery(learnerId: string): Promise<MasteryState[]>;
  saveMastery(mastery: MasteryState): Promise<void>;
  appendAttempt(attempt: LearningAttempt): Promise<void>;
  loadAttempts(learnerId: string): Promise<LearningAttempt[]>;
  loadBacklog(learnerId: string): Promise<RepertoireBacklogItem[]>;
  saveBacklogItem(item: RepertoireBacklogItem): Promise<void>;
  sync?(learnerId: string): Promise<void>;
}
