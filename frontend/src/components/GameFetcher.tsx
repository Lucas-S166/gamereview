import React, { useState } from 'react';
import './GameFetcher.css';

interface GameFetcherProps {
  username: string
  setUsername: (u: string) => void
  games: any[]
  setGames: (g: any[]) => void
  loading: boolean
  setLoading: (b: boolean) => void
  error: string | null
  setError: (e: string | null) => void
  onGameSelect: (game: any) => void
}

const GameFetcher: React.FC<GameFetcherProps> = ({
  username, setUsername,
  games, setGames,
  loading, setLoading,
  error, setError,
  onGameSelect }) => {

  const handleSearch = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:29873/fetch-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      setGames(data.games || []);
    } catch (err) {
      console.error('Error fetching games:', err);
      setError('Failed to fetch games.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="gamefetcher-container">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Enter a Chess.com username..."
          className="search-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <i
          className="fas fa-search search-icon"
          onClick={handleSearch}
          style={{ cursor: 'pointer' }}
        />
      </div>

      {loading && (
        <div className="fetcher-spinner-container">
          <div className="fetcher-spinner" />
          <p>Loading games...</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && games.length > 0 && (
        <div className="game-list">
          {[...games].reverse().map((game, index) => (
            <div
              key={index}
              className="game-card"
              onClick={() => onGameSelect(game)}
            >
              <div className="players">
              {game.white.result === 'win' ? (
                  <>
                    <strong>{game.white.username} ({game.white.rating})</strong> vs {game.black.username} ({game.black.rating})
                  </>
                ) : game.black.result === 'win' ? (
                  <>
                    {game.white.username} ({game.white.rating}) vs <strong>{game.black.username} ({game.black.rating})</strong>
                  </>
                ) : (
                  <>
                    {game.white.username} ({game.white.rating}) vs {game.black.username} ({game.black.rating})
                  </>
                )}
              </div>
              <div className="details">
                <span>{game.time_class.charAt(0).toUpperCase() + game.time_class.slice(1)}</span>
                <span> • {formatDate(game.end_time)}</span>
                <span> • {game.rated ? 'Rated' : 'Casual'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameFetcher;