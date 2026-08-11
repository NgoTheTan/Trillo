import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Api } from "../api/api";
import type { BoardList } from "./boardServices";

export interface BoardListPayload {
  title: string;
}

export interface ReorderBoardListsPayload {
  orderedIds: string[];
}

// GET /api/boards/{boardId}/lists
export const getAllBoardLists = async (boardId: string): Promise<BoardList[]> => {
  return Api.get<BoardList[]>(`/boards/${boardId}/lists`);
};

// POST /api/boards/{boardId}/lists
export const createBoardList = async (
  boardId: string,
  boardListData: BoardListPayload
): Promise<BoardList> => {
  return Api.post<BoardList>(`/boards/${boardId}/lists`, boardListData);
};

// PUT /api/boards/{boardId}/lists/{listId}
export const updateBoardList = async (
  boardId: string,
  listId: string,
  boardListData: BoardListPayload
): Promise<BoardList> => {
  return Api.put<BoardList>(
    `/boards/${boardId}/lists/${listId}`,
    boardListData
  );
};

// PATCH /api/boards/{boardId}/lists/reorder
export const reorderBoardLists = async (
  boardId: string,
  reorderData: ReorderBoardListsPayload
): Promise<void> => {
  return Api.patch<void>(`/boards/${boardId}/lists/reorder`, reorderData);
};

// DELETE /api/boards/{boardId}/lists/{listId}
export const deleteBoardList = async (
  boardId: string,
  listId: string
): Promise<void> => {
  return Api.delete<void>(`/boards/${boardId}/lists/${listId}`);
};

// GET /api/boards/{boardId}/lists/archived
export const getArchivedBoardLists = async (boardId: string): Promise<BoardList[]> => {
  return Api.get<BoardList[]>(`/boards/${boardId}/lists/archived`);
};

// PATCH /api/boards/{boardId}/lists/{listId}/archive
export const archiveBoardList = async (
  boardId: string,
  listId: string,
  archived: boolean = true
): Promise<BoardList> => {
  return Api.patch<BoardList>(`/boards/${boardId}/lists/${listId}/archive?archived=${archived}`);
};

// POST /api/boards/{boardId}/lists/{listId}/copy
export const copyBoardList = async (
  boardId: string,
  listId: string
): Promise<BoardList> => {
  return Api.post<BoardList>(`/boards/${boardId}/lists/${listId}/copy`);
};

// POST /api/boards/{boardId}/lists/{listId}/move-all-cards
export const moveAllCardsInList = async (
  boardId: string,
  listId: string,
  targetListId: string
): Promise<void> => {
  return Api.post<void>(`/boards/${boardId}/lists/${listId}/move-all-cards?targetListId=${targetListId}`);
};

// POST /api/boards/{boardId}/lists/{listId}/archive-all-cards
export const archiveAllCardsInList = async (
  boardId: string,
  listId: string
): Promise<void> => {
  return Api.post<void>(`/boards/${boardId}/lists/${listId}/archive-all-cards`);
};

// POST /api/boards/{boardId}/lists/{listId}/sort
export const sortCardsInList = async (
  boardId: string,
  listId: string,
  sortBy: string
): Promise<void> => {
  return Api.post<void>(`/boards/${boardId}/lists/${listId}/sort?sortBy=${sortBy}`);
};


// ── React Query Hooks ────────────────────────────────────────────────────────

export const useBoardListsQuery = (boardId: string | undefined) => {
  return useQuery({
    queryKey: ['board-lists', boardId],
    queryFn: () => getAllBoardLists(boardId!),
    enabled: !!boardId,
  });
};

export const useArchivedListsQuery = (boardId: string | undefined) => {
  return useQuery({
    queryKey: ['archived-board-lists', boardId],
    queryFn: () => getArchivedBoardLists(boardId!),
    enabled: !!boardId,
  });
};

export const useCreateBoardListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, payload }: { boardId: string; payload: BoardListPayload }) =>
      createBoardList(boardId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board-lists', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['boards', variables.boardId] });
    },
  });
};

export const useUpdateBoardListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, listId, payload }: { boardId: string; listId: string; payload: BoardListPayload }) =>
      updateBoardList(boardId, listId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board-lists', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['boards', variables.boardId] });
    },
  });
};

export const useArchiveBoardListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, listId, archived }: { boardId: string; listId: string; archived?: boolean }) =>
      archiveBoardList(boardId, listId, archived ?? true),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board-lists', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['archived-board-lists', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['boards', variables.boardId] });
    },
  });
};

export const useCopyBoardListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, listId }: { boardId: string; listId: string }) =>
      copyBoardList(boardId, listId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board-lists', variables.boardId] });
    },
  });
};

export const useMoveAllCardsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, listId, targetListId }: { boardId: string; listId: string; targetListId: string }) =>
      moveAllCardsInList(boardId, listId, targetListId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board-lists', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['list-cards'] });
    },
  });
};

export const useArchiveAllCardsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, listId }: { boardId: string; listId: string }) =>
      archiveAllCardsInList(boardId, listId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board-lists', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['list-cards', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['archived-cards', variables.boardId] });
    },
  });
};

export const useSortCardsInListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, listId, sortBy }: { boardId: string; listId: string; sortBy: string }) =>
      sortCardsInList(boardId, listId, sortBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list-cards', variables.listId] });
    },
  });
};

export const useDeleteBoardListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, listId }: { boardId: string; listId: string }) =>
      deleteBoardList(boardId, listId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board-lists', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['archived-board-lists', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['boards', variables.boardId] });
    },
  });
};

// export const useReorderBoardListsMutation = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: ({ boardId, payload }: { boardId: string; payload: ReorderBoardListsPayload }) =>
//       reorderBoardLists(boardId, payload),
//     onSuccess: (_, variables) => {
//       queryClient.invalidateQueries({ queryKey: ['board-lists', variables.boardId] });
//       queryClient.invalidateQueries({ queryKey: ['boards', variables.boardId] });
//     },
//   });
// };


