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

export interface UpdateCardPayload {
    title?: string;
    description?: string;
    deadline?: string | null;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
    completed?: boolean;
}

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
                queryClient.setQueryData<ListCardResponse[]>(['list-cards', updatedCard.listId], (oldCards = []) => {
                    return oldCards.map(c => c.id === updatedCard.id ? { ...c, ...updatedCard } : c);
                });
                queryClient.invalidateQueries({ queryKey: ['list-cards', updatedCard.listId] });
            }
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            queryClient.invalidateQueries({ queryKey: ['board-lists'] });
        },
    });
};

export const useToggleCardCompletedMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, completed, listId }: { cardId: string; completed?: boolean; listId?: string }) =>
            toggleCardCompleted(cardId, completed),
        onSuccess: (updatedCard, variables) => {
            const targetListId = updatedCard?.listId || variables.listId;
            if (targetListId) {
                queryClient.setQueryData<ListCardResponse[]>(['list-cards', targetListId], (oldCards = []) => {
                    return oldCards.map(c => c.id === variables.cardId ? { ...c, completed: variables.completed ?? !c.completed } : c);
                });
                queryClient.invalidateQueries({ queryKey: ['list-cards', targetListId] });
            }
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            queryClient.invalidateQueries({ queryKey: ['board-lists'] });
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
                queryClient.setQueryData<ListCardResponse[]>(['list-cards', variables.listId], (oldCards = []) => {
                    return oldCards.filter(c => c.id !== variables.cardId);
                });
                queryClient.invalidateQueries({ queryKey: ['list-cards', variables.listId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            }
            queryClient.invalidateQueries({ queryKey: ['board-lists'] });
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
        },
    });
};

export const useDeleteBoardLabelMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ labelId, boardId }: { labelId: string; boardId?: string }) =>
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

