import { Chess } from 'chess.js';
import { starterRepertoires } from '../../data/repertoires';
import type { ConnectedLesson } from './types';
import { PawnStructure } from './PawnStructure';
import type { RepertoireLine } from '../openings/types';

const guides: Record<string, { title: string; breaks: string; pieces: string; counterplay: string; exchanges: string; ending: string }> = {
  'white-vienna-main': { title: 'Space on e5 and a half-open f-file', breaks: 'Support e5 with d4 when forcing threats allow it. The f-pawn has already captured onto e5; use the half-open f-file after development.', pieces: 'Develop the f1 bishop, secure the king, and bring the rook to the f-file.', counterplay: 'Black’s d5 pawn attacks c4; the central knight can interrupt development. Check threats before choosing the bishop’s square.', exchanges: 'After …Nxc3, bxc3 supports d4; an earlier dxc3 opens the c1 bishop. The recapture changes the structure.', ending: 'If major pieces leave, reassess e5 and doubled c-pawns. King activity replaces the attack.' },
  'black-caro-kann-main': { title: 'Active bishop, central counterplay', breaks: 'Prepare …c5 against d4 after attending to concrete threats and development.', pieces: 'Preserve the light-squared bishop’s activity; coordinate the knights and castle.', counterplay: 'White can gain space with h4–h5 or use active pieces to support d4.', exchanges: 'If White later plays c3, …cxd4 cxd4 can leave an isolated d-pawn. Inspect the actual recapture and which adjacent pawns remain.', ending: 'After queen trades, weigh the d-pawn target against White’s activity and your rook’s entry squares.' },
  'white-london-solid': { title: 'A supported d4 centre', breaks: 'Prepare e4 or c4 with enough piece support to answer central exchanges.', pieces: 'The dark-squared bishop is outside the pawn chain; coordinate the knights, Bd3 and the rooks.', counterplay: 'Black’s …c5 contests d4; …Qb6 adds pressure on b2.', exchanges: 'A recapture on d4 can change the c-file and the base of the pawn chain.', ending: 'Reassess the minor pieces and pawn weaknesses before exchanging queens.' },
  'black-sicilian-basic': { title: 'A half-open c-file and asymmetric pawns', breaks: 'Look for a prepared …d5 break rather than leaving White all the central space.', pieces: 'Coordinate the knights and the c-file rook; the bishop setup depends on the branch.', counterplay: 'White can use faster development and kingside space for an attack.', exchanges: 'Exchanging a central pawn changes files and central control; check the resulting piece activity.', ending: 'The queenside pawn majority may matter later, but activity and king safety decide which trades are useful.' }
};

function model(line: RepertoireLine) { const chess = new Chess(); for (const move of line.movesSan.slice(0, line.modelPositionPly ?? line.movesSan.length)) chess.move(move); return chess; }
function pawns(chess: Chess) { return chess.board().flat().filter((p) => p?.type === 'p').map((p) => p!.color + p!.square).sort().join(','); }
export function StructureGuide({ lineKey, lesson, onLesson, onLine }: { lineKey: string; lesson?: ConnectedLesson; onLesson?: (key: string) => void; onLine?: (key: string) => void }) {
  const line = starterRepertoires.find((item) => item.id === lineKey);
  if (!line) return null;
  const position = model(line);
  const guide = guides[lineKey];
  const related = starterRepertoires.filter((item) => item.id !== line.id && item.side === line.side && (item.parentLineId === line.id || pawns(model(item)) === pawns(position)));
  return <details className="structure-guide"><summary>Structure, exchanges & endings</summary>
    <div className="structure-overview"><PawnStructure fen={position.fen()} label="Pawns at the model position" side={line.side} /><div><h3>{guide?.title ?? line.name}</h3><p>{guide?.breaks ?? line.explanation}</p><p className="analysis">Pawn diagram only. Open the lesson to inspect the pieces and calculate the position.</p></div></div>
    {guide && <dl className="structure-facts"><dt>Useful piece placements</dt><dd>{guide.pieces}</dd><dt>Opponent’s counterplay</dt><dd>{guide.counterplay}</dd><dt>What an exchange changes</dt><dd>{guide.exchanges}</dd><dt>What survives into the ending</dt><dd>{guide.ending}</dd></dl>}
    {related.length > 0 && <><h4>Compare related lines</h4>{related.map((other) => { const otherPosition = model(other); const exact = position.fen().split(' ').slice(0, 4).join(' ') === otherPosition.fen().split(' ').slice(0, 4).join(' '); return <button className="theory-branch-button" key={other.id} onClick={() => onLine?.(other.id)}><strong>{other.name}</strong><small>{exact ? 'Same position, including side to move and castling rights' : pawns(position) === pawns(otherPosition) ? 'Same pawn layout; the pieces or move order differ' : 'Different pawn structure in this opening family'}</small></button>; })}</>}
    {lesson && <nav className="connection-links" aria-label={`${line.name} learning connections`}><button onClick={() => onLesson?.(lesson.key + '/structure')}>Learn the structure</button><button onClick={() => onLesson?.(lesson.key + '/' + lesson.mainStartId)}>Compare plans on the board</button>{lesson.continuation && <button onClick={() => onLesson?.(lesson.key + '/continuation')}>Follow this position into an ending</button>}{lesson.endgame && <button onClick={() => onLesson?.(lesson.key + '/journey')}>Choose exchanges & play the ending</button>}</nav>}
  </details>;
}
