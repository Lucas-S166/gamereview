import './EvalBar.css';

interface EvalBarProps {
  orientation: 'white' | 'black';
  currentMove: Move | null;
}
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
const EvalBar: React.FC<EvalBarProps> = ({ orientation, currentMove }) => {
  const moveEval = (currentMove?.evaluation_after ?? 0);
  const isBottom = currentMove === null
  || (orientation === 'black' && moveEval < 0)
  || (orientation === 'white' && moveEval > 0);
  const textColor = isBottom
    ? (orientation === 'black' ? 'white' : 'black')
    : (orientation === 'black' ? 'black' : 'white'); 

  return (
    <div className="eval-bar-single">
      <div
        className="eval-fill-wrapper"
        style={{ transform: orientation === 'black' ? 'rotate(180deg)' : 'none' }}
      >
        <div
          className="eval-fill"
          style={{ height: `${((moveEval + 400) / 8)}%` }}
        />
      </div>
      <div
        className="eval-score"
        style={{
          color: textColor,
          bottom:  isBottom ? '4px' : undefined,
          top:     isBottom ? undefined : '4px',
        }}
      >
        {currentMove
          ? (currentMove.mate_in !== null
              ? `M${Math.abs(currentMove.mate_in)}`
              : (moveEval / 100).toFixed(1))
          : '0.0'}
      </div>
    </div>
  );
};

export default EvalBar;