import React from 'react'
import { Plus, Globe, Lock, Star } from 'lucide-react'
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
  onToggleStar,
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
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-6">Tên bảng</th>
              <th className="py-3 px-6">Quyền riêng tư</th>
              <th className="py-3 px-6">Thành viên</th>
              <th className="py-3 px-6">Thẻ</th>
              <th className="py-3 px-6 text-right">Thao tác</th>
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
                  {/* Star column */}
                  <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleStar?.(board.id)}
                      title={board.starred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                      className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer
                        ${board.starred
                          ? 'text-amber-400 hover:text-amber-500'
                          : 'text-slate-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                        }`}
                    >
                      <Star
                        className={`w-4 h-4 transition-colors ${board.starred ? 'fill-amber-400' : 'fill-transparent'}`}
                      />
                    </button>
                  </td>

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
                    {board.visibility === 'PRIVATE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full">
                        <Lock className="w-3 h-3 text-amber-600" />
                        Riêng tư
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
                        <Globe className="w-3 h-3 text-emerald-600" />
                        Công khai
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                    {board.memberCount ?? 1} thành viên
                  </td>

                  <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                    {board.cardCount ?? 0} thẻ
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
          <span>Tạo bảng mới</span>
        </button>
      </div>
    </div>
  )
}
