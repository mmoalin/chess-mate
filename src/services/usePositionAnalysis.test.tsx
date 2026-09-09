import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { EngineService, type EngineAnalysis } from './engineService';
import { formatAnalysis, usePositionAnalysis } from './usePositionAnalysis';

afterEach(() => vi.restoreAllMocks());
describe('position-bound analysis', () => {
  it('discards a late answer after changing position and clearing existing advice', async () => {
    let resolve!: (result: EngineAnalysis) => void;
    vi.spyOn(EngineService.prototype, 'analyze').mockImplementation(() => new Promise((r) => { resolve = r; }));
    const position = new Chess();
    const { result, rerender } = renderHook(({ fen }) => usePositionAnalysis(fen, 'review'), { initialProps: { fen: position.fen() } });
    let pending!: Promise<void>;
    act(() => { pending = result.current.run(); });
    expect(result.current.busy).toBe(true);
    position.move('e4');
    rerender({ fen: position.fen() });
    expect(result.current.text).toBe('');
    await act(async () => { resolve({ bestMove: { from: 'e2', to: 'e4' }, score: null, depth: 8, pv: [] }); await pending; });
    expect(result.current.text).toBe('');
    expect(result.current.busy).toBe(false);
  });
  it('clears completed advice when the learning context changes at the same position', async () => {
    vi.spyOn(EngineService.prototype, 'analyze').mockResolvedValue({ bestMove: { from: 'e2', to: 'e4' }, score: null, depth: 8, pv: [] });
    const { result, rerender } = renderHook(({ scope }) => usePositionAnalysis(new Chess().fen(), scope), { initialProps: { scope: 'review' } });
    await act(async () => { await result.current.run(); });
    await waitFor(() => expect(result.current.text).toContain('Candidate: e4'));
    rerender({ scope: 'study' });
    expect(result.current.text).toBe('');
  });
  it('uses SAN and states a consistent White evaluation perspective', () => {
    const position = new Chess(); position.move('e4');
    expect(formatAnalysis(position.fen(), { bestMove: { from: 'e7', to: 'e5' }, score: { type: 'cp', value: -15 }, depth: 8, pv: [] })).toContain('Black to move · Candidate: e5. Evaluation 0.15 pawns from White’s perspective');
  });
});
