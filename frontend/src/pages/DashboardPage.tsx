import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, CheckSquare2, ChevronRight, CircleDot, LayoutGrid, Rocket, Users2 } from 'lucide-react'
import { useBoardsQuery } from '../services/boardServices'

type DashboardPageProps = Readonly<{
  variant?: 'overview' | 'pm' | 'team'
}>

export function DashboardPage({
  variant = 'overview',
}: DashboardPageProps) {
  const navigate = useNavigate()
  const boardsQuery = useBoardsQuery()

  const boards = useMemo(
    () => [...(boardsQuery.data ?? [])].sort((left, right) => {
      const leftCards = left.cardCount ?? 0
      const rightCards = right.cardCount ?? 0
      if (rightCards !== leftCards) return rightCards - leftCards

      const leftMembers = left.memberCount ?? 0
      const rightMembers = right.memberCount ?? 0
      return rightMembers - leftMembers
    }),
    [boardsQuery.data]
  )

  const totalBoards = boards.length
  const totalMembers = boards.reduce((sum, board) => sum + (board.memberCount ?? 0), 0)
  const totalCards = boards.reduce((sum, board) => sum + (board.cardCount ?? 0), 0)
  const averageCardsPerBoard = totalBoards > 0 ? totalCards / totalBoards : 0
  const busiestBoard = boards[0]
  const maxCards = Math.max(1, ...boards.map(board => board.cardCount ?? 0))

  const variantCopy = {
    overview: {
      eyebrow: 'Workspace overview',
      title: 'Your boards at a glance',
      subtitle: 'Track board load, members, and cards in one Trello-style control room.',
      action: 'Open boards',
    },
    pm: {
      eyebrow: 'PM control center',
      title: 'Ownership and workload overview',
      subtitle: 'See which boards need attention, where members are spread, and how cards are distributed.',
      action: 'Review boards',
    },
    team: {
      eyebrow: 'Team workspace',
      title: 'Team capacity snapshot',
      subtitle: 'Understand board size, collaboration density, and where work is concentrated.',
      action: 'Jump to boards',
    },
  }[variant]

  const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value)

  const handleNavigateToBoards = () => {
    navigate('/app/boards')
  }

  if (boardsQuery.isLoading) {
    return (
      <section className="panel dashboard-page" style={{ marginTop: '24px' }}>
        <div className="dashboard-hero dashboard-hero--loading">
          <p className="dashboard-eyebrow">Loading boards</p>
          <div className="dashboard-loading-line dashboard-loading-line--title" />
          <div className="dashboard-loading-line dashboard-loading-line--copy" />
        </div>
      </section>
    )
  }

  if (boardsQuery.isError) {
    return (
      <section className="panel dashboard-page" style={{ marginTop: '24px' }}>
        <div className="dashboard-empty-state">
          <div>
            <p className="dashboard-eyebrow">Dashboard unavailable</p>
            <h2 className="dashboard-empty-state__title">We could not load your boards.</h2>
            <p className="dashboard-empty-state__copy">
              Refresh the page or try again from the boards screen.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            <button type="button" className="secondary-button" onClick={() => boardsQuery.refetch()}>
              Retry <ArrowRight size={16} />
            </button>
            <button type="button" className="secondary-button" onClick={handleNavigateToBoards}>
              Open boards <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (boards.length === 0) {
    return (
      <section className="panel dashboard-page" style={{ marginTop: '24px' }}>
        <div className="dashboard-empty-state">
          <div>
            <p className="dashboard-eyebrow">No boards yet</p>
            <h2 className="dashboard-empty-state__title">Create your first board to unlock the dashboard.</h2>
            <p className="dashboard-empty-state__copy">
              Once boards exist, this page will show total boards, member counts, card counts, and board load.
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={handleNavigateToBoards}>
            Go to boards <ArrowRight size={16} />
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="panel dashboard-page" style={{ marginTop: '24px' }}>
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <p className="dashboard-eyebrow">{variantCopy.eyebrow}</p>
          <div className="dashboard-title-row">
            <div>
              <h1 className="dashboard-title">{variantCopy.title}</h1>
              <p className="dashboard-subtitle">
                {variant === 'overview'
                  ? 'Signed-in users land here first, so this screen should answer the two fastest questions: how many boards exist, and where is the workload concentrated?'
                  : variantCopy.subtitle}
              </p>
            </div>
            <button type="button" className="secondary-button" onClick={handleNavigateToBoards}>
              {variantCopy.action} <ChevronRight size={16} />
            </button>
          </div>

          <div className="dashboard-hero__meta">
            <span className="dashboard-chip">
              <LayoutGrid size={14} />
              {formatCount(totalBoards)} boards
            </span>
            <span className="dashboard-chip dashboard-chip--soft">
              <Users2 size={14} />
              {formatCount(totalMembers)} members
            </span>
            <span className="dashboard-chip dashboard-chip--soft">
              <CheckSquare2 size={14} />
              {formatCount(totalCards)} cards
            </span>
          </div>
        </div>

        <div className="dashboard-hero__insight">
          <p className="dashboard-insight__label">Most active board</p>
          <h2 className="dashboard-insight__title">
            {busiestBoard?.title ?? 'No board yet'}
          </h2>
          <p className="dashboard-insight__copy">
            {busiestBoard
              ? `${formatCount(busiestBoard.cardCount ?? 0)} cards, ${formatCount(busiestBoard.memberCount ?? 0)} members`
              : 'Create boards to see your busiest one here.'}
          </p>

          <div className="dashboard-insight__stats">
            <div>
              <span className="dashboard-insight__value">{formatCount(totalBoards)}</span>
              <span className="dashboard-insight__text">Boards tracked</span>
            </div>
            <div>
              <span className="dashboard-insight__value">{averageCardsPerBoard.toFixed(1)}</span>
              <span className="dashboard-insight__text">Cards / board</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid dashboard-stats-grid" style={{ marginTop: '24px' }}>
        <article className="stat-card dashboard-stat-card">
          <div className="dashboard-stat-card__icon dashboard-stat-card__icon--blue">
            <LayoutGrid size={18} />
          </div>
          <p className="stat-card__value">{formatCount(totalBoards)}</p>
          <p className="stat-card__label">Total boards</p>
        </article>
        <article className="stat-card dashboard-stat-card">
          <div className="dashboard-stat-card__icon dashboard-stat-card__icon--cyan">
            <Users2 size={18} />
          </div>
          <p className="stat-card__value">{formatCount(totalMembers)}</p>
          <p className="stat-card__label">Total members across boards</p>
        </article>
        <article className="stat-card dashboard-stat-card">
          <div className="dashboard-stat-card__icon dashboard-stat-card__icon--emerald">
            <CheckSquare2 size={18} />
          </div>
          <p className="stat-card__value">{formatCount(totalCards)}</p>
          <p className="stat-card__label">Total cards</p>
        </article>
        <article className="stat-card dashboard-stat-card">
          <div className="dashboard-stat-card__icon dashboard-stat-card__icon--amber">
            <BarChart3 size={18} />
          </div>
          <p className="stat-card__value">{averageCardsPerBoard.toFixed(1)}</p>
          <p className="stat-card__label">Average cards per board</p>
        </article>
      </div>

      <div className="dashboard-section-head">
        <div>
          <p className="panel__title">Boards at a glance</p>
          <p className="panel__subtitle">Each card below shows the board size, member count, and relative workload.</p>
        </div>
        <button type="button" className="secondary-button" onClick={handleNavigateToBoards}>
          Manage boards <ArrowRight size={16} />
        </button>
      </div>

      <div className="dashboard-board-grid" style={{ marginTop: '20px' }}>
        {boards.map(board => {
          const boardCards = board.cardCount ?? 0
          const boardMembers = board.memberCount ?? 0
          const boardLoad = Math.round((boardCards / maxCards) * 100)
          const membersPerCard = boardCards > 0 ? (boardMembers / boardCards).toFixed(1) : '0.0'
          const isHex = board.coverColor?.startsWith('#')
          const coverStyle = isHex ? { backgroundColor: board.coverColor } : undefined
          const coverClass = !isHex && board.coverColor ? board.coverColor : ''

          return (
            <button
              key={board.id}
              type="button"
              onClick={() => navigate(`/app/boards/${board.id}`)}
              className="dashboard-board-card"
            >
              <div className="dashboard-board-card__cover" style={coverStyle}>
                <span className={`dashboard-board-card__cover-dot ${coverClass}`} />
              </div>

              <div className="dashboard-board-card__body">
                <div className="dashboard-board-card__header">
                  <div>
                    <h3 className="dashboard-board-card__title">{board.title}</h3>
                    <p className="dashboard-board-card__subtitle">
                      {board.description || 'No description yet. Add a short purpose statement for this board.'}
                    </p>
                  </div>
                  <span className="dashboard-board-card__badge">{board.visibility || 'PUBLIC'}</span>
                </div>

                <div className="dashboard-board-card__stats">
                  <div>
                    <span className="dashboard-board-card__value">{formatCount(boardMembers)}</span>
                    <span className="dashboard-board-card__label">Members</span>
                  </div>
                  <div>
                    <span className="dashboard-board-card__value">{formatCount(boardCards)}</span>
                    <span className="dashboard-board-card__label">Cards</span>
                  </div>
                  <div>
                    <span className="dashboard-board-card__value">{membersPerCard}</span>
                    <span className="dashboard-board-card__label">Members / card</span>
                  </div>
                </div>

                <div className="dashboard-board-card__progress">
                  <div className="dashboard-board-card__progress-head">
                    <span>Board load</span>
                    <span>{boardLoad}%</span>
                  </div>
                  <div className="dashboard-board-card__bar">
                    <span
                      className="dashboard-board-card__bar-fill"
                      style={{ width: `${boardLoad}%` }}
                    />
                  </div>
                </div>
              </div>

              <ChevronRight className="dashboard-board-card__chevron" size={18} />
            </button>
          )
        })}
      </div>

      <div className="task-list dashboard-note-list" style={{ marginTop: '24px' }}>
        <div className="task-item">
          <div>
            <p className="task-item__title">Counts are pulled from board summary data</p>
            <p className="task-item__meta">The dashboard reuses existing member and card counts from the boards API.</p>
          </div>
          <CircleDot size={18} />
        </div>
        <div className="task-item">
          <div>
            <p className="task-item__title">Workload sorted by card volume</p>
            <p className="task-item__meta">The busiest board appears first so the heaviest board is visible immediately.</p>
          </div>
          <Rocket size={18} />
        </div>
      </div>
    </section>
  )
}