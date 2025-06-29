import { useEffect, useState } from 'react'
import './GameAnalysis.css'
import { MdArrowBack, MdArrowForward, MdPlayArrow, MdFirstPage, MdLastPage, MdStar, MdRefresh } from 'react-icons/md'
import {
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  TooltipProps,
} from 'recharts';

interface Move {
  move_number: number
  player: string
  move: string
  fen_after: string
  evaluation_after: number
}

interface Props {
  game: any;
  onBack: () => void;
  analysis: { MoveAnalyses: Move[] } | null;
  setAnalysis: React.Dispatch<React.SetStateAction<any>>;
  currentMove: Move | null;
  setCurrentMove: (move: Move | null) => void;
}

const GameAnalysis: React.FC<Props> = ({
  game,
  onBack,
  analysis,
  setAnalysis,
  currentMove,
  setCurrentMove,
}) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('http://localhost:29873/analyze-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game),
    })
      .then(r => r.json())
      .then(data => {
        setAnalysis(data)
      })
      .finally(() => setLoading(false))
  }, [game, setAnalysis])

  // Helper to safely set current move
  const safeSetCurrentMove = (move: Move | undefined) => {
    setCurrentMove(move ?? null);
  }

  const handlePrevious = () => {
    if (!analysis?.MoveAnalyses || !currentMove) return;
    const idx = analysis.MoveAnalyses.findIndex(
      (m: Move) => m.fen_after === currentMove.fen_after
    )
    if (idx === 0) {
      setCurrentMove(null)
    } else if (idx > 0) {
      safeSetCurrentMove(analysis.MoveAnalyses[idx - 1]);
    }
  }

  const handleNext = () => {
    if (!analysis?.MoveAnalyses) return;
    if (!currentMove) {
      setCurrentMove(analysis.MoveAnalyses[0])
    } else {
      const idx = analysis.MoveAnalyses.findIndex(
        (m: Move) => m.fen_after === currentMove.fen_after
      )
      if (idx < analysis.MoveAnalyses.length - 1) {
        safeSetCurrentMove(analysis.MoveAnalyses[idx + 1]);
      }
    }
  }

  const handleBeginning = () => {
    setCurrentMove(null)
  }

  const handleEnd = () => {
    if (analysis?.MoveAnalyses) {
      safeSetCurrentMove(analysis.MoveAnalyses[analysis.MoveAnalyses.length - 1]);
    }
  }

  const pairedMoves = () => {
    if (!analysis?.MoveAnalyses) return [];

    const pairs: { number: number; white?: Move; black?: Move }[] = [];

    for (let i = 0; i < analysis.MoveAnalyses.length; i++) {
      const move = analysis.MoveAnalyses[i]
      const last = pairs[pairs.length - 1]

      if (move.player === 'White') {
        pairs.push({ number: move.move_number, white: move })
      } else if (move.player === 'Black') {
        if (last && last.number === move.move_number) {
          last.black = move
        } else {
          pairs.push({ number: move.move_number, black: move })
        }
      }
    }

    return pairs
  }

  // Prepare data for the evaluation plot
  const plotData = analysis?.MoveAnalyses.map((m, idx) => ({
    moveIndex: idx + 1,
    evaluation: m.evaluation_after / 100,
  }));

  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
    if (active && payload && payload.length && payload[0]?.value !== undefined) {
      return (
        <div style={{ background: '#fff', padding: '5px 10px', border: '1px solid #ccc' }}>
          {payload[0].value.toFixed(2)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analysis-view">
      <div className="analysis-header">
        <button title="Back" onClick={onBack} className="back-button">
          <MdArrowBack size={30} />
        </button>
        <h2 className="analysis-title">Game Review</h2>
      </div>

      {loading ? (
        <div className="analysis-spinner-container">
          <div className="analysis-spinner" />
          <p>Analyzing…</p>
        </div>
      ) : (
        <div className="analysis-container">
          <div className="plot-container">
            {plotData && (
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={plotData}>
                  <XAxis dataKey="moveIndex" hide />
                  <YAxis type="number" domain={[-7, 7]} allowDataOverflow={true} hide />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="gray" />
                  <Area
                    type="monotone"
                    dataKey="evaluation"
                    stroke="#ffffff"
                    fill="#ffffff"
                    fillOpacity={1}
                    dot={false}
                    baseValue="dataMin"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="accuracy-container"> Accuracy</div>

          <div className="move-list">
            {pairedMoves().map(pair => (
              <div className="move-row" key={pair.number}>
                <div className="move-cell move-number">{pair.number}.</div>

                {pair.white && (
                  <div
                    className={`move-cell white-move${currentMove === pair.white ? ' selected' : ''}`}
                    onClick={() => safeSetCurrentMove(pair.white)}
                    style={{ cursor: 'pointer' }}
                  >
                    {pair.white.move}
                  </div>
                )}

                {pair.black && (
                  <div
                    className={`move-cell black-move${currentMove === pair.black ? ' selected' : ''}`}
                    onClick={() => safeSetCurrentMove(pair.black)}
                    style={{ cursor: 'pointer' }}
                  >
                    {pair.black.move}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="action-buttons">
            <button title="Best">
              <MdStar size={30} /> Best
            </button>
            <button title="Retry">
              <MdRefresh size={30} /> Retry
            </button>
          </div>

          <div className="navigation-buttons">
            <button title="Beginning">
              <MdFirstPage size={30} onClick={handleBeginning} />
            </button>
            <button title="Previous" onClick={handlePrevious}>
              <MdArrowBack size={30} />
            </button>
            <button title="Previous" onClick={handlePrevious}>
              <MdPlayArrow size={30} />
            </button>
            <button title="Next" onClick={handleNext}>
              <MdArrowForward size={30} />
            </button>
            <button title="End" onClick={handleEnd}>
              <MdLastPage size={30} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameAnalysis;