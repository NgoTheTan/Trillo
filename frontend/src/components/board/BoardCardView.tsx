import React from 'react'
import { Plus, Dot } from 'lucide-react'
import type { BoardSummaryResponse } from '../../services/boardServices'
import { BoardActionMenu } from './BoardActionMenu'
import { useNavigate } from 'react-router-dom'

interface BoardCardViewProps {
  boards: BoardSummaryResponse[]
  onToggleStar?: (id: string) => void
  onCreateClick?: () => void
  onEditBoard?: (board: BoardSummaryResponse) => void
  onDeleteBoard?: (boardId: string) => void
}

export const BoardCardView: React.FC<BoardCardViewProps> = ({
  boards,
  onCreateClick,
  onEditBoard,
  onDeleteBoard
}) => {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
      {boards.map(board => {
        const isHex = board.coverColor?.startsWith('#')
        const style = isHex ? { backgroundColor: board.coverColor } : undefined
        const bgClass = !isHex && board.coverColor
          ? board.coverColor
          : (isHex ? '' : 'bg-gradient-to-br from-blue-500 to-indigo-600')

        return (
          <div
            key={board.id}
            style={style}
            onClick={() => board.id && navigate(`/app/boards/${board.id}`)}
            className={`relative ${bgClass} rounded-2xl p-6 text-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 flex flex-col justify-between h-48 cursor-pointer group`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold tracking-wide drop-shadow-xs truncate">{board.title}</h3>
                {board.description && (
                  <p className="text-xs text-white/80 line-clamp-1 mt-1 font-normal">{board.description}</p>
                )}
                <span className="inline-flex items-center gap-0.5 mt-2 px-2.5 py-0.5 text-xs font-medium bg-white/20 backdrop-blur-md rounded-full text-white/90">
                  <Dot className="w-5 h-5 -ml-1.5 text-white" />
                  {board.visibility || 'PUBLIC'}
                </span>
              </div>

              <div onClick={e => e.stopPropagation()}>
                <BoardActionMenu
                  board={board}
                  onEdit={onEditBoard}
                  onDeleted={onDeleteBoard}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-white/90">
              <span>{board.memberCount ?? 1} Members</span>
              <span>{board.cardCount ?? 0} Cards</span>
            </div>
          </div>
        )
      })}

      <button
        onClick={onCreateClick}
        className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl h-48 flex items-center justify-center gap-2 text-slate-600 hover:text-blue-600 font-semibold transition-all cursor-pointer shadow-2xs group"
      >
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Create new board</span>
        </div>
      </button>
    </div>
  )
}
