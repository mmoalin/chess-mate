export class LichessAPI {
  constructor(private readonly baseUrl = 'https://lichess.org') {}

  async fetchGamePgn(gameId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/game/export/${gameId}`, {
      headers: { Accept: 'application/x-chess-pgn' }
    });

    if (!response.ok) {
      throw new Error(`Unable to fetch Lichess PGN: ${response.status}`);
    }

    return response.text();
  }

  async fetchDailyPuzzle(): Promise<never> {
    throw new Error('Lichess puzzle sync is reserved for a later release.');
  }

  async submitCloudAnalysis(): Promise<never> {
    throw new Error('Lichess cloud analysis submission is reserved for a later release.');
  }
}
