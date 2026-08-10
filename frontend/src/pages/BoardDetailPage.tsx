import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
    Globe,
    Loader2,
    UserPlus,
    Star
} from 'lucide-react'
import { useBoardDetailQuery, useUpdateBoardTitleMutation, type BoardList } from '../services/boardServices'
import { KanbanColumn } from '../components/kanban/KanbanColumn'
import { BoardListFormModal } from '../components/boardList/BoardListFormModal'
import {
    useBoardListsQuery,
    useCreateBoardListMutation,
    useUpdateBoardListMutation,
    useDeleteBoardListMutation,
    reorderBoardLists
} from "../services/listService"
import { useQueryClient } from '@tanstack/react-query';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    pointerWithin,
    closestCenter,
    type CollisionDetection,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { moveCard, reorderCards, useFilterCardsQuery, type FilterCardsPayload, type ListCardResponse } from '../services/cardService.ts'
import { KanbanCard } from '../components/kanban/KanbanCard'
import { InviteMemberModal } from '../components/board/InviteMemberModal'
import { CardFilterPopover } from '../components/kanban/CardFilterPopover.tsx'
import { useWebSocketBoard, useBoardPresence } from '../services/websocketService'
import { getAvatarUrl, getInitials } from '../auth/authStorage'
import { useAuth } from '../auth/authContext'

class SmartPointerSensor extends PointerSensor {
    static activators = [
        {
            eventName: 'onPointerDown' as const,
            handler: ({ nativeEvent: event }: React.PointerEvent) => {
                if (
                    document.querySelector('[data-slot="dialog-content"]') ||
                    document.querySelector('[data-slot="dialog-portal"]') ||
                    (event.target as HTMLElement).closest('[data-slot="dialog-content"]')
                ) {
                    return false;
                }
                return true;
            },
        },
    ];
}

const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
        return pointerCollisions;
    }
    return closestCenter(args);
};

const ACTIVE_DRAG_ITEM_TYPE = {
    LIST: 'ACTIVE_DRAG_ITEM_TYPE_LIST',
    CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD'
}

