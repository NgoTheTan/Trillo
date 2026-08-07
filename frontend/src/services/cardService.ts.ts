import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Api } from "../api/api";

export interface ListCardPayload {
    title: string;
}

export interface CardMember {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
    createdAt?: string;
}

export interface CardLabel {
    id: string;
    boardId: string;
    name: string;
    color: string;
    createdAt?: string;
}

export interface ListCardResponse {
    id: string;
    listId: string;
    title: string;
    description?: string | null;
    deadline?: string | null;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | string;
    position: number;
    completed: boolean;
    assignedMembers: CardMember[];
    labels: CardLabel[];
    checklistTotal: number;
    checklistCompleted: number;
    commentCount: number;
    createdAt?: string;
}

export interface UpdateCardPayload {
    title?: string;
    description?: string;
    deadline?: string | null;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
    completed?: boolean;
}

export interface FilterCardsPayload {
    search: string,
    listIds: string[],
    memberIds: string[],
    labelIds: string[],
    status: boolean | null,
    noDeadline?: boolean,
    deadlineFrom: string | Date | null,
    deadlineTo: string | Date | null,
}

export const createNewCard = async (listId: string, listCardPayload: ListCardPayload) => {
    return await Api.post<ListCardResponse>(`/lists/${listId}/cards`, listCardPayload);
};

// get /api/lists/{listId}/cards
export const getAllListCards = async (listId: string) => {
    return await Api.get<ListCardResponse[]>(`/lists/${listId}/cards`);
};

// patch /api/lists/{listId}/cards/reorder
export const reorderCards = async (listId: string, orderedIds: string[]) => {
    return await Api.patch<ListCardResponse[]>(`/lists/${listId}/cards/reorder`, { orderedIds });
};

// patch api/cards/{cardId}/move
export const moveCard = async (cardId: string, targetListId: string, targetPosition: number) => {
    return await Api.patch<ListCardResponse[]>(`/cards/${cardId}/move`, { targetListId, targetPosition });
};

// delete api/cards/{cardId}
export const deleteCard = async (cardId: string) => {
    return await Api.delete<ListCardResponse>(`/cards/${cardId}`);
};


// put /api/cards/{cardId}
export const updateCard = async (cardId: string, cardData: UpdateCardPayload) => {
    return await Api.put<ListCardResponse>(`/cards/${cardId}`, cardData);
};

// patch /api/cards/{cardId}/completed
export const toggleCardCompleted = async (cardId: string, completed?: boolean) => {
    try {
        const query = completed !== undefined ? `?completed=${completed}` : '';
        return await Api.patch<ListCardResponse>(`/cards/${cardId}/completed${query}`);
    } catch (err) {
        // Fallback to PUT /api/cards/{cardId} endpoint if server has not been restarted
        return await updateCard(cardId, { completed });
    }
};

// patch /api/cards/{cardId}/assign/{userId}
export const assignMemberToCard = async (cardId: string, userId: string) => {
    return await Api.patch<ListCardResponse>(`/cards/${cardId}/assign/${userId}`);
};

// delete /api/cards/{cardId}/assign/{userId}
export const unassignMemberFromCard = async (cardId: string, userId: string) => {
    return await Api.delete<ListCardResponse>(`/cards/${cardId}/assign/${userId}`);
};

// get /api/boards/{boardId}/labels
export const getBoardLabels = async (boardId: string) => {
    return await Api.get<CardLabel[]>(`/boards/${boardId}/labels`);
};

// post /api/boards/{boardId}/labels
export const createBoardLabel = async (boardId: string, payload: { name: string; color: string }) => {
    return await Api.post<CardLabel>(`/boards/${boardId}/labels`, payload);
};

// delete /api/labels/{labelId}
export const deleteBoardLabel = async (labelId: string) => {
    return await Api.delete<void>(`/labels/${labelId}`);
};

// put /api/labels/{labelId}
export const updateBoardLabel = async (labelId: string, payload: { name?: string; color?: string }) => {
    return await Api.put<CardLabel>(`/labels/${labelId}`, payload);
};

// post /api/cards/{cardId}/labels/{labelId}
export const addLabelToCard = async (cardId: string, labelId: string) => {
    return await Api.post<void>(`/cards/${cardId}/labels/${labelId}`);
};

// delete /api/cards/{cardId}/labels/{labelId}
export const removeLabelFromCard = async (cardId: string, labelId: string) => {
    return await Api.delete<void>(`/cards/${cardId}/labels/${labelId}`);
};

const formatToIsoString = (val: string | Date | null | undefined): string | null => {
    if (!val) return null;
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        const tzOffset = val.getTimezoneOffset() * 60000;
        return new Date(val.getTime() - tzOffset).toISOString().slice(0, 19);
    }
    if (typeof val === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(val)) return val;
        const d = new Date(val);
        if (isNaN(d.getTime())) return val;
        const tzOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tzOffset).toISOString().slice(0, 19);
    }
    return null;
};

