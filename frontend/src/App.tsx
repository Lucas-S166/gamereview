import { useMemo, useState } from 'react'
import './App.css'
import EvalBar from './components/EvalBar'
import ChessboardWrapper from './components/ChessboardWrapper'
import GameFetcher from './components/GameFetcher'
import GameAnalysis from './components/GameAnalysis'

function App() {
  const [selectedGame, setSelectedGame] = useState<any>(null)
  const [username, setUsername] = useState('');
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null)

  const [currentMove, setCurrentMove] = useState<any>(null);

  const orientation = useMemo(() => {
    if (!selectedGame || !username) return 'white';
    return selectedGame.black.username.toLowerCase() === username.toLowerCase()
      ? 'black'
      : 'white';
  }, [selectedGame, username]);

  return (
    <div className="app-container">
      <EvalBar orientation={orientation} currentMove={currentMove}/>
      <ChessboardWrapper 
        username={username} 
        game={selectedGame} 
        orientation={orientation} 
        analysis={analysis} 
        currentMove={currentMove} 
        setCurrentMove={setCurrentMove} 
      />
      <div className="analysis-wrapper">
        {selectedGame ? (
          <GameAnalysis 
            game={selectedGame} 
            onBack={() => {
              setSelectedGame(null);
              setCurrentMove(null);
              setAnalysis(null);}
            }
            analysis={analysis}
            setAnalysis={setAnalysis}
            currentMove={currentMove} 
            setCurrentMove={setCurrentMove}
          />
        ) : (
          <GameFetcher
            username={username}
            setUsername={setUsername}
            games={games}
            setGames={setGames}
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            onGameSelect={setSelectedGame}
          />
        )}
      </div>
    </div>
  )
}

export default App;