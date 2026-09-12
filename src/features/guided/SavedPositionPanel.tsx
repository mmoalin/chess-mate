import { useState } from 'react';
import type { RepertoireBacklogItem } from '../../domain/repertoire/types';

export function SavedPositionPanel({ item, lessonTitle, onSave, onLesson, onReset, onClose }: {
  item: RepertoireBacklogItem; lessonTitle?: string;
  onSave: (item: RepertoireBacklogItem) => void; onLesson: () => void; onReset: () => void; onClose: () => void;
}) {
  const [notes, setNotes] = useState(item.notes ?? '');
  const [saved, setSaved] = useState(false);
  return <section className="saved-position-panel" aria-label="Saved gap review">
    <p className="eyebrow">{item.status === 'resolved' ? 'Reviewed position' : 'Saved position'}</p>
    <h2>{item.title}</h2>
    <p>{item.reason === 'opponent-deviation' ? 'Your opponent chose a different response.' : item.reason === 'missed-tactic' ? 'Revisit the tactical opportunity.' : 'Compare your choice with the stored repertoire.'} Try a candidate on the board, then analyse the resulting position.</p>
    <button className="secondary-button" onClick={onReset}>Return to saved position</button>
    <label className="saved-notes">Candidate move and plan<textarea aria-label="Candidate move and plan" value={notes} onChange={(event) => { setNotes(event.target.value); setSaved(false); }} /></label>
    <p className="analysis">Notes are saved on this device.</p>
    <div className="button-row">
      <button className="secondary-button" onClick={() => { onSave({ ...item, notes }); setSaved(true); }}>Save notes</button>
      <button className="primary-button" onClick={() => { onSave({ ...item, notes, status: item.status === 'resolved' ? 'new' : 'resolved' }); setSaved(true); }}>{item.status === 'resolved' ? 'Reopen for review' : 'Mark reviewed'}</button>
    </div>
    <p role="status">{saved ? 'Saved.' : ''}</p>
    {lessonTitle && <button className="secondary-button" onClick={() => { onSave({ ...item, notes }); onLesson(); }}>Study related lesson: {lessonTitle}</button>}
    <button className="link-button" onClick={() => { onSave({ ...item, notes }); onClose(); }}>Back to Today</button>
  </section>;
}
