import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Api } from "../api/api";

export interface BoardFormPayload {
  title: string
  description?: string
  visibility: 'PUBLIC' | 'PRIVATE'
  coverColor?: string
}

// Aliases for payload operations
export type CreateBoardPayload = BoardFormPayload;
export type UpdateBoardPayload = BoardFormPayload;
export type BoardPayload = BoardFormPayload;

export interface UserResponse {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  createdAt?: string
}

export type BoardOwner = UserResponse;

export interface BoardMember {
  id: string
  user: UserResponse
  role: 'OWNER' | 'MEMBER' | string
  joinedAt?: string
}

export interface BoardLabel {
  id: string
  boardId: string
  name: string
  color: string
  createdAt?: string
}

export interface BoardCard {
  id: string
  listId: string
  title: string
  deadline?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | string
  position: number
  completed: boolean
  assignedMembers?: UserResponse[]
  labels?: BoardLabel[]
  checklistTotal: number
  checklistCompleted: number
  commentCount: number
  createdAt?: string
}

export interface BoardList {
  id: string
  boardId: string
  title: string
  position: number
  cards: (string | BoardCard)[]
  createdAt?: string
}

export interface BoardDetailResponse {
  id: string
  title: string
  description?: string
  visibility: 'PUBLIC' | 'PRIVATE' | string
  coverColor?: string
  owner: UserResponse
  currentUserRole?: 'OWNER' | 'MEMBER' | string
  members: BoardMember[]
  lists: BoardList[]
  labels: BoardLabel[]
  createdAt?: string
  updatedAt?: string
}

export interface BoardSummaryResponse {
  id: string
  title: string
  description?: string
  visibility: 'PUBLIC' | 'PRIVATE' | string
  coverColor?: string
  owner: UserResponse
  currentUserRole?: 'OWNER' | 'MEMBER' | string
  memberCount?: number
  cardCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface InviteResponse {
  success: boolean
  message: string
  inviteUrl?: string | null
}

export type NewBoardResponse = BoardDetailResponse;
export type BoardResponse = BoardSummaryResponse;
export type Member = BoardMember;
export type List = BoardList;
export type Label = BoardLabel;
export type Card = BoardCard;

// ── API Functions ────────────────────────────────────────────────────────────

export const createNewBoard = async (payload: BoardFormPayload): Promise<BoardDetailResponse> => {
  return await Api.post<BoardDetailResponse>("/boards", payload);
}

export const getAllBoards = async (): Promise<BoardSummaryResponse[]> => {
  return await Api.get<BoardSummaryResponse[]>("/boards");
}

export const getPublicBoards = async (): Promise<BoardSummaryResponse[]> => {
  return await Api.get<BoardSummaryResponse[]>("/boards/public");
}

export const getBoard = async (boardId: string): Promise<BoardDetailResponse> => {
  return await Api.get<BoardDetailResponse>(`/boards/${boardId}`);
}

export const updateBoard = async (id: string, payload: BoardFormPayload): Promise<BoardDetailResponse> => {
  return await Api.put<BoardDetailResponse>(`/boards/${id}`, payload);
}

export const deleteBoard = async (id: string): Promise<void> => {
  await Api.delete<void>(`/boards/${id}`);
}

export const removeMember = async (boardId: string, userId: string): Promise<void> => {
  await Api.delete<void>(`/boards/${boardId}/members/${userId}`);
}

export const inviteMember = async (boardId: string, email: string): Promise<InviteResponse> => {
  return await Api.post<InviteResponse>(`/boards/${boardId}/invite`, { email });
}

export const acceptInvite = async (token: string): Promise<BoardSummaryResponse> => {
  return await Api.post<BoardSummaryResponse>(`/boards/accept-invite/${token}`);
}

// ── React Query Hooks ────────────────────────────────────────────────────────

export const useBoardsQuery = () => {
  return useQuery({
    queryKey: ['boards'],
    queryFn: getAllBoards,
  });
};

export const usePublicBoardsQuery = () => {
  return useQuery({
    queryKey: ['boards', 'public'],
    queryFn: getPublicBoards,
  });
};

export const useBoardDetailQuery = (boardId: string | undefined) => {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: () => getBoard(boardId!),
    enabled: !!boardId,
  });
};

export const useCreateBoardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BoardFormPayload) => createNewBoard(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

export const useUpdateBoardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BoardFormPayload }) => updateBoard(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['boards', variables.id] });
    },
  });
};

export const useDeleteBoardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

