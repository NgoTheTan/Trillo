import { Api } from "../api/api";

export interface BoardFormPayload {
    title: string
    description?: string
    visibility: 'PUBLIC' | 'PRIVATE'
    coverColor?: string
}

// Aliases for operations
export type CreateBoardPayload = BoardFormPayload;
export type UpdateBoardPayload = BoardFormPayload;
export type BoardPayload = BoardFormPayload;

export interface BoardOwner {
    id: string
    email: string
    fullName: string
    avatarUrl?: string
}

export interface BoardMember {
    id: string
    user?: BoardOwner
    email?: string
    fullName?: string
    avatarUrl?: string
    role?: string
    joinedAt?: string
}

export interface BoardList {
    id: string
    title: string
    boardId?: string
    position?: number
    createdAt?: string
    updatedAt?: string
}

export interface BoardLabel {
    id: string
    name: string
    color: string
    boardId?: string
}

export interface BoardDetailResponse {
    id: string
    title: string
    description?: string
    visibility: 'PUBLIC' | 'PRIVATE' | string
    coverColor?: string
    owner?: BoardOwner
    currentUserRole?: string
    members?: BoardMember[]
    lists?: BoardList[]
    labels?: BoardLabel[]
    createdAt?: string
    updatedAt?: string
}

export interface BoardSummaryResponse {
    id: string
    title: string
    description?: string
    visibility: 'PUBLIC' | 'PRIVATE' | string
    coverColor?: string
    owner?: BoardOwner
    currentUserRole?: string
    memberCount?: number
    cardCount?: number
    createdAt?: string
    updatedAt?: string
}

export type NewBoardResponse = BoardDetailResponse;
export type BoardResponse = BoardSummaryResponse;
export type Member = BoardMember;
export type List = BoardList;
export type Label = BoardLabel;

export const createNewBoard = async (payload: BoardFormPayload): Promise<BoardDetailResponse> => {
    return await Api.post<BoardDetailResponse>("/boards", payload);
}

export const getAllBoards = async (): Promise<BoardSummaryResponse[]> => {
    return await Api.get<BoardSummaryResponse[]>("/boards");
}

export const getPublicBoards = async (): Promise<BoardSummaryResponse[]> => {
    return await Api.get<BoardSummaryResponse[]>("/boards/public");
}

export const updateBoard = async (id: string, payload: BoardFormPayload): Promise<BoardDetailResponse> => {
    return await Api.put<BoardDetailResponse>(`/boards/${id}`, payload);
}

export const deleteBoard = async (id: string) => {
    await Api.delete<void>(`/boards/${id}`);
}