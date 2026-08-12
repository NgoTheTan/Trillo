import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, CheckSquare2, ChevronRight, LayoutGrid, Users2, ChevronDown, Star, Lock, Globe, Crown } from 'lucide-react'
import { useQueries } from '@tanstack/react-query'
import { useBoardDetailQuery, useBoardsQuery, type BoardList, type BoardMember } from '../services/boardServices'
import { getAllListCards, useListCardsQuery, type ListCardResponse } from '../services/cardService.ts'
import { getInitials, getAvatarUrl } from '../auth/authStorage'
import { useAuth } from '../auth/authContext'

type DashboardPageProps = Readonly<{
  variant?: 'overview' | 'pm' | 'team'
}>

type StatusFilter = 'all' | 'done' | 'pending'

type DashboardListBreakdownRowProps = Readonly<{
  list: BoardList
  selectedStatus: StatusFilter
  selectedMemberIds: string[]
  boardOwnerId?: string
}>

type DashboardAnalyticsPanelProps = Readonly<{
  boardTitle: string
  boardMembers: BoardMember[]
  boardOwnerId?: string
  lists: BoardList[]
  selectedStatus: StatusFilter
  selectedMemberIds: string[]
}>

type ChartCard = ListCardResponse & { sourceListId?: string }

function matchesDashboardFilters(card: ChartCard, selectedStatus: StatusFilter, selectedMemberIds: string[]) {
  let statusMatch = true
  if (selectedStatus === 'done') {
    statusMatch = card.completed
  } else if (selectedStatus === 'pending') {
    statusMatch = !card.completed
  }

  let memberMatch = true
  if (selectedMemberIds.length > 0) {
    memberMatch = (card.assignedMembers || []).some(member => selectedMemberIds.includes(member.id))
  }

  return statusMatch && memberMatch
}

function formatDashboardDate(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', { month: 'short', day: 'numeric' }).format(date)
}

