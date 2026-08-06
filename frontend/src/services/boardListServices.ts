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

// ── React Query Hooks ────────────────────────────────────────────────────────

export const useBoardListsQuery = (boardId: string | undefined) => {
  return useQuery({
    queryKey: ['board-lists', boardId],
    queryFn: () => getAllBoardLists(boardId!),
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

export const useDeleteBoardListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, listId }: { boardId: string; listId: string }) =>
      deleteBoardList(boardId, listId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board-lists', variables.boardId] });
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


