import React, { useEffect, useRef, useState } from 'react'
import { data, useParams } from 'react-router-dom'
import {
    Search,
    Filter,
    MoreHorizontal,
    Globe,
    MoreVertical,
    Bookmark,
    Loader2
} from 'lucide-react'
import { useBoardDetailQuery, type BoardList } from '../services/boardServices'
import { KanbanColumn } from '../components/kanban/KanbanColumn'
import { BoardListFormModal } from '../components/boardList/BoardListFormModal'
import {
    useBoardListsQuery,
    useCreateBoardListMutation,
    useUpdateBoardListMutation,
    useDeleteBoardListMutation,
    reorderBoardLists
} from "../services/boardListServices"
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
import { moveCard, reorderCards, type ListCardResponse } from '../services/listCardServices'
import { KanbanCard } from '../components/kanban/KanbanCard'
import { InviteMemberModal } from '../components/board/InviteMemberModal'

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
    const [searchCardQuery, setSearchCardQuery] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [orderedLists, setOrderedLists] = useState<BoardList[]>([]);
    const boardQuery = useBoardDetailQuery(boardId)
    const listsQuery = useBoardListsQuery(boardId)

    const createBoardListMutation = useCreateBoardListMutation()
    const updateBoardListMutation = useUpdateBoardListMutation()
    const deleteBoardListMutation = useDeleteBoardListMutation()

    const board = boardQuery.data
    useEffect(() => {
        if (listsQuery.data) {
            setOrderedLists(listsQuery.data);
        }
    }, [listsQuery.data]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        // useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 500 } }),
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
                    return {
                        ...list,
                        cards: newReOrdered
                    };
                }
                if (list.id === destinationListId) {
                    const currentCards = [...(list.cards || [])];
                    const existingIndex = currentCards.findIndex((c: any) =>
                        typeof c === 'string' ? c === cardId : c.id === cardId
                    );
                    if (existingIndex !== -1) {
                        currentCards.splice(existingIndex, 1);
                    }
                    const targetIndex = Math.max(0, Math.min(newIndex, currentCards.length));
                    currentCards.splice(targetIndex, 0, cardId as any);
                    return {
                        ...list,
                        cards: currentCards
                    };
                }
                return list;
            });
        });
        moveCard(cardId, destinationListId, newIndex);
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
                    if (boardId) {
                        reorderBoardLists(boardId, { orderedIds });
                    }
                    return newList;
                });
            }
        }

        // Dragging Card within SAME column
        if (activeDraggingItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
            const activeCardId = active.id as string;
            const overCardId = over.id as string;
            const activeList = findListByCardId(activeCardId);
            const overList = findListByCardId(overCardId);

            if (activeList && overList && activeList.id === overList.id) {
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
                    const updateCard = newCards.map((card: any) => typeof card === 'string' ? card : card.id)
                    setOrderedLists(prev =>
                        prev.map(l => (l.id === activeList.id ? { ...l, cards: newCards } : l))
                    );
                    reorderCards(activeList.id, updateCard as string[]);
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
                <p className="text-sm font-medium">Loading Kanban Board...</p>
            </div>
        )
    }

    return (

        <div className="space-y-6 max-w-[1600px] mx-auto text-slate-800">
            {/* ── Top Header Navigation Bar ────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4  p-4 rounded-2xl">
                {/* Left Section: Board Icon, Title, Visibility, Bookmark, Members, Invite */}
                <div className="flex items-center gap-3 flex-wrap">

                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            {board?.title}
                        </h1>
                        <span className="text-slate-400 font-bold cursor-pointer hover:text-slate-600">..</span>
                    </div>

                    {/* Visibility Pill */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        {board?.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                    </span>

                    {/* Bookmark Button */}
                    <button className="p-2 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer">
                        <Bookmark className="w-4 h-4 fill-amber-500" />
                    </button>

                    {/* Member Avatars Stack */}
                    <div className="flex -space-x-2.5 overflow-hidden items-center ml-1">
                        {board?.members.map(m => (
                            <img
                                key={m.id}
                                src={m.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt={m.user.fullName}
                                title={m.user.fullName}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-2xs cursor-pointer hover:scale-110 transition-transform"
                            />
                        ))}
                    </div>

                    {/* Options Dots */}
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Invite Button */}
                    <button
                        onClick={() => setIsInviteOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                        <span>Invite</span>
                    </button>
                </div>

                {/* Right Section: Filter, Search, More Options */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <button className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span>Filter</span>
                    </button>

                    <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search cards..."
                            value={searchCardQuery}
                            onChange={e => setSearchCardQuery(e.target.value)}
                            className="pl-9 pr-3.5 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-44 sm:w-56 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── KANBAN BOARD COLUMNS ──────────────────────────────────────────────── */}
            <div className="flex gap-3">
                <DndContext
                    sensors={sensors}
                    collisionDetection={customCollisionDetection}
                    onDragOver={handleDragOver}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={orderedLists.map(l => l.id)}
                        strategy={horizontalListSortingStrategy}
                    >
                        {orderedLists.map(list => (
                            <KanbanColumn
                                key={list.id}
                                list={list}
                                handleDeleteColumn={handleDeleteColumn}
                                handleUpdateTitleColumn={handleUpdateTitleColumn}
                            />
                        ))}
                    </SortableContext>

                    <DragOverlay>
                        {activeDraggingItemType === ACTIVE_DRAG_ITEM_TYPE.LIST && activeDraggingData ? (
                            <KanbanColumn
                                list={activeDraggingData as BoardList}
                                isOverlay
                            />
                        ) : activeDraggingItemType === ACTIVE_DRAG_ITEM_TYPE.CARD && activeDraggingData ? (
                            <KanbanCard
                                card={activeDraggingData as ListCardResponse}
                                isOverlay
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
                {
                    <BoardListFormModal
                        isOpen={isCreateOpen}
                        onClose={() => setIsCreateOpen(false)}
                        onOpen={() => setIsCreateOpen(true)}
                        onSubmit={handleCreateBoardList}
                    />
                }
            </div>

            {/* ── INVITE MEMBER MODAL ───────────────────────────────────────────────── */}
            <InviteMemberModal
                boardId={boardId}
                open={isInviteOpen}
                onOpenChange={setIsInviteOpen}
                projectName={board?.title}
                initialMembers={board?.members?.map(m => ({
                    id: m.id,
                    fullName: m.user.fullName,
                    email: m.user.email || '',
                    avatarUrl: m.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                    role: (m.role as any) || 'Developer',
                    status: 'joined',
                    isYou: false,
                }))}
            />
        </div>
    )
}

