import React, { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  MoreHorizontal,
  Plus,
  Copy,
  ArrowRightLeft,
  ArrowLeft,
  Archive,
  ArrowDownUp,
  Layers,
  ChevronRight,
  Check
} from 'lucide-react'
import type { BoardList } from '../../services/boardServices'
import {
  useArchiveBoardListMutation,
  useCopyBoardListMutation,
  useMoveAllCardsMutation,
  useArchiveAllCardsMutation,
  useSortCardsInListMutation,
  reorderBoardLists
} from '../../services/listService'
import { useQueryClient } from '@tanstack/react-query'

interface ListMenuPopoverProps {
  boardId: string
  list: BoardList
  allLists: BoardList[]
  onAddCardClick?: () => void
  canCreateCard?: boolean
  canCreateList?: boolean
  canMoveCard?: boolean
  canArchiveItem?: boolean
}

type SubView = 'main' | 'moveList' | 'moveAllCards' | 'sortCards'

export const ListMenuPopover: React.FC<ListMenuPopoverProps> = ({
  boardId,
  list,
  allLists,
  onAddCardClick,
  canCreateCard = true,
  canCreateList = true,
  canMoveCard = true,
  canArchiveItem = true
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [subView, setSubView] = useState<SubView>('main')

  const queryClient = useQueryClient()

  const archiveListMutation = useArchiveBoardListMutation()
  const copyListMutation = useCopyBoardListMutation()
  const moveAllCardsMutation = useMoveAllCardsMutation()
  const archiveAllCardsMutation = useArchiveAllCardsMutation()
  const sortCardsMutation = useSortCardsInListMutation()

  const handleCopyList = async () => {
    try {
      await copyListMutation.mutateAsync({ boardId, listId: list.id })
      setPopoverOpen(false)
    } catch (err) {
      console.error('Failed to copy list:', err)
    }
  }

  const handleArchiveList = async () => {
    try {
      await archiveListMutation.mutateAsync({ boardId, listId: list.id, archived: true })
      setPopoverOpen(false)
    } catch (err) {
      console.error('Failed to archive list:', err)
    }
  }

  const handleArchiveAllCards = async () => {
    try {
      await archiveAllCardsMutation.mutateAsync({ boardId, listId: list.id })
      setPopoverOpen(false)
    } catch (err) {
      console.error('Failed to archive all cards:', err)
    }
  }

  const handleMoveAllCardsTo = async (targetListId: string) => {
    try {
      await moveAllCardsMutation.mutateAsync({ boardId, listId: list.id, targetListId })
      setPopoverOpen(false)
      setSubView('main')
    } catch (err) {
      console.error('Failed to move all cards:', err)
    }
  }

  const handleSortCards = async (sortBy: string) => {
    try {
      await sortCardsMutation.mutateAsync({ boardId, listId: list.id, sortBy })
      setPopoverOpen(false)
      setSubView('main')
    } catch (err) {
      console.error('Failed to sort cards:', err)
    }
  }

  const handleMoveListPosition = async (newIndex: number) => {
    const currentLists = [...allLists]
    const oldIndex = currentLists.findIndex(l => l.id === list.id)
    if (oldIndex === -1 || oldIndex === newIndex) return

    const [moved] = currentLists.splice(oldIndex, 1)
    currentLists.splice(newIndex, 0, moved)

    const orderedIds = currentLists.map(l => l.id)
    try {
      await reorderBoardLists(boardId, { orderedIds })
      queryClient.invalidateQueries({ queryKey: ['board-lists', boardId] })
      setPopoverOpen(false)
      setSubView('main')
    } catch (err) {
      console.error('Failed to reorder list position:', err)
    }
  }

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={(open) => {
        setPopoverOpen(open)
        if (!open) setSubView('main')
      }}
    >
      <PopoverTrigger
        className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer outline-none"
        title="Tùy chọn danh sách"
      >
        <MoreHorizontal className="w-4 h-4" />
      </PopoverTrigger>

      <PopoverContent className="w-64 p-2 bg-white rounded-2xl shadow-xl border border-slate-200/80 text-slate-800 z-50">
        {/* Sub-view: Main Menu */}
        {subView === 'main' && (
          <div>
            <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
              <h4 className="text-xs font-bold text-slate-900 truncate">{list.title}</h4>
              <p className="text-[10px] text-slate-400 font-medium">Thao tác & Lưu trữ</p>
            </div>

            {/* Section 1: Thao tác (Actions) */}
            <div className="space-y-0.5">
              {canCreateCard && onAddCardClick && (
                <button
                  onClick={() => {
                    setPopoverOpen(false)
                    onAddCardClick()
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thêm thẻ mới</span>
                </button>
              )}

              {canCreateList && (
                <button
                  onClick={handleCopyList}
                  disabled={copyListMutation.isPending}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy danh sách</span>
                </button>
              )}

              {canMoveCard && (
                <>
                  <button
                    onClick={() => setSubView('moveList')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                      <span>Di chuyển danh sách</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setSubView('moveAllCards')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Di chuyển tất cả thẻ</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setSubView('sortCards')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowDownUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sắp xếp thẻ theo...</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </>
              )}
            </div>

            {/* Section 2: Tuỳ chọn Lưu trữ (Archiving options) */}
            {canArchiveItem && (
              <>
                <div className="my-1.5 border-t border-slate-100" />
                <div className="px-2.5 py-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lưu trữ</span>
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={handleArchiveList}
                    disabled={archiveListMutation.isPending}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5 text-amber-500" />
                    <span>Lưu trữ danh sách này</span>
                  </button>

                  <button
                    onClick={handleArchiveAllCards}
                    disabled={archiveAllCardsMutation.isPending}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5 text-amber-500" />
                    <span>Lưu trữ toàn bộ thẻ trong danh sách</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Sub-view: Move List Position */}
        {subView === 'moveList' && (
          <div>
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100">
              <button
                onClick={() => setSubView('main')}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <h4 className="text-xs font-bold text-slate-900">Vị trí danh sách</h4>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5 py-1">
              {allLists.map((l, index) => {
                const isCurrent = l.id === list.id
                return (
                  <button
                    key={l.id}
                    onClick={() => handleMoveListPosition(index)}
                    disabled={isCurrent}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Vị trí {index + 1} {isCurrent ? '(Hiện tại)' : ''}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Sub-view: Move All Cards */}
        {subView === 'moveAllCards' && (
          <div>
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100">
              <button
                onClick={() => setSubView('main')}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <h4 className="text-xs font-bold text-slate-900">Chọn danh sách đích</h4>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5 py-1">
              {allLists
                .filter(l => l.id !== list.id)
                .map(targetList => (
                  <button
                    key={targetList.id}
                    onClick={() => handleMoveAllCardsTo(targetList.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                  >
                    <span className="truncate">{targetList.title}</span>
                  </button>
                ))}
              {allLists.length <= 1 && (
                <p className="text-xs text-slate-400 py-2 text-center">Không có danh sách khác</p>
              )}
            </div>
          </div>
        )}

        {/* Sub-view: Sort Cards */}
        {subView === 'sortCards' && (
          <div>
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100">
              <button
                onClick={() => setSubView('main')}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <h4 className="text-xs font-bold text-slate-900">Tiêu chí sắp xếp</h4>
            </div>

            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSortCards('name_asc')}
                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
              >
                Theo tên (A - Z)
              </button>
              <button
                onClick={() => handleSortCards('name_desc')}
                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
              >
                Theo tên (Z - A)
              </button>
              <button
                onClick={() => handleSortCards('created_desc')}
                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
              >
                Mới tạo gần đây
              </button>
              <button
                onClick={() => handleSortCards('created_asc')}
                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
              >
                Tạo cũ nhất
              </button>
              <button
                onClick={() => handleSortCards('deadline')}
                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
              >
                Hạn chót (Gần nhất)
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
