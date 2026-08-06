import React from 'react'
import { Plus, Dot } from 'lucide-react'
import type { BoardSummaryResponse } from '../../services/boardServices'
import { BoardActionMenu } from './BoardActionMenu'
import { useNavigate } from 'react-router-dom'

interface BoardListViewProps {
  boards: BoardSummaryResponse[]
  onToggleStar?: (id: string) => void
  onCreateClick?: () => void
  onEditBoard?: (board: BoardSummaryResponse) => void
  onDeleteBoard?: (boardId: string) => void
}

export const BoardListView: React.FC<BoardListViewProps> = ({
  boards,
  onCreateClick,
  onEditBoard,
  onDeleteBoard
}) => {
  const navigate = useNavigate()

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden pt-2">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50">
              <th className="py-3 px-6">Board Name</th>
              <th className="py-3 px-6">Visibility</th>
              <th className="py-3 px-6">Members</th>
              <th className="py-3 px-6">Cards</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {boards.map(board => {
              const isHex = board.coverColor?.startsWith('#')
              const colorStyle = isHex ? { backgroundColor: board.coverColor } : undefined
              const colorClass = !isHex && board.coverColor ? board.coverColor : (isHex ? '' : 'bg-blue-500')

              return (
                <tr
                  key={board.id}
                  onClick={() => board.id && navigate(`/app/boards/${board.id}`)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-6 font-semibold text-slate-800">
                    <div className="flex items-center gap-3">
                      <div
                        style={colorStyle}
                        className={`w-3.5 h-3.5 rounded-full shrink-0 ${colorClass}`}
                      />
                      <div>
                        <span>{board.title}</span>
                        {board.description && (
                          <p className="text-xs text-slate-400 font-normal line-clamp-1">{board.description}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                      <Dot className="w-4 h-4 text-slate-400 -ml-1" />
                      {board.visibility || 'PUBLIC'}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                    {board.memberCount ?? 1} members
                  </td>

                  <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                    {board.cardCount ?? 0} cards
                  </td>

                  <td className="py-4 px-6 text-right" onClick={e => e.stopPropagation()}>
                    <BoardActionMenu
                      board={board}
                      onEdit={onEditBoard}
                      onDeleted={onDeleteBoard}
                      triggerClassName="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer outline-none"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 p-3 bg-slate-50/50">
        <button
          onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl border border-dashed border-slate-200 hover:border-blue-400 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create new board</span>
        </button>
      </div>
    </div>
  )
}
