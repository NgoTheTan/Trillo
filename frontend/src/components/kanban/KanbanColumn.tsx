import React, { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { BoardList, BoardCard } from '../../services/boardServices'
import { KanbanCard } from './KanbanCard'
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal'
import { useCreateCardMutation, useListCardsQuery } from '../../services/listCardServices'

interface KanbanColumnProps {
  list: BoardList
  handleDeleteColumn: (boardId: string, listId: string) => void
  handleUpdateTitleColumn: (boardId: string, listId: string, title: string) => void
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  list,
  handleUpdateTitleColumn,
  handleDeleteColumn,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(list.title);
  const [cardTitle, setCardTitle] = useState('');
  const [openDelete, setOpenDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const { data: fetchedCards = [] } = useListCardsQuery(list.id);

  const createCardMutation = useCreateCardMutation()

  const handleAddCardClick = async (listId: string, title: string) => {
    try {
      setIsAddingCard(true);
      await createCardMutation.mutateAsync({ listId, payload: { title } })
      setCardTitle('')
    } catch (err) {
      console.warn('API error creating card:', err)
    } finally {
      setIsAddingCard(false);
    }
  }

  const commitRename = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(list.title);
      setEditingName(false);
      return;
    }

    await handleUpdateTitleColumn(list.boardId, list.id, trimmed);
    setEditingName(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await handleDeleteColumn(list.boardId, list.id);
      setOpenDelete(false);
    } catch (err) {
      console.error('Failed to delete column:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-[#f4f5f9] w-70 group rounded-2xl p-4 border border-slate-200/60 flex flex-col gap-3 h-fit">
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 py-1">
        {editingName ? (
          <input
            autoFocus
            className="flex-1 text-xs font-bold text-slate-800 uppercase tracking-wider bg-white border border-blue-500/50 rounded-lg px-2.5 py-1 shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all mr-2"
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setDraftName(list.title); setEditingName(false); }
            }}
          />
        ) : (
          <span
            title="Click to rename column"
            onClick={() => { setDraftName(list.title); setEditingName(true); }}
            className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors rounded-md px-1.5 py-0.5 hover:bg-slate-200/60"
          >
            {list.title}
          </span>
        )}
        <div className='flex items-center gap-1'>
          <span className="w-6 h-6 flex items-center justify-center font-bold text-xs text-slate-600 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
            {fetchedCards.length}
          </span>
          <div className='invisible group-hover:visible'>
            <button
              onClick={() => setOpenDelete(true)}
              className='bg-transparent hover:bg-red-100 cursor-pointer p-1 rounded-lg text-slate-400 hover:text-red-600 transition-colors'
              title="Delete column"
            >
              <Trash2 className='h-4 w-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Column Cards */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
        {fetchedCards.map(card => (
          <KanbanCard
            key={card.id}
            card={card}
          />
        ))}
        {fetchedCards.length === 0 && (
          <div className={`h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-slate-300 font-medium transition-colors duration-200 border-slate-200`}>
            Empty
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-200/50">
          <input
            type="text"
            placeholder="New card title..."
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-blue-500 transition-all mb-2 shadow-xs"
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCardClick(list.id, cardTitle);
              if (e.key === 'Escape') setCardTitle('');
            }}
          />
          <button
            onClick={() => handleAddCardClick(list.id, cardTitle)}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500/30 text-slate-400 hover:text-blue-500 text-[11px] font-bold transition-all duration-200 cursor-pointer shadow-xs"
          >
            {isAddingCard ? <Loader2 className='h-4 w-4 animate-spin' /> : <Plus size={12} />}
            Add Card
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={openDelete}
        onOpenChange={setOpenDelete}
        title="Delete Column"
        itemName={list.title}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
