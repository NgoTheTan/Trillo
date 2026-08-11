import React, { useState } from 'react'
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  List,
  CreditCard,
  Loader2,
  Calendar,
  Layers,
  X
} from 'lucide-react'
import {
  useArchivedListsQuery,
  useArchiveBoardListMutation,
  useDeleteBoardListMutation
} from '../../services/listService'
import {
  useArchivedCardsQuery,
  useArchiveCardMutation,
  deleteCard
} from '../../services/cardService'
import { useQueryClient } from '@tanstack/react-query'
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal'

interface ArchivedItemsModalProps {
  boardId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canRestore?: boolean
  isOwner?: boolean
}

export const ArchivedItemsModal: React.FC<ArchivedItemsModalProps> = ({
  boardId,
  open,
  onOpenChange,
  canRestore = true,
  isOwner = false
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'lists'>('lists')
  const [searchQuery, setSearchQuery] = useState('')
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'card' | 'list'; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const queryClient = useQueryClient()

  const archivedListsQuery = useArchivedListsQuery(open ? boardId : undefined)
  const archivedCardsQuery = useArchivedCardsQuery(open ? boardId : undefined)

  const archiveListMutation = useArchiveBoardListMutation()
  const archiveCardMutation = useArchiveCardMutation()
  const deleteListMutation = useDeleteBoardListMutation()

  const archivedLists = archivedListsQuery.data || []
  const archivedCards = archivedCardsQuery.data || []

  const filteredLists = archivedLists.filter(l =>
    l.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  const filteredCards = archivedCards.filter(c =>
    c.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  const handleRestoreList = async (listId: string) => {
    if (!boardId) return
    try {
      await archiveListMutation.mutateAsync({ boardId, listId, archived: false })
    } catch (err) {
      console.error('Failed to restore list:', err)
    }
  }

  const handleRestoreCard = async (cardId: string) => {
    if (!boardId) return
    try {
      await archiveCardMutation.mutateAsync({ cardId, archived: false, boardId })
    } catch (err) {
      console.error('Failed to restore card:', err)
    }
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !boardId) return
    try {
      setIsDeleting(true)
      if (itemToDelete.type === 'list') {
        await deleteListMutation.mutateAsync({ boardId, listId: itemToDelete.id })
      } else {
        await deleteCard(itemToDelete.id)
        queryClient.invalidateQueries({ queryKey: ['archived-cards', boardId] })
        queryClient.invalidateQueries({ queryKey: ['list-cards'] })
        queryClient.invalidateQueries({ queryKey: ['board-lists', boardId] })
      }
      setItemToDelete(null)
    } catch (err) {
      console.error('Failed to delete item permanently:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Floating Pop-up Card on the Right Side (No backdrop overlay, no full-screen blur) */}
      <div className="fixed top-16 right-4 sm:right-6 z-40 w-[90vw] sm:w-96 max-h-[75vh] bg-white border border-slate-200/90 rounded-2xl shadow-2xl flex flex-col animate-in fade-in-0 zoom-in-95 duration-150 select-none overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 pb-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="p-1.5 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-600">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">Mục lưu trữ</h3>
              <p className="text-[11px] text-slate-500">Danh sách & Thẻ đã lưu trữ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="p-3 border-b border-slate-100 bg-white space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center p-1 bg-slate-100 border border-slate-200/70 rounded-xl flex-1">
              <button
                type="button"
                onClick={() => setActiveTab('lists')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'lists'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Danh sách ({archivedLists.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cards')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Thẻ ({archivedCards.length})</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mục lưu trữ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* List/Cards Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeTab === 'lists' && (
            <>
              {archivedListsQuery.isLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs font-medium">Đang tải danh sách...</span>
                </div>
              ) : filteredLists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 gap-2">
                  <Layers className="w-8 h-8 stroke-1 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    {searchQuery ? 'Không tìm thấy danh sách phù hợp' : 'Chưa có danh sách nào trong lưu trữ'}
                  </p>
                </div>
              ) : (
                filteredLists.map(list => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 rounded-xl transition-all group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <List className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{list.title}</h4>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {list.cards?.length || 0} thẻ
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canRestore && (
                        <button
                          type="button"
                          onClick={() => handleRestoreList(list.id)}
                          disabled={archiveListMutation.isPending}
                          className="flex items-center gap-1 px-2 py-1 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                          title="Khôi phục danh sách về bảng"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Khôi phục</span>
                        </button>
                      )}

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ id: list.id, type: 'list', name: list.title })}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'cards' && (
            <>
              {archivedCardsQuery.isLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs font-medium">Đang tải thẻ lưu trữ...</span>
                </div>
              ) : filteredCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 gap-2">
                  <CreditCard className="w-8 h-8 stroke-1 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    {searchQuery ? 'Không tìm thấy thẻ phù hợp' : 'Chưa có thẻ nào trong lưu trữ'}
                  </p>
                </div>
              ) : (
                filteredCards.map(card => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 rounded-xl transition-all group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{card.title}</h4>
                        {card.deadline && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(card.deadline).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canRestore && (
                        <button
                          type="button"
                          onClick={() => handleRestoreCard(card.id)}
                          disabled={archiveCardMutation.isPending}
                          className="flex items-center gap-1 px-2 py-1 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                          title="Khôi phục thẻ về danh sách"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Khôi phục</span>
                        </button>
                      )}

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ id: card.id, type: 'card', name: card.title })}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm Delete Permanently Modal */}
      {itemToDelete && (
        <ConfirmDeleteModal
          open={!!itemToDelete}
          onOpenChange={() => setItemToDelete(null)}
          title={`Xóa vĩnh viễn ${itemToDelete.type === 'list' ? 'danh sách' : 'thẻ'}`}
          itemName={itemToDelete.name}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  )
}