function DashboardAnalyticsPanel(props: DashboardAnalyticsPanelProps) {
  const { boardTitle, boardMembers, boardOwnerId, lists, selectedStatus, selectedMemberIds } = props

  const listCardsQueries = useQueries({
    queries: lists.map(list => ({
      queryKey: ['list-cards', list.id],
      queryFn: () => getAllListCards(list.id),
      enabled: !!list.id,
    })),
  })

  const allCards = useMemo(() => {
    return listCardsQueries.flatMap((query, index) => {
      const sourceListId = lists[index]?.id
      return (query.data ?? []).map(card => ({ ...card, sourceListId }))
    })
  }, [listCardsQueries, lists])

  const filteredCards = useMemo(() => {
    return allCards.filter(card => matchesDashboardFilters(card, selectedStatus, selectedMemberIds))
  }, [allCards, selectedMemberIds, selectedStatus])

  const loading = listCardsQueries.some(query => query.isLoading || query.isFetching)
  const totalCards = filteredCards.length
  const doneCards = filteredCards.filter(card => card.completed).length
  const pendingCards = totalCards - doneCards
  const donePercent = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0

  const memberWorkload = useMemo(() => {
    return boardMembers
      .map(member => ({
        member,
        count: filteredCards.filter(card => (card.assignedMembers || []).some(assigned => assigned.id === member.user.id)).length,
      }))
      .sort((left, right) => right.count - left.count)
  }, [boardMembers, filteredCards])

  const maxMemberWorkload = Math.max(1, ...memberWorkload.map(item => item.count))
  const displayedMembers = memberWorkload.slice(0, 6)

  const maxDeadlineDate = useMemo(() => {
    const deadlines = filteredCards
      .map(card => card.deadline ? new Date(card.deadline) : null)
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))

    if (deadlines.length === 0) return null
    return new Date(Math.max(...deadlines.map(d => d.getTime())))
  }, [filteredCards])

  const burndownSeries = useMemo(() => {
    const values = filteredCards
      .map(card => card.createdAt ? new Date(card.createdAt) : null)
      .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()))

    const now = new Date()
    const pointCount = 7
    const dayMs = 24 * 60 * 60 * 1000

    const startTime = values.length > 0
      ? Math.min(...values.map(value => value.getTime()))
      : now.getTime() - (pointCount - 1) * dayMs

    const maxDeadlineTime = maxDeadlineDate ? maxDeadlineDate.getTime() : null
    let endTime = Math.max(now.getTime(), startTime + (pointCount - 1) * dayMs)
    if (maxDeadlineTime && maxDeadlineTime > endTime) {
      endTime = maxDeadlineTime
    }

    const currentRemaining = pendingCards
    const totalTimeSpan = Math.max(1, endTime - startTime)

    return Array.from({ length: pointCount }, (_, index) => {
      const progress = index / Math.max(1, pointCount - 1)
      const timestamp = startTime + progress * totalTimeSpan
      const day = new Date(timestamp)
      const estimatedRemaining = Math.max(
        currentRemaining,
        Math.round(totalCards - ((totalCards - currentRemaining) * progress))
      )

      return {
        label: formatDashboardDate(day),
        timestamp,
        value: estimatedRemaining,
      }
    })
  }, [filteredCards, pendingCards, totalCards, maxDeadlineDate])

  const burndownMax = Math.max(1, ...burndownSeries.map(point => point.value))
  const chartWidth = 320
  const chartHeight = 140
  const chartPadding = 16
  const chartPoints = burndownSeries.map((point, index) => {
    const x = chartPadding + ((chartWidth - chartPadding * 2) * (burndownSeries.length <= 1 ? 0 : index / (burndownSeries.length - 1)))
    const y = chartPadding + ((chartHeight - chartPadding * 2) * (1 - (point.value / burndownMax)))
    return { ...point, x, y }
  })

  const finalDeadlineX = useMemo(() => {
    if (!maxDeadlineDate || burndownSeries.length < 2) return null
    const firstTime = burndownSeries[0].timestamp
    const lastTime = burndownSeries.at(-1)!.timestamp
    if (lastTime <= firstTime) return null

    const deadlineTime = maxDeadlineDate.getTime()
    const ratio = Math.max(0, Math.min(1, (deadlineTime - firstTime) / (lastTime - firstTime)))
    return chartPadding + (chartWidth - chartPadding * 2) * ratio
  }, [maxDeadlineDate, burndownSeries])

  const burndownPath = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const burndownAreaPath = [
    `M ${chartPoints[0]?.x ?? chartPadding} ${chartHeight - chartPadding}`,
    ...chartPoints.map(point => `L ${point.x} ${point.y}`),
    `L ${chartPoints.at(-1)?.x ?? chartWidth - chartPadding} ${chartHeight - chartPadding}`,
    'Z',
  ].join(' ')

  if (loading && totalCards === 0) {
    return <div className="dashboard-breakdown-loading">Đang tải biểu đồ...</div>
  }

  return (
    <section className="dashboard-analytics">
      <div className="dashboard-analytics__header">
        <div>
          <p className="panel__title">Biểu đồ</p>
          <p className="panel__subtitle">
            Burndown được ước tính từ ngày tạo thẻ và trạng thái hoàn thành hiện tại cho {boardTitle}.
          </p>
        </div>
        <span className="dashboard-analytics__hint">Thẻ đã lọc: {totalCards}</span>
      </div>

      <div className="dashboard-analytics-grid">
        <article className="dashboard-chart-card dashboard-chart-card--wide">
          <div className="dashboard-chart-card__header">
            <div>
              <p className="dashboard-chart-card__eyebrow">Burndown</p>
              <h3 className="dashboard-chart-card__title">Ước tính công việc còn lại</h3>
            </div>
            <span className="dashboard-chart-card__badge">{pendingCards} đang mở</span>
          </div>

          <div className="dashboard-burndown-chart">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Estimated burndown chart">
              <defs>
                <linearGradient id="burndownFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0b5bd3" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0b5bd3" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={burndownAreaPath} fill="url(#burndownFill)" />
              <path d={burndownPath} fill="none" stroke="#0b5bd3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {chartPoints.map((point, i) => (
                <circle key={point.label + i} cx={point.x} cy={point.y} r="4" fill="#0b5bd3" />
              ))}

              {/* Red Line for Final Deadline */}
              {finalDeadlineX !== null && (
                <g key="final-deadline">
                  <line
                    x1={finalDeadlineX}
                    y1={chartPadding}
                    x2={finalDeadlineX}
                    y2={chartHeight - chartPadding}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  <circle cx={finalDeadlineX} cy={chartPadding} r="4" fill="#ef4444" />
                </g>
              )}
            </svg>
            <div className="dashboard-burndown-chart__axis">
              {burndownSeries.map((point, i) => (
                <span key={point.label + i}>{point.label}</span>
              ))}
            </div>
          </div>

          <div className="dashboard-chart-card__footnote flex items-center justify-between flex-wrap gap-2">
            <span>Bắt đầu từ tổng số thẻ và giảm dần theo số thẻ đang chờ.</span>
            {maxDeadlineDate && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                Hạn cuối: {formatDashboardDate(maxDeadlineDate)}
              </span>
            )}
          </div>
        </article>

        <article className="dashboard-chart-card">
          <div className="dashboard-chart-card__header">
            <div>
              <p className="dashboard-chart-card__eyebrow">Khối lượng công việc</p>
              <h3 className="dashboard-chart-card__title">Thẻ theo thành viên</h3>
            </div>
            <span className="dashboard-chart-card__badge">Top {displayedMembers.length}</span>
          </div>

          <div className="dashboard-bar-chart">
            {displayedMembers.length === 0 && <div className="dashboard-breakdown-row__empty">Không có dữ liệu khối lượng công việc.</div>}
            {displayedMembers.map(item => {
              const width = Math.round((item.count / maxMemberWorkload) * 100)
              const avatarSrc = getAvatarUrl(item.member.user.avatarUrl)
              const isOwner = item.member.role === 'OWNER' || item.member.user.id === boardOwnerId
              return (
                <div key={item.member.id} className="dashboard-bar-chart__row">
                  <div className="dashboard-bar-chart__label">
                    <div className="relative shrink-0 flex items-center justify-center">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={item.member.user.fullName} />
                      ) : (
                        <span>{getInitials(item.member.user.fullName)}</span>
                      )}
                      {isOwner && (
                        <span
                          className="owner-star-badge absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 !bg-amber-400 !text-amber-950 rounded-full flex items-center justify-center ring-1 ring-white shadow-xs z-10"
                          title="Chủ sở hữu"
                        >
                          <Star className="w-2 h-2 fill-amber-950 stroke-none" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p>{item.member.user.fullName}</p>
                      <span>{item.count} thẻ</span>
                    </div>
                  </div>
                  <div className="dashboard-bar-chart__track">
                    <span className="dashboard-bar-chart__fill" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="dashboard-chart-card">
          <div className="dashboard-chart-card__header">
            <div>
              <p className="dashboard-chart-card__eyebrow">Trạng thái</p>
              <h3 className="dashboard-chart-card__title">Phân bố thẻ</h3>
            </div>
            <span className="dashboard-chart-card__badge">{donePercent}% hoàn thành</span>
          </div>

          <div className="dashboard-donut-chart">
            <div
              className="dashboard-donut-chart__ring"
              style={{ background: `conic-gradient(#0b5bd3 0 ${donePercent}%, #f59e0b ${donePercent}% 100%)` }}
            >
              <div className="dashboard-donut-chart__center">
                <span>{totalCards}</span>
                <small>thẻ</small>
              </div>
            </div>
            <div className="dashboard-donut-chart__legend">
              <span><i className="is-done" /> Hoàn thành {doneCards}</span>
              <span><i className="is-pending" /> Đang chờ {pendingCards}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}

function DashboardListBreakdownRow(props: DashboardListBreakdownRowProps) {
  const { list, selectedStatus, selectedMemberIds, boardOwnerId } = props
  const { data: cards = [], isLoading } = useListCardsQuery(list.id)

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      let statusMatch = true
      if (selectedStatus === 'done') {
        statusMatch = card.completed
      } else if (selectedStatus === 'pending') {
        statusMatch = !card.completed
      }

      let memberMatch = true
      if (selectedMemberIds.length > 0) {
        memberMatch = (card.assignedMembers || []).some(member => selectedMemberIds.includes(member.id))
      }

      return statusMatch && memberMatch
    })
  }, [cards, selectedMemberIds, selectedStatus])

  const doneCount = cards.filter(card => card.completed).length
  const pendingCount = cards.length - doneCount

  return (
    <article className="dashboard-breakdown-row">
      <div className="dashboard-breakdown-row__header">
        <div>
          <p className="dashboard-breakdown-row__title">{list.title}</p>
          <p className="dashboard-breakdown-row__subtitle">
            {cards.length} thẻ • {doneCount} hoàn thành • {pendingCount} đang chờ
          </p>
        </div>
        <span className="dashboard-breakdown-row__badge">{filteredCards.length} kết quả</span>
      </div>

      <div className="dashboard-breakdown-row__metrics">
        <span>Tất cả: {cards.length}</span>
        <span>Hoàn thành: {doneCount}</span>
        <span>Đang chờ: {pendingCount}</span>
      </div>

      <div className="dashboard-breakdown-row__cards">
        {isLoading && <div className="dashboard-breakdown-row__loading">Đang tải danh sách thẻ...</div>}
        {!isLoading && filteredCards.length === 0 && (
          <div className="dashboard-breakdown-row__empty">Không có thẻ khớp bộ lọc.</div>
        )}
        {!isLoading && filteredCards.slice(0, 4).map(card => (
          <div key={card.id} className="dashboard-card-mini">
            <div className="dashboard-card-mini__top">
              <span className={`dashboard-card-mini__status ${card.completed ? 'is-done' : 'is-pending'}`}>
                {card.completed ? 'Hoàn thành' : 'Đang chờ'}
              </span>
              <span className="dashboard-card-mini__deadline">
                {card.deadline ? new Date(card.deadline).toLocaleDateString('vi-VN') : 'Không có hạn'}
              </span>
            </div>
            <p className="dashboard-card-mini__title">{card.title}</p>
            <div className="dashboard-card-mini__members">
              {(card.assignedMembers || []).slice(0, 3).map(member => {
                const avatarSrc = getAvatarUrl(member.avatarUrl)
                const isOwner = member.id === boardOwnerId
                return (
                  <span key={member.id} className="dashboard-card-mini__member relative" title={`${member.fullName}${isOwner ? ' (Chủ sở hữu)' : ''}`}>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={member.fullName} />
                    ) : (
                      <span>{getInitials(member.fullName)}</span>
                    )}
                    {isOwner && (
                      <span
                        className="owner-star-badge absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 !bg-amber-400 !text-amber-950 rounded-full flex items-center justify-center ring-1 ring-white shadow-xs z-10"
                        title="Chủ sở hữu"
                      >
                        <Star className="w-2 h-2 fill-amber-950 stroke-none" />
                      </span>
                    )}
                  </span>
                )
              })}
              {(card.assignedMembers || []).length > 3 && (
                <span className="dashboard-card-mini__more">+{(card.assignedMembers || []).length - 3}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

export function DashboardPage({
  variant = 'overview',
}: DashboardPageProps) {
  const navigate = useNavigate()
  const boardsQuery = useBoardsQuery()
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const { user: currentUser } = useAuth()
  const boards = useMemo(
    () =>
      [...(boardsQuery.data ?? [])]
        .filter(board => board.currentUserRole === 'OWNER' || (currentUser?.id && board.owner?.id === currentUser.id))
        .sort((left, right) => {
          const leftCards = left.cardCount ?? 0
          const rightCards = right.cardCount ?? 0
          if (rightCards !== leftCards) return rightCards - leftCards

          const leftMembers = left.memberCount ?? 0
          const rightMembers = right.memberCount ?? 0
          return rightMembers - leftMembers
        }),
    [boardsQuery.data, currentUser?.id]
  )

  const totalBoards = boards.length
  const totalUniqueMembers = useMemo(() => {
    const memberSet = new Set<string>()
    boards.forEach(board => {
      if (board.memberUserIds && board.memberUserIds.length > 0) {
        board.memberUserIds.forEach(id => memberSet.add(id))
      }
    })
    if (memberSet.size > 0) return memberSet.size
    return boards.reduce((sum, board) => sum + (board.memberCount ?? 0), 0)
  }, [boards])
  const totalCards = boards.reduce((sum, board) => sum + (board.cardCount ?? 0), 0)
  const averageCardsPerBoard = totalBoards > 0 ? totalCards / totalBoards : 0
  const busiestBoard = boards[0]
  const maxCards = Math.max(1, ...boards.map(board => board.cardCount ?? 0))
  const selectedBoard = selectedBoardId || boards[0]?.id || ''
  let selectedStatusLabel = 'Tất cả'
  if (selectedStatus === 'done') {
    selectedStatusLabel = 'Hoàn thành'
  } else if (selectedStatus === 'pending') {
    selectedStatusLabel = 'Đang chờ'
  }
  const boardDetailQuery = useBoardDetailQuery(selectedBoard || undefined)
  const boardDetail = boardDetailQuery.data

  useEffect(() => {
    if (boards.length === 0) {
      if (selectedBoardId) setSelectedBoardId('')
      return
    }

    if (!selectedBoardId || !boards.some(board => board.id === selectedBoardId)) {
      setSelectedBoardId(boards[0].id)
    }
  }, [boards, selectedBoardId])

  useEffect(() => {
    setSelectedMemberIds([])
    setSelectedStatus('all')
  }, [selectedBoardId])

  const variantCopy = {
    overview: {
      eyebrow: 'Tổng quan không gian làm việc',
      title: 'Bảng do bạn sở hữu',
      subtitle: 'Theo dõi tải lượng bảng, thành viên và các thẻ trong một trang (chỉ hiển thị các bảng do bạn làm chủ sở hữu).',
      action: 'Xem danh sách bảng',
    },
    pm: {
      eyebrow: 'Trung tâm PM',
      title: 'Tổng quan quyền sở hữu và khối lượng',
      subtitle: 'Xem các bảng do bạn làm chủ sở hữu cần chú ý, thành viên phân bố ở đâu và cách các thẻ được phân phối.',
      action: 'Xem xét bảng',
    },
    team: {
      eyebrow: 'Không gian làm việc nhóm',
      title: 'Snapshot năng lực nhóm',
      subtitle: 'Hiểu kích thước bảng, mật độ cộng tác và nơi công việc tập trung trên các bảng bạn sở hữu.',
      action: 'Chuyển đến bảng',
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
          <p className="dashboard-eyebrow">Đang tải bảng...</p>
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
            <p className="dashboard-eyebrow">Không thể tải bảng điều khiển</p>
            <h2 className="dashboard-empty-state__title">Không thể tải bảng công việc.</h2>
            <p className="dashboard-empty-state__copy">
              Hãy làm mới trang hoặc thử lại từ màn hình bảng.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            <button type="button" className="secondary-button" onClick={() => boardsQuery.refetch()}>
              Thử lại <ArrowRight size={16} />
            </button>
            <button type="button" className="secondary-button" onClick={handleNavigateToBoards}>
              Xem bảng <ChevronRight size={16} />
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
            <p className="dashboard-eyebrow">Dành riêng cho chủ sở hữu bảng</p>
            <h2 className="dashboard-empty-state__title">Bạn chưa làm chủ sở hữu bảng nào.</h2>
            <p className="dashboard-empty-state__copy">
              Tính năng bảng điều khiển trang chủ chỉ hỗ trợ và hiển thị phân tích cho các bảng do bạn trực tiếp sở hữu (Owner). Các bảng bạn chỉ tham gia với vai trò thành viên sẽ không được thống kê tại đây. Hãy tạo bảng mới để mở khoá tính năng này.
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={handleNavigateToBoards}>
            Đi đến bảng công việc <ArrowRight size={16} />
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
                {variantCopy.subtitle}
              </p>
            </div>
            <button type="button" className="secondary-button" onClick={handleNavigateToBoards}>
              {variantCopy.action} <ChevronRight size={16} />
            </button>
          </div>

          <div className="dashboard-hero__meta">
            <span className="dashboard-chip">
              <LayoutGrid size={14} />
              {formatCount(totalBoards)} bảng sở hữu
            </span>
            <span className="dashboard-chip dashboard-chip--soft">
              <Users2 size={14} />
              {formatCount(totalUniqueMembers)} thành viên
            </span>
            <span className="dashboard-chip dashboard-chip--soft">
              <CheckSquare2 size={14} />
              {formatCount(totalCards)} thẻ
            </span>
            <span className="dashboard-chip dashboard-chip--soft" title="Chỉ hiển thị dữ liệu cho các bảng mà bạn làm chủ sở hữu (Owner)">
              <Crown size={14} />
              Chỉ chủ sở hữu
            </span>
          </div>
        </div>

        <div className="dashboard-hero__insight">
          <p className="dashboard-insight__label">Bảng hoạt động nhất</p>
          <h2 className="dashboard-insight__title">
            {busiestBoard?.title ?? 'Chưa có bảng'}
          </h2>
          <p className="dashboard-insight__copy">
            {busiestBoard
              ? `${formatCount(busiestBoard.cardCount ?? 0)} thẻ, ${formatCount(busiestBoard.memberCount ?? 0)} thành viên`
              : 'Tạo bảng để xem bảng bận rộn nhất tại đây.'}
          </p>

          <div className="dashboard-insight__stats">
            <div>
              <span className="dashboard-insight__value">{formatCount(totalBoards)}</span>
              <span className="dashboard-insight__text">Bảng đang theo dõi</span>
            </div>
            <div>
              <span className="dashboard-insight__value">{averageCardsPerBoard.toFixed(1)}</span>
              <span className="dashboard-insight__text">Thẻ / bảng</span>
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
          <p className="stat-card__label">Tổng số bảng</p>
        </article>
        <article className="stat-card dashboard-stat-card">
          <div className="dashboard-stat-card__icon dashboard-stat-card__icon--cyan">
            <Users2 size={18} />
          </div>
          <p className="stat-card__value">{formatCount(totalUniqueMembers)}</p>
          <p className="stat-card__label">Tổng số thành viên</p>
        </article>
        <article className="stat-card dashboard-stat-card">
          <div className="dashboard-stat-card__icon dashboard-stat-card__icon--emerald">
            <CheckSquare2 size={18} />
          </div>
          <p className="stat-card__value">{formatCount(totalCards)}</p>
          <p className="stat-card__label">Tổng số thẻ</p>
        </article>
        <article className="stat-card dashboard-stat-card">
          <div className="dashboard-stat-card__icon dashboard-stat-card__icon--amber">
            <BarChart3 size={18} />
          </div>
          <p className="stat-card__value">{averageCardsPerBoard.toFixed(1)}</p>
          <p className="stat-card__label">Trung bình thẻ mỗi bảng</p>
        </article>
      </div>

      <div className="dashboard-section-head">
        <div>
          <p className="panel__title">Các bảng công việc do bạn sở hữu</p>
          <p className="panel__subtitle">Chỉ hiển thị các bảng do bạn làm chủ sở hữu (Owner). Bạn phải sở hữu bảng mới có tính năng theo dõi và phân tích này.</p>
        </div>
        <button type="button" className="secondary-button" onClick={handleNavigateToBoards}>
          Quản lý bảng <ArrowRight size={16} />
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
                      {board.description || 'Chưa có mô tả. Hãy thêm mô tả ngắn gọn cho bảng này.'}
                    </p>
                  </div>
                  {board.visibility === 'PRIVATE' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Riêng tư
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
                      <Globe className="w-3 h-3 text-emerald-600" />
                      Công khai
                    </span>
                  )}
                </div>

                <div className="dashboard-board-card__stats">
                  <div>
                    <span className="dashboard-board-card__value">{formatCount(boardMembers)}</span>
                    <span className="dashboard-board-card__label">Thành viên</span>
                  </div>
                  <div>
                    <span className="dashboard-board-card__value">{formatCount(boardCards)}</span>
                    <span className="dashboard-board-card__label">Thẻ</span>
                  </div>
                  <div>
                    <span className="dashboard-board-card__value">{membersPerCard}</span>
                    <span className="dashboard-board-card__label">TV / thẻ</span>
                  </div>
                </div>

                <div className="dashboard-board-card__progress">
                  <div className="dashboard-board-card__progress-head">
                    <span>Tải lượng</span>
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

      <div className="dashboard-explorer" style={{ marginTop: '24px' }}>
        <div className="dashboard-section-head dashboard-section-head--compact">
          <div>
            <p className="panel__title">Khám phá thống kê</p>
            <p className="panel__subtitle">Lọc bảng theo trạng thái và thành viên, sau đó xem danh sách thẻ phù hợp.</p>
          </div>

          <label className="dashboard-board-picker">
            <span>Bảng</span>
            <div className="dashboard-board-picker__select-wrap">
              <select
                value={selectedBoard}
                onChange={e => setSelectedBoardId(e.target.value)}
                className="dashboard-board-picker__select"
              >
                {boards.map(board => (
                  <option key={board.id} value={board.id}>{board.title}</option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </label>
        </div>

        {boardDetailQuery.isLoading && (
          <div className="dashboard-breakdown-loading">Đang tải thống kê bảng...</div>
        )}

        {boardDetail && !boardDetailQuery.isLoading && (
          <div className="dashboard-explorer__panel">
            <div className="dashboard-filter-bar">
              <div className="dashboard-filter-group">
                <span className="dashboard-filter-group__label">Trạng thái</span>
                {([
                  { id: 'all', label: 'Tất cả' },
                  { id: 'done', label: 'Hoàn thành' },
                  { id: 'pending', label: 'Đang chờ' },
                ] as const).map(filter => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSelectedStatus(filter.id)}
                    className={`dashboard-filter-pill ${selectedStatus === filter.id ? 'is-active' : ''}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="dashboard-filter-group dashboard-filter-group--members">
                <span className="dashboard-filter-group__label">Thành viên</span>
                <div className="dashboard-member-filter-row">
                  {boardDetail.members.map((member: BoardMember) => {
                    const isSelected = selectedMemberIds.includes(member.user.id)
                    const avatarSrc = getAvatarUrl(member.user.avatarUrl)
                    const isOwner = member.role === 'OWNER' || member.user.id === boardDetail.owner?.id
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberIds(prev => (
                            prev.includes(member.user.id)
                              ? prev.filter(id => id !== member.user.id)
                              : [...prev, member.user.id]
                          ))
                        }}
                        className={`dashboard-member-pill ${isSelected ? 'is-active' : ''}`}
                      >
                        <div className="relative shrink-0 flex items-center justify-center">
                          {avatarSrc ? (
                            <img src={avatarSrc} alt={member.user.fullName} />
                          ) : (
                            <span>{getInitials(member.user.fullName)}</span>
                          )}
                          {isOwner && (
                            <span
                              className="owner-star-badge absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 !bg-amber-400 !text-amber-950 rounded-full flex items-center justify-center ring-1 ring-white shadow-xs z-10"
                              title="Chủ sở hữu"
                            >
                              <Star className="w-2 h-2 fill-amber-950 stroke-none" />
                            </span>
                          )}
                        </div>
                        {member.user.fullName}
                      </button>
                    )
                  })}
                  {selectedMemberIds.length > 0 && (
                    <button type="button" className="dashboard-clear-pill" onClick={() => setSelectedMemberIds([])}>
                      Xóa thành viên
                    </button>
                  )}
                </div>
              </div>
            </div>

            <DashboardAnalyticsPanel
              boardTitle={boardDetail.title}
              boardMembers={boardDetail.members}
              boardOwnerId={boardDetail.owner?.id}
              lists={boardDetail.lists}
              selectedStatus={selectedStatus}
              selectedMemberIds={selectedMemberIds}
            />

            <div className="dashboard-breakdown-summary">
              <div>
                <span className="dashboard-breakdown-summary__value">{boardDetail.lists.length}</span>
                <span className="dashboard-breakdown-summary__label">Danh sách</span>
              </div>
              <div>
                <span className="dashboard-breakdown-summary__value">{boardDetail.members.length}</span>
                <span className="dashboard-breakdown-summary__label">Thành viên</span>
              </div>
              <div>
                <span className="dashboard-breakdown-summary__value">{selectedStatusLabel}</span>
                <span className="dashboard-breakdown-summary__label">Bộ lọc</span>
              </div>
            </div>

            <div className="dashboard-breakdown-list">
              {boardDetail.lists.map(list => (
                <DashboardListBreakdownRow
                  key={list.id}
                  list={list}
                  selectedStatus={selectedStatus}
                  selectedMemberIds={selectedMemberIds}
                />
              ))}
            </div>
          </div>
        )}

        {!boardDetailQuery.isLoading && !boardDetail && (
          <div className="dashboard-breakdown-loading">Chọn một bảng để xem thống kê danh sách.</div>
        )}
      </div>

    </section>
  )
}