export const BoardDetailPage: React.FC = () => {
    const { boardId } = useParams<{ boardId: string }>()
    const { user: currentUser } = useAuth()
    useWebSocketBoard(boardId)
    const onlineViewers = useBoardPresence(boardId)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [orderedLists, setOrderedLists] = useState<BoardList[]>([]);
    const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false)
    const [editTitle, setEditTitle] = useState<string>('')
    const updateBoardTitleMutation = useUpdateBoardTitleMutation()

    const [cardFilterFeatures, setCardFilterFeatures] = useState<FilterCardsPayload>({
        search: '',
        listIds: [],
        memberIds: [],
        status: null,
        labelIds: [],
        noDeadline: false,
        deadlineFrom: null,
        deadlineTo: null,
    })

    // Track pending cross-list move to execute API only on drag end
    const pendingCrossListMove = React.useRef<{
        cardId: string;
        sourceListId: string;
        destListId: string;
        destPosition: number;
    } | null>(null);

    const filterCardsQuery = useFilterCardsQuery(boardId, cardFilterFeatures)

    const boardQuery = useBoardDetailQuery(boardId)
    const listsQuery = useBoardListsQuery(boardId)

    const createBoardListMutation = useCreateBoardListMutation()
    const updateBoardListMutation = useUpdateBoardListMutation()
    const deleteBoardListMutation = useDeleteBoardListMutation()

    const board = boardQuery.data

    // Derived permission flags
    const isOwner = board?.currentUserRole === 'OWNER'
    const canCreateList = isOwner || (board?.currentUserPermissions?.includes('CREATE_LIST') ?? false)
    const canEditList = isOwner || (board?.currentUserPermissions?.includes('EDIT_LIST') ?? false)
    const canDeleteList = isOwner || (board?.currentUserPermissions?.includes('DELETE_LIST') ?? false)
    const canCreateCard = isOwner || (board?.currentUserPermissions?.includes('CREATE_CARD') ?? false)
    const canEditCard = isOwner || (board?.currentUserPermissions?.includes('EDIT_CARD') ?? false)
    const canDeleteCard = isOwner || (board?.currentUserPermissions?.includes('DELETE_CARD') ?? false)
    const canMoveCard = isOwner || (board?.currentUserPermissions?.includes('MOVE_CARD') ?? false)

    const handleSaveTitle = async () => {
        setIsEditingTitle(false)
        const trimmed = editTitle.trim()
        
        // Nếu tiêu đề bị xóa sạch hoặc giống hệt tiêu đề ban đầu, reset về ban đầu và không gọi API
        if (!trimmed || trimmed === board?.title) {
            return
        }

        try {
            await updateBoardTitleMutation.mutateAsync({
                id: boardId!,
                title: trimmed,
            })
        } catch (err) {
            console.error("Lỗi cập nhật tiêu đề bảng:", err)
        }
    }

    useEffect(() => {
        if (listsQuery.data) {
            setOrderedLists(listsQuery.data);
        }
    }, [listsQuery.data]);

    const sensors = useSensors(
        useSensor(SmartPointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const findListByCardId = (cardOrListId: string) => {
        const directList = orderedLists.find(list => list.id === cardOrListId);
        if (directList) return directList;

        return orderedLists.find(list =>
            list.cards?.some((card: any) =>
                typeof card === 'string' ? card === cardOrListId : card?.id === cardOrListId
            )
        );
    }

    const [activeDraggingItemType, setActiveDraggingItemType] = useState<string | null>(null);
    const [activeDraggingId, setActiveDraggingId] = useState<string | null>(null);
    const [activeDraggingData, setActiveDraggingData] = useState<BoardList | ListCardResponse | null>(null)

    const handleDragStart = (event: DragStartEvent) => {
        if (document.querySelector('[data-slot="dialog-content"]')) {
            return;
        }
        const { active } = event;
        const { data: { current } } = active;
        if (current?.boardId) {
            setActiveDraggingId(active.id as string)
            setActiveDraggingItemType(ACTIVE_DRAG_ITEM_TYPE.LIST);
            setActiveDraggingData(current as BoardList);
            return;
        }
        if (current?.listId || findListByCardId(active.id as string)) {
            setActiveDraggingId(active.id as string)
            setActiveDraggingItemType(ACTIVE_DRAG_ITEM_TYPE.CARD);
            setActiveDraggingData(current as ListCardResponse);
            return;
        }
    };

    const queryClient = useQueryClient();

    const moveCardBetweenDifferentLists = (
        _bId: string,
        sourceListId: string,
        destinationListId: string,
        newIndex: number,
        cardId: string
    ) => {
        // Optimistic UI update — NO API call here (API is called in handleDragEnd)
        const sourceCards = queryClient.getQueryData<ListCardResponse[]>(['list-cards', sourceListId]) || [];
        const movingCard = sourceCards.find(c => c.id === cardId);

        if (movingCard) {
            queryClient.setQueryData<ListCardResponse[]>(['list-cards', sourceListId], (old = []) =>
                old.filter(c => c.id !== cardId)
            );

            queryClient.setQueryData<ListCardResponse[]>(['list-cards', destinationListId], (old = []) => {
                const filtered = old.filter(c => c.id !== cardId);
                const targetIdx = Math.max(0, Math.min(newIndex, filtered.length));
                const updatedCard = { ...movingCard, listId: destinationListId };
                filtered.splice(targetIdx, 0, updatedCard);
                return filtered;
            });
        }

        setOrderedLists(prevLists => {
            return prevLists.map(list => {
                if (list.id === sourceListId) {
                    const newReOrdered = (list.cards || []).filter((c: any) =>
                        typeof c === 'string' ? c !== cardId : c.id !== cardId
                    )
                    return { ...list, cards: newReOrdered };
                }
                if (list.id === destinationListId) {
                    const currentCards = [...(list.cards || [])];
                    const existingIndex = currentCards.findIndex((c: any) =>
                        typeof c === 'string' ? c === cardId : c.id === cardId
                    );
                    if (existingIndex !== -1) currentCards.splice(existingIndex, 1);
                    const targetIndex = Math.max(0, Math.min(newIndex, currentCards.length));
                    currentCards.splice(targetIndex, 0, cardId as any);
                    return { ...list, cards: currentCards };
                }
                return list;
            });
        });

        // Track latest pending move — only the final position on drop will be committed
        pendingCrossListMove.current = { cardId, sourceListId, destListId: destinationListId, destPosition: newIndex };
    };

    // trigger trong quá trình kéo 1 phần tử card/list vào column khác
    const handleDragOver = (event: DragOverEvent) => {
        if (document.querySelector('[data-slot="dialog-content"]')) {
            return;
        }
        if (activeDraggingItemType === ACTIVE_DRAG_ITEM_TYPE.LIST) {
            return;
        }
        const { active, over } = event;
        if (!over) return;

        const { id: activeCardId } = active;
        const { id: overCardId } = over;

        const activeList = findListByCardId(activeCardId as string);
        const overList = findListByCardId(overCardId as string);

        if (!activeList || !overList) return;

        if (activeList.id !== overList.id) {
            let newIndex = 0;
            const isOverACard = overList.cards?.some((c: any) =>
                typeof c === 'string' ? c === overCardId : c?.id === overCardId
            );
            if (isOverACard) {
                const overCardIndex = overList.cards?.findIndex((c: any) =>
                    typeof c === 'string' ? c === overCardId : c?.id === overCardId
                ) ?? 0;
                newIndex = overCardIndex >= 0 ? overCardIndex : (overList.cards?.length || 0);
            } else {
                newIndex = overList.cards?.length || 0;
            }

            moveCardBetweenDifferentLists(
                boardId || '',
                activeList.id,
                overList.id,
                newIndex,
                activeCardId as string
            );
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) {
            pendingCrossListMove.current = null;
            setActiveDraggingId(null);
            setActiveDraggingItemType(null);
            setActiveDraggingData(null);
            return;
        }

        // Dragging Column
        if (activeDraggingItemType === ACTIVE_DRAG_ITEM_TYPE.LIST) {
            if (active.id !== over.id) {
                setOrderedLists(prev => {
                    const oldIndex = prev.findIndex(list => list.id === active.id);
                    const newIndex = prev.findIndex(list => list.id === over.id);
                    const newList = arrayMove(prev, oldIndex, newIndex);
                    const orderedIds = newList.map(list => list.id);
                    if (boardId) reorderBoardLists(boardId, { orderedIds });
                    return newList;
                });
            }
        }

        // Dragging Card
        if (activeDraggingItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
            const activeCardId = active.id as string;
            const pending = pendingCrossListMove.current;

            if (pending && pending.cardId === activeCardId) {
                // Cross-list move — fire the single pending API call now
                moveCard(pending.cardId, pending.destListId, pending.destPosition)
                    .then(() => {
                        queryClient.invalidateQueries({ queryKey: ['board-lists', boardId] });
                        queryClient.invalidateQueries({ queryKey: ['list-cards'] });
                    })
                    .catch(err => {
                        console.error('Failed to move card:', err);
                        queryClient.invalidateQueries({ queryKey: ['board-lists', boardId] });
                        queryClient.invalidateQueries({ queryKey: ['list-cards'] });
                    });
                pendingCrossListMove.current = null;
            } else {
                const overCardId = over.id as string;
                const activeList = findListByCardId(activeCardId);
                const overList = findListByCardId(overCardId);

                if (activeList && overList && activeList.id === overList.id) {
                    // Same column reorder
                    pendingCrossListMove.current = null;
                    const listId = activeList.id;
                    const cachedCards = queryClient.getQueryData<ListCardResponse[]>(['list-cards', listId]) || [];
                    const oldIndex = cachedCards.findIndex(c => c.id === activeCardId);
                    const newIndex = cachedCards.findIndex(c => c.id === overCardId);

                    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                        const reordered = arrayMove(cachedCards, oldIndex, newIndex);
                        queryClient.setQueryData(['list-cards', listId], reordered);
                    }

                    const oldStateIndex = activeList.cards?.findIndex((c: any) =>
                        typeof c === 'string' ? c === activeCardId : c?.id === activeCardId
                    ) ?? -1;
                    const newStateIndex = overList.cards?.findIndex((c: any) =>
                        typeof c === 'string' ? c === overCardId : c?.id === overCardId
                    ) ?? -1;

                    if (oldStateIndex !== -1 && newStateIndex !== -1 && oldStateIndex !== newStateIndex) {
                        const newCards = arrayMove(activeList.cards || [], oldStateIndex, newStateIndex);
                        const updateCard = newCards.map((card: any) => typeof card === 'string' ? card : card.id);
                        setOrderedLists(prev =>
                            prev.map(l => (l.id === activeList.id ? { ...l, cards: newCards } : l))
                        );
                        reorderCards(activeList.id, updateCard as string[]);
                    }
                }
            }
        }

        setActiveDraggingId(null);
        setActiveDraggingItemType(null);
        setActiveDraggingData(null);
    };

    const handleCreateBoardList = async (title: string) => {
        if (!boardId) return
        try {
            await createBoardListMutation.mutateAsync({ boardId, payload: { title } })
            setIsCreateOpen(false)
        } catch (err) {
            console.warn('API error creating board list:', err)
        }
    }

    const handleUpdateTitleColumn = async (bId: string, listId: string, title: string) => {
        try {
            await updateBoardListMutation.mutateAsync({ boardId: bId, listId, payload: { title } })
        } catch (err) {
            console.warn('API error updating title:', err)
        }
    }

    const handleDeleteColumn = async (bId: string, listId: string) => {
        try {
            await deleteBoardListMutation.mutateAsync({ boardId: bId, listId })
        } catch (err) {
            console.warn('API error deleting list:', err)
        }
    }


    if (boardQuery.isLoading || listsQuery.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Đang tải bảng Kanban...</p>
            </div>
        )
    }

    const hasActiveFilter = React.useMemo(() => {
        return (
            (cardFilterFeatures.listIds && cardFilterFeatures.listIds.length > 0) ||
            (cardFilterFeatures.memberIds && cardFilterFeatures.memberIds.length > 0) ||
            (cardFilterFeatures.labelIds && cardFilterFeatures.labelIds.length > 0) ||
            (cardFilterFeatures.search && cardFilterFeatures.search.trim().length > 0) ||
            (cardFilterFeatures.status !== null && cardFilterFeatures.status !== undefined) ||
            !!cardFilterFeatures.noDeadline ||
            !!cardFilterFeatures.deadlineFrom ||
            !!cardFilterFeatures.deadlineTo
        );
    }, [cardFilterFeatures]);

    const filteredCardIds = React.useMemo(() => {
        if (!hasActiveFilter || !filterCardsQuery.data) return null;
        return new Set(filterCardsQuery.data.map(c => c.id));
    }, [hasActiveFilter, filterCardsQuery.data]);

    const orderedListsToRender = React.useMemo(() => {
        if (cardFilterFeatures.listIds && cardFilterFeatures.listIds.length > 0) {
            return orderedLists.filter(list => cardFilterFeatures.listIds.includes(list.id));
        }
        return orderedLists;
    }, [orderedLists, cardFilterFeatures.listIds]);

    return (

        <div className="space-y-4 max-w-[1600px] mx-auto text-slate-800">
            {/* ── Top Header Navigation Bar ────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                {/* Left Section: Title & Visibility */}
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        {isEditingTitle && isOwner ? (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={handleSaveTitle}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSaveTitle()
                                    } else if (e.key === 'Escape') {
                                        setIsEditingTitle(false)
                                    }
                                }}
                                autoFocus
                                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight bg-white border border-blue-500 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-500/10 min-w-[200px]"
                            />
                        ) : (
                            <h1
                                onDoubleClick={() => {
                                    if (isOwner) {
                                        setEditTitle(board?.title || '')
                                        setIsEditingTitle(true)
                                    }
                                }}
                                className={`text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate ${
                                    isOwner ? 'cursor-pointer hover:bg-slate-100 rounded px-1' : ''
                                }`}
                                title={isOwner ? 'Nhấp đúp chuột để sửa tiêu đề bảng' : undefined}
                            >
                                {board?.title}
                            </h1>
                        )}
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full shrink-0">
                        <Globe className="w-3 h-3 text-emerald-600" />
                        {board?.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                    </span>
                </div>

                {/* Right Section: Members (online presence) + Invite + Filter */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">

                    {/* ── Members List (online: normal opacity + green dot, offline: dimmed opacity) ── */}
                    <div className="flex items-center gap-1.5 py-1">
                        {board?.members.slice(0, 4).map(m => {
                            const avatarSrc = getAvatarUrl(m.user.avatarUrl)
                            const isOnline = currentUser?.id === m.user.id || onlineViewers.some(v => v.id === m.user.id)
                            const isMe = currentUser?.id === m.user.id
                            const isMemberOwner = m.role === 'OWNER' || m.user.id === board?.owner?.id

                            return (
                                <div
                                    key={m.id}
                                    className={`relative group shrink-0 transition-all ${
                                        isOnline ? 'opacity-100' : 'opacity-40 hover:opacity-90 grayscale-[25%]'
                                    }`}
                                >
                                    {avatarSrc ? (
                                        <img
                                            src={avatarSrc}
                                            alt={m.user.fullName}
                                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 shadow-xs cursor-pointer hover:scale-105 transition-transform ${
                                                isMe ? 'ring-blue-500' : isOnline ? 'ring-emerald-400' : 'ring-slate-200'
                                            }`}
                                        />
                                    ) : (
                                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 shadow-xs cursor-pointer hover:scale-105 transition-transform ${
                                            isMe
                                                ? 'bg-blue-600 ring-blue-500'
                                                : isOnline
                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-emerald-400'
                                                : 'bg-gradient-to-br from-slate-400 to-slate-500 ring-slate-200'
                                        }`}>
                                            {getInitials(m.user.fullName)}
                                        </div>
                                    )}

                                    {/* Green online indicator dot */}
                                    {isOnline && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full z-10" title="Đang trực tuyến" />
                                    )}

                                    {/* Owner Star Badge at bottom-right */}
                                    {isMemberOwner && (
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center ring-1 ring-white shadow-xs z-10" title="Chủ sở hữu">
                                            <Star className="w-2 h-2 fill-amber-950 stroke-none" />
                                        </span>
                                    )}

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-900 text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                        {m.user.fullName}{isMe ? ' (bạn)' : ''}{isMemberOwner ? ' (Chủ sở hữu)' : ''} · {isOnline ? 'Đang truy cập' : 'Ngoại tuyến'}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                    </div>
                                </div>
                            )
                        })}
                        {(board?.members.length ?? 0) > 4 && (
                            <span className="text-xs sm:text-sm font-bold text-slate-600 pl-0.5">
                                +{(board?.members.length ?? 0) - 4}
                            </span>
                        )}
                    </div>
                    {/* Invite button — only for Owner */}
                    {isOwner && (
                        <button
                            onClick={() => setIsInviteOpen(true)}
                            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Mời</span>
                        </button>
                    )}
                    {/* Members button for non-owners to see the list */}
                    {!isOwner && (
                        <button
                            onClick={() => setIsInviteOpen(true)}
                            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
                        >
                            <span>Thành viên</span>
                        </button>
                    )}
                    <CardFilterPopover boardId={boardId || ''} cardfillterFeatures={cardFilterFeatures} setCardFillterFeatures={setCardFilterFeatures} />
                </div>
            </div>

            {/* ── KANBAN BOARD COLUMNS ──────────────────────────────────────────────── */}
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={customCollisionDetection}
                    onDragOver={handleDragOver}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={orderedListsToRender.map(l => l.id)}
                        strategy={horizontalListSortingStrategy}
                    >
                        {orderedListsToRender.map(list => (
                            <KanbanColumn
                                key={list.id}
                                list={list}
                                filteredCardIds={filteredCardIds}
                                handleDeleteColumn={canDeleteList ? handleDeleteColumn : undefined}
                                handleUpdateTitleColumn={canEditList ? handleUpdateTitleColumn : undefined}
                                canCreateCard={canCreateCard}
                                canEditCard={canEditCard}
                                canDeleteCard={canDeleteCard}
                                canMoveCard={canMoveCard}
                            />
                        ))}
                    </SortableContext>

                    <DragOverlay>
                        {activeDraggingId && activeDraggingItemType === ACTIVE_DRAG_ITEM_TYPE.LIST && activeDraggingData ? (
                            <KanbanColumn
                                list={activeDraggingData as BoardList}
                                isOverlay
                            />
                        ) : activeDraggingId && activeDraggingItemType === ACTIVE_DRAG_ITEM_TYPE.CARD && activeDraggingData ? (
                            <KanbanCard
                                card={activeDraggingData as ListCardResponse}
                                isOverlay
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
                {canCreateList && (
                    <BoardListFormModal
                        isOpen={isCreateOpen}
                        onClose={() => setIsCreateOpen(false)}
                        onOpen={() => setIsCreateOpen(true)}
                        onSubmit={handleCreateBoardList}
                    />
                )}
            </div>

            {/* ── INVITE / MEMBER MODAL ─────────────────────────────────────────────────── */}
            <InviteMemberModal
                boardId={boardId}
                open={isInviteOpen}
                onOpenChange={setIsInviteOpen}
                projectName={board?.title}
                currentUserRole={board?.currentUserRole}
                initialMembers={board?.members?.map(m => ({
                    id: m.id,
                    fullName: m.user.fullName,
                    email: m.user.email || '',
                    avatarUrl: getAvatarUrl(m.user.avatarUrl),
                    role: (m.role as any) || 'MEMBER',
                    permissions: (m.permissions as any) || [],
                    status: 'joined' as const,
                    isYou: currentUser?.id === m.user.id,
                }))}
            />
        </div>
    )
}


