import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './ChessboardWrapper.css';

interface Move {
  move_number: number;
  player: string;
  move: string;
  fen_before: string;
  fen_after: string;
  evaluation_before: number;
  evaluation_after: number;
  centipawn_loss: number;
  classification: string;
  mate_in: number | null;
  best_move: string;
  best_evaluation: number;
  move_flags: {
    is_capture: boolean;
    is_check: boolean;
    is_castling: boolean;
    is_promotion: boolean;
  };
}

interface Props {
  username: string;
  game: any | null;
  orientation: 'white' | 'black';
  analysis: { MoveAnalyses: Move[] } | null;
  currentMove: Move | null;
  setCurrentMove: (move: Move | null) => void;
}

const ChessboardWrapper: React.FC<Props> = ({
  username,
  game,
  orientation,
  analysis,
  currentMove,
  setCurrentMove
}) => {
  const [animationDuration, setAnimationDuration] = useState(300);

  // Synchronize if external analysis array changes
  useEffect(() => {
    if (analysis?.MoveAnalyses && currentMove) {
      const idx = analysis.MoveAnalyses.findIndex(
        (m) => m.fen_after === currentMove.fen_after
      );
      if (idx !== -1) {
        setCurrentMove(analysis.MoveAnalyses[idx]);
      }
    }
  }, [analysis, currentMove, setCurrentMove]);

  // Keyboard navigation (startpos is `null`)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!analysis?.MoveAnalyses) return;
      const moves = analysis.MoveAnalyses;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          setAnimationDuration(300);
          if (currentMove) {
            const idx = moves.findIndex(
              (m) => m.fen_after === currentMove.fen_after
            );
            if (idx === 0) {
              setCurrentMove(null);
            } else if (idx > 0) {
              setCurrentMove(moves[idx - 1]);
            }
          }
          break;

        case 'ArrowRight':
          event.preventDefault();
          setAnimationDuration(300);
          if (!currentMove) {
            setCurrentMove(moves[0]);
          } else {
            const idx = moves.findIndex(
              (m) => m.fen_after === currentMove.fen_after
            );
            if (idx < moves.length - 1) {
              setCurrentMove(moves[idx + 1]);
            }
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          setAnimationDuration(0);
          setCurrentMove(moves[moves.length - 1]);
          break;

        case 'ArrowUp':
          event.preventDefault();
          setAnimationDuration(0);
          setCurrentMove(null);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [analysis, currentMove, setCurrentMove]);

  return (
    <div className="chessboard-wrapper">
      <div className="player-name top-player">
        {game
          ? game.white.username.toLowerCase() === username.toLowerCase()
            ? `${game.black.username} (${game.black.rating})`
            : `${game.white.username} (${game.white.rating})`
          : 'Opponent'}
      </div>

      <Chessboard
        customBoardStyle={{ overflow: 'hidden' }}
        boardOrientation={orientation}
        position={currentMove ? currentMove.fen_after : 'start'}
        animationDuration={animationDuration}
        onPieceDrop={(sourceSquare, targetSquare) => {
          const chess = new Chess(currentMove?.fen_before || 'start');
          const move = chess.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q'
          });

          if (!move) return false;

          const resultingFen = chess.fen();
          const updatedMove = {
            ...currentMove,
            fen_before: currentMove?.fen_after,
            fen_after: resultingFen
          } as Move;
          setCurrentMove(updatedMove);
          return true;
        }}
      />

      <div className="player-name bottom-player">
        {game
          ? game.black.username.toLowerCase() === username.toLowerCase()
            ? `${game.black.username} (${game.black.rating})`
            : `${game.white.username} (${game.white.rating})`
          : 'Searched User'}
      </div>
    </div>
  );
};

export default ChessboardWrapper;
