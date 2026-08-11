import React, { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { BoardList } from '../../services/boardServices'
import { KanbanCard } from './KanbanCard'
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal'
import { useCreateCardMutation, useListCardsQuery, type ListCardResponse } from '../../services/cardService.ts'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface KanbanColumnProps {
  list: BoardList
  handleDeleteColumn?: (boardId: string, listId: string) => void
  handleUpdateTitleColumn?: (boardId: string, listId: string, title: string) => void
  isOverlay?: boolean
  filteredCardIds?: Set<string> | null
  canCreateCard?: boolean
  canEditCard?: boolean
  canDeleteCard?: boolean
  canMoveCard?: boolean
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  list,
  handleUpdateTitleColumn,
  handleDeleteColumn,
  isOverlay = false,
  filteredCardIds = null,
  canCreateCard = true,
  canEditCard = true,
  canMoveCard = true,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(list.title);
  const [cardTitle, setCardTitle] = useState('');
  const [openDelete, setOpenDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  // Fetch full card details from DB
  const { data: fetchedCards = [] } = useListCardsQuery(list.id);

  const cardsMap = React.useMemo(() => {
    const map = new Map<string, any>();
    fetchedCards.forEach(c => map.set(c.id, c));
    return map;
  }, [fetchedCards]);

  const cardsToRender = React.useMemo(() => {
    let baseCards = fetchedCards;
    if (list.cards && list.cards.length > 0) {
      const orderedCards = list.cards
        .map((c: any) => {
          if (typeof c === 'string') {
            return cardsMap.get(c);
          }
          return c;
        })
        .filter((c): c is ListCardResponse => Boolean(c) && c.listId === list.id);

      const orderedIds = new Set(orderedCards.map(c => c.id));
      const remainingCards = fetchedCards.filter(c => !orderedIds.has(c.id));

      baseCards = [...orderedCards, ...remainingCards];
    }

    if (filteredCardIds) {
      return baseCards.filter(c => filteredCardIds.has(c.id));
    }

    return baseCards;
  }, [list.cards, fetchedCards, cardsMap, list.id, filteredCardIds]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { ...list },
    disabled: isOverlay || !canMoveCard,
  });

  const dndKitColumnStyle: React.CSSProperties = {
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
    transition: isOverlay ? undefined : transition,
    opacity: isDragging ? 0.3 : 1,
    height: '100%'
  };

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

    if (handleUpdateTitleColumn) {
      await handleUpdateTitleColumn(list.boardId, list.id, trimmed);
    }
    setEditingName(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      if (handleDeleteColumn) {
        await handleDeleteColumn(list.boardId, list.id);
      }
      setOpenDelete(false);
    } catch (err) {
      console.error('Failed to delete column:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={{ ...dndKitColumnStyle, scrollSnapAlign: 'start' }}
      {...(isOverlay ? {} : attributes)}
      className="h-full shrink-0"
    >
      <div
        {...(isOverlay ? {} : (canMoveCard ? listeners : {}))}
        className={`flex flex-col gap-3 w-[280px] sm:w-72 bg-[#f4f5f9] group/column rounded-xl p-4 border border-slate-200/60 transition-all ${isOverlay ? 'shadow-2xl ring-2 ring-blue-500/40 rotate-1 scale-[1.02] cursor-grabbing' : 'hover:shadow-md'
          }`}
      >
        {/* Column Header - Drag Handle */}
        <div
          className={`flex items-center justify-between px-1 py-1 select-none ${
            isOverlay
              ? 'cursor-grabbing'
              : canMoveCard
              ? 'cursor-grab active:cursor-grabbing'
              : 'cursor-default'
          }`}
        >
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
              title={handleUpdateTitleColumn ? "Nhấp để đổi tên cột" : undefined}
              onClick={() => {
                if (handleUpdateTitleColumn) { setDraftName(list.title); setEditingName(true); }
              }}
              className={`text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider rounded-md px-1.5 py-0.5 transition-colors ${
                handleUpdateTitleColumn
                  ? 'cursor-pointer hover:text-blue-600 hover:bg-slate-200/60'
                  : 'cursor-default'
              }`}
            >
              {list.title}
            </span>
          )}
          <div className='flex items-center gap-1'>
            <span className="w-6 h-6 flex items-center justify-center font-bold text-xs text-slate-600 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
              {cardsToRender.length}
            </span>
            {/* Delete column button — only if handler is provided (i.e. user has DELETE_LIST permission) */}
            {handleDeleteColumn && (
              <div className='invisible group-hover/column:visible'>
                <button
                  onClick={() => setOpenDelete(true)}
                  className='bg-transparent hover:bg-red-100 cursor-pointer p-1 rounded-lg text-slate-400 hover:text-red-600 transition-colors'
                  title="Xóa cột"
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
            )}
          </div>
        </div>


        {filteredCardIds !== null && (
          <div className="mb-2 px-2.5 py-1.5 bg-blue-50/80 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs font-semibold text-blue-700 shadow-2xs">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Kết quả đã lọc
            </span>
            <span className="text-[11px] font-bold bg-blue-100/90 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200/50">
              {cardsToRender.length} / {fetchedCards.length || (list.cards?.length || 0)} thẻ
            </span>
          </div>
        )}

        {/* Column Cards */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
          <div
            className='flex flex-col gap-2'
          >
            <SortableContext
              items={cardsToRender.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {cardsToRender.map(card => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  canEditCard={canEditCard}
                  canMoveCard={canMoveCard}
                />
              ))}
              {cardsToRender.length === 0 && (
                <div className={`h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-slate-300 font-medium transition-colors duration-200 border-slate-200`}>
                  Trống
                </div>
              )}
            </SortableContext>
          </div>

          {/* Add Card Section — only if user has CREATE_CARD permission */}
          {canCreateCard && (
            <div className="mt-4 pt-3 border-t border-slate-200/50">
              <input
                type="text"
                placeholder="Tên thẻ mới..."
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
                Thêm thẻ
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          open={openDelete}
          onOpenChange={setOpenDelete}
          title="Xóa cột"
          itemName={list.title}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  )
}