// /api/boards/{boardId}/cards/filter
export const filterCards = async (boardId: string, filters: FilterCardsPayload) => {
    const searchParams = new URLSearchParams();

    if (filters.search && filters.search.trim()) {
        searchParams.append('search', filters.search.trim());
    }
    const listIds = filters.listIds || (filters as any).columnIds || [];
    if (listIds.length > 0) {
        listIds.forEach((id: string) => searchParams.append('listIds', id));
    }
    if (filters.status !== null && filters.status !== undefined) {
        searchParams.append('status', String(filters.status));
    }
    if (filters.noDeadline) {
        searchParams.append('noDeadline', 'true');
    }
    if (filters.memberIds && filters.memberIds.length > 0) {
        filters.memberIds.forEach(id => searchParams.append('memberIds', id));
    }
    if (filters.labelIds && filters.labelIds.length > 0) {
        filters.labelIds.forEach(id => searchParams.append('labelIds', id));
    }
    const fromIso = formatToIsoString(filters.deadlineFrom);
    if (fromIso) {
        searchParams.append('deadlineFrom', fromIso);
    }
    const toIso = formatToIsoString(filters.deadlineTo);
    if (toIso) {
        searchParams.append('deadlineTo', toIso);
    }

    const queryString = searchParams.toString();
    const url = queryString ? `/boards/${boardId}/cards/filter?${queryString}` : `/boards/${boardId}/cards/filter`;
    return await Api.get<ListCardResponse[]>(url);
};


// ── React Query Hooks ────────────────────────────────────────────────────────

export const useListCardsQuery = (listId: string | undefined) => {
    return useQuery({
        queryKey: ['list-cards', listId],
        queryFn: () => getAllListCards(listId!),
        enabled: !!listId,
    });
};

export const useUpdateCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, cardData }: { cardId: string; cardData: UpdateCardPayload }) =>
            updateCard(cardId, cardData),
        onSuccess: (updatedCard) => {
            if (updatedCard?.listId) {
                queryClient.invalidateQueries({ queryKey: ['list-cards', updatedCard.listId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            }
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
    });
};

export const useToggleCardCompletedMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, completed }: { cardId: string; completed: boolean; listId?: string }) =>
            toggleCardCompleted(cardId, completed),
        onSuccess: (updatedCard, variables) => {
            const listId = updatedCard?.listId || variables.listId;
            if (listId) {
                queryClient.invalidateQueries({ queryKey: ['list-cards', listId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            }
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
    });
};

export const useCreateCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ listId, payload }: { listId: string; payload: ListCardPayload }) =>
            createNewCard(listId, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['list-cards', variables.listId] });
            queryClient.invalidateQueries({ queryKey: ['board-lists'] });
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
    });
};

export const useDeleteCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId }: { cardId: string; listId?: string }) => deleteCard(cardId),
        onSuccess: (_, variables) => {
            if (variables.listId) {
                queryClient.invalidateQueries({ queryKey: ['list-cards', variables.listId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            }
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
    });
};

export const useAssignMemberMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, userId }: { cardId: string; userId: string; listId?: string }) =>
            assignMemberToCard(cardId, userId),
        onSuccess: (updatedCard, variables) => {
            const listId = updatedCard?.listId || variables.listId;
            if (listId) {
                queryClient.invalidateQueries({ queryKey: ['list-cards', listId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            }
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
    });
};

export const useUnassignMemberMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, userId }: { cardId: string; userId: string; listId?: string }) =>
            unassignMemberFromCard(cardId, userId),
        onSuccess: (updatedCard, variables) => {
            const listId = updatedCard?.listId || variables.listId;
            if (listId) {
                queryClient.invalidateQueries({ queryKey: ['list-cards', listId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            }
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
    });
};

export const useBoardLabelsQuery = (boardId: string | undefined) => {
    return useQuery({
        queryKey: ['board-labels', boardId],
        queryFn: () => getBoardLabels(boardId!),
        enabled: !!boardId,
    });
};

export const useCreateBoardLabelMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ boardId, payload }: { boardId: string; payload: { name: string; color: string } }) =>
            createBoardLabel(boardId, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['board-labels', variables.boardId] });
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
    });
};

export const useDeleteBoardLabelMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ labelId }: { labelId: string; boardId?: string }) =>
            deleteBoardLabel(labelId),
        onSuccess: (_, variables) => {
            if (variables.boardId) {
                queryClient.invalidateQueries({ queryKey: ['board-labels', variables.boardId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['board-labels'] });
            }
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
        },
    });
};

export const useUpdateBoardLabelMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ labelId, payload }: { labelId: string; payload: { name?: string; color?: string }; boardId?: string }) =>
            updateBoardLabel(labelId, payload),
        onSuccess: (_, variables) => {
            if (variables.boardId) {
                queryClient.invalidateQueries({ queryKey: ['board-labels', variables.boardId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['board-labels'] });
            }
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
        },
    });
};

export const useAddLabelToCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, labelId }: { cardId: string; labelId: string; listId?: string }) =>
            addLabelToCard(cardId, labelId),
        onSuccess: (_, variables) => {
            if (variables.listId) {
                queryClient.invalidateQueries({ queryKey: ['list-cards', variables.listId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            }
        },
    });
};

export const useRemoveLabelFromCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, labelId }: { cardId: string; labelId: string; listId?: string }) =>
            removeLabelFromCard(cardId, labelId),
        onSuccess: (_, variables) => {
            if (variables.listId) {
                queryClient.invalidateQueries({ queryKey: ['list-cards', variables.listId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            }
        },
    });
};

export const useFilterCardsQuery = (boardId: string | undefined, filters: FilterCardsPayload) => {
    const hasActiveFilter =
        (filters.listIds && filters.listIds.length > 0) ||
        (filters.memberIds && filters.memberIds.length > 0) ||
        (filters.labelIds && filters.labelIds.length > 0) ||
        (filters.search && filters.search.trim().length > 0) ||
        (filters.status !== null && filters.status !== undefined) ||
        !!filters.noDeadline ||
        !!filters.deadlineFrom ||
        !!filters.deadlineTo;

    return useQuery({
        queryKey: ['filter-cards', boardId, filters],
        queryFn: () => filterCards(boardId!, filters),
        enabled: !!boardId && hasActiveFilter,
    });
};
