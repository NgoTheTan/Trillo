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

export interface ChecklistItemResponse {
    id: string;
    content: string;
    completed: boolean;
    position: number;
    createdAt?: string;
}

export interface ChecklistResponse {
    id: string;
    title: string;
    items: ChecklistItemResponse[];
    totalItems: number;
    completedItems: number;
    createdAt?: string;
}

export interface CommentResponse {
    id: string;
    author: CardMember;
    content: string;
    createdAt: string;
    updatedAt?: string;
}

export interface AttachmentResponse {
    id: string;
    uploadedBy: CardMember;
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
    createdAt: string;
}

export interface ActivityLogResponse {
    id: string;
    user: CardMember;
    action: string;
    detail: string;
    createdAt: string;
}

export interface CardDetailResponse {
    id: string;
    listId: string;
    listTitle: string;
    boardId: string;
    title: string;
    description?: string | null;
    deadline?: string | null;
    position: number;
    completed: boolean;
    assignedMembers: CardMember[];
    labels: CardLabel[];
    checklists: ChecklistResponse[];
    comments: CommentResponse[];
    attachments: AttachmentResponse[];
    activityLogs: ActivityLogResponse[];
    createdAt?: string;
    updatedAt?: string;
}

export interface ListCardResponse {
    id: string;
    listId: string;
    title: string;
    description?: string | null;
    deadline?: string | null;
    position: number;
    completed: boolean;
    assignedMembers: CardMember[];
    labels: CardLabel[];
    checklistTotal: number;
    checklistCompleted: number;
    commentCount: number;
    attachmentCount: number;
    checklists: ChecklistResponse[];
    createdAt?: string;
}

export interface UpdateCardPayload {
    title?: string;
    description?: string;
    deadline?: string | null;
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

export const useMoveCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { cardId: string; targetListId: string; targetPosition: number }) =>
            moveCard(data.cardId, data.targetListId, data.targetPosition),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            queryClient.invalidateQueries({ queryKey: ['card-detail'] });
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
    });
};

export const useUpdateCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, cardData }: { cardId: string; cardData: UpdateCardPayload }) =>
            updateCard(cardId, cardData),
        onSuccess: (updatedCard, variables) => {
            if (updatedCard?.listId) {
                queryClient.invalidateQueries({ queryKey: ['list-cards', updatedCard.listId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['list-cards'] });
            }
            if (variables?.cardId) {
                queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
            }
            queryClient.invalidateQueries({ queryKey: ['card-detail'] });
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
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
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
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
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
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
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
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
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

// ── Card Detail, Checklist, Comment, Attachment APIs ──────────────────────────

export const getCardDetail = async (cardId: string) => {
    return await Api.get<CardDetailResponse>(`/cards/${cardId}`);
};

export const createChecklist = async (cardId: string, title: string) => {
    return await Api.post<ChecklistResponse>(`/cards/${cardId}/checklists`, { title });
};

export const updateChecklist = async (checklistId: string, title: string) => {
    return await Api.put<ChecklistResponse>(`/checklists/${checklistId}`, { title });
};

export const deleteChecklist = async (checklistId: string) => {
    return await Api.delete<void>(`/checklists/${checklistId}`);
};

export const addChecklistItem = async (checklistId: string, content: string) => {
    return await Api.post<ChecklistItemResponse>(`/checklists/${checklistId}/items`, { content });
};

export const updateChecklistItem = async (itemId: string, content: string) => {
    return await Api.put<ChecklistItemResponse>(`/checklists/items/${itemId}`, { content });
};

export const toggleChecklistItem = async (itemId: string) => {
    return await Api.patch<ChecklistItemResponse>(`/checklists/items/${itemId}/toggle`);
};

export const deleteChecklistItem = async (itemId: string) => {
    return await Api.delete<void>(`/checklists/items/${itemId}`);
};

export const addComment = async (cardId: string, content: string) => {
    return await Api.post<CommentResponse>(`/cards/${cardId}/comments`, { content });
};

export const updateComment = async (commentId: string, content: string) => {
    return await Api.put<CommentResponse>(`/comments/${commentId}`, { content });
};

export const deleteComment = async (commentId: string) => {
    return await Api.delete<void>(`/comments/${commentId}`);
};

export const addLinkAttachment = async (cardId: string, fileUrl: string, fileName?: string) => {
    return await Api.post<AttachmentResponse>(`/cards/${cardId}/attachments`, {
        fileUrl,
        fileName: fileName || fileUrl,
        fileType: "link"
    });
};

export const uploadFileAttachment = async (cardId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return await Api.post<AttachmentResponse>(`/cards/${cardId}/attachments/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const deleteAttachment = async (attachmentId: string) => {
    return await Api.delete<void>(`/attachments/${attachmentId}`);
};

// Hooks
export const useCardDetailQuery = (cardId: string | undefined) => {
    return useQuery({
        queryKey: ['card-detail', cardId],
        queryFn: () => getCardDetail(cardId!),
        enabled: !!cardId,
    });
};

export const useCreateChecklistMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, title }: { cardId: string; title: string }) => createChecklist(cardId, title),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
        },
    });
};

export const useUpdateChecklistMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { checklistId: string; title: string; cardId: string }) =>
            updateChecklist(data.checklistId, data.title),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
        },
    });
};

export const useDeleteChecklistMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { checklistId: string; cardId: string }) =>
            deleteChecklist(data.checklistId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
        },
    });
};

export const useAddChecklistItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { checklistId: string; content: string; cardId: string }) =>
            addChecklistItem(data.checklistId, data.content),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
        },
    });
};

export const useUpdateChecklistItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { itemId: string; content: string; cardId: string }) =>
            updateChecklistItem(data.itemId, data.content),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
        },
    });
};

export const useToggleChecklistItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { itemId: string; cardId: string }) =>
            toggleChecklistItem(data.itemId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
        },
    });
};

export const useDeleteChecklistItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { itemId: string; cardId: string }) =>
            deleteChecklistItem(data.itemId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
        },
    });
};

export const useAddCommentMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { cardId: string; content: string }) =>
            addComment(data.cardId, data.content),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
        },
    });
};

export const useUpdateCommentMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { commentId: string; content: string; cardId: string }) =>
            updateComment(data.commentId, data.content),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
        },
    });
};

export const useDeleteCommentMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { commentId: string; cardId: string }) =>
            deleteComment(data.commentId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
            queryClient.invalidateQueries({ queryKey: ['list-cards'] });
        },
    });
};

export const useAddLinkAttachmentMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { cardId: string; fileUrl: string; fileName?: string }) =>
            addLinkAttachment(data.cardId, data.fileUrl, data.fileName),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
        },
    });
};

export const useUploadFileAttachmentMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { cardId: string; file: File }) =>
            uploadFileAttachment(data.cardId, data.file),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
        },
    });
};

export const useDeleteAttachmentMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { attachmentId: string; cardId: string }) =>
            deleteAttachment(data.attachmentId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', variables.cardId] });
        },
    });
};

