import { useState } from 'react'
import { Plus, Search, Filter, LayoutGrid, List } from 'lucide-react'
import { BoardCardView } from '../components/board/BoardCardView'
import { BoardListView } from '../components/board/BoardListView'
import { BoardFormModal } from '../components/board/BoardFormModal'
import {
    useBoardsQuery,
    usePublicBoardsQuery,
    useCreateBoardMutation,
    useUpdateBoardMutation,
    useDeleteBoardMutation,
    type BoardSummaryResponse,
    type BoardFormPayload,
} from '../services/boardServices'

export const BoardsPage = () => {
    const [activeTab, setActiveTab] = useState<'All' | 'Public' | 'Mine' | 'Shared'>('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingBoard, setEditingBoard] = useState<BoardSummaryResponse | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const allBoardsQuery = useBoardsQuery()
    const publicBoardsQuery = usePublicBoardsQuery()

    const createBoardMutation = useCreateBoardMutation()
    const updateBoardMutation = useUpdateBoardMutation()
    const deleteBoardMutation = useDeleteBoardMutation()

    const rawBoards = activeTab === 'Public' ? publicBoardsQuery.data : allBoardsQuery.data
    const boards = (rawBoards || []).filter(board =>
        board.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const toggleStar = (_id: string) => {}

    const handleCreateBoard = async (newBoardData: BoardFormPayload) => {
        try {
            await createBoardMutation.mutateAsync(newBoardData)
            setIsCreateOpen(false)
        } catch (error) {
            console.error('Failed to create board:', error)
        }
    }

    const handleEditBoard = (board: BoardSummaryResponse) => {
        setEditingBoard(board)
        setIsEditOpen(true)
    }

    const handleUpdateBoard = async (updatedData: BoardFormPayload) => {
        if (!editingBoard) return
        try {
            await updateBoardMutation.mutateAsync({ id: editingBoard.id, payload: updatedData })
            setIsEditOpen(false)
            setEditingBoard(null)
        } catch (error) {
            console.error('Failed to update board:', error)
        }
    }

    const handleDeleteBoard = async (boardId: string) => {
        try {
            await deleteBoardMutation.mutateAsync(boardId)
        } catch (error) {
            console.error('Failed to delete board:', error)
        }
    }

    const tabLabels = { All: 'Tất cả', Public: 'Công khai' }

    return (
        <div className="max-w-7xl mx-auto space-y-6 text-slate-800">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bảng</h1>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Thêm bảng</span>
                </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-6 font-medium text-sm">
                    {(['All', 'Public'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative pb-3 transition-colors cursor-pointer ${activeTab === tab
                                ? 'text-blue-600 font-semibold'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            {tabLabels[tab]}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm bảng..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-48 sm:w-64 transition-all shadow-2xs"
                        />
                    </div>

                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
                        <span>Lọc</span>
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    <div className="flex items-center bg-white border border-slate-200 p-1 rounded-lg shadow-2xs gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            title="Xem dạng lưới"
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid'
                                ? 'bg-blue-50 text-blue-600 font-semibold'
                                : 'text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setViewMode('list')}
                            title="Xem dạng danh sách"
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list'
                                ? 'bg-blue-50 text-blue-600 font-semibold'
                                : 'text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <BoardCardView
                    boards={boards}
                    onToggleStar={toggleStar}
                    onCreateClick={() => setIsCreateOpen(true)}
                    onEditBoard={handleEditBoard}
                    onDeleteBoard={handleDeleteBoard}
                />
            ) : (
                <BoardListView
                    boards={boards}
                    onToggleStar={toggleStar}
                    onCreateClick={() => setIsCreateOpen(true)}
                    onEditBoard={handleEditBoard}
                    onDeleteBoard={handleDeleteBoard}
                />
            )}

            <BoardFormModal
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSubmit={handleCreateBoard}
            />

            <BoardFormModal
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSubmit={handleUpdateBoard}
                initialData={editingBoard}
                mode="edit"
            />
        </div>
    )
}
