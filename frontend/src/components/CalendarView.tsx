import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import viLocale from '@fullcalendar/core/locales/vi';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

export default function CalendarView() {
  const navigate = useNavigate();
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [activeView, setActiveView] = useState('dayGridMonth');
  const [isShowingToday, setIsShowingToday] = useState(true);

  useEffect(() => {
    const fetchCalendarData = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      const token = localStorage.getItem('token'); 
      
      if (!token) {
        setErrorMsg("Bạn chưa đăng nhập hoặc thiếu Token xác thực.");
        setIsLoading(false);
        return;
      }

      try {
        const fromDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString();
        const toDate = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString();

        const boardsResponse = await axios.get('http://localhost:8080/api/boards', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const boards = boardsResponse.data;

        if (!Array.isArray(boards) || boards.length === 0) {
          setEvents([]);
          setIsLoading(false);
          return;
        }

        const calendarPromises = boards.map((board: any) => 
          axios.get(`http://localhost:8080/api/boards/${board.id}/calendar`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { from: fromDate, to: toDate }
          })
          .then(res => (Array.isArray(res.data) ? res.data.map(card => ({ ...card, boardId: board.id })) : []))
          .catch(err => {
            console.error(`Lỗi lấy lịch của board ${board.id}:`, err);
            return []; 
          })
        );

        const allBoardsData = await Promise.all(calendarPromises);

        const combinedEvents = allBoardsData.flat().map((card: any) => {
          // Dùng màu nhãn đầu tiên nếu có, ngược lại dùng màu mặc định
          let eventColor = '#2563eb';
          if (card.labels && card.labels.length > 0 && card.labels[0].color) {
            eventColor = card.labels[0].color;
          }

          return {
            id: card.id,
            title: card.title || 'Chưa có tiêu đề',
            start: card.deadline,
            allDay: false,
            backgroundColor: eventColor,
            borderColor: eventColor,
            extendedProps: { card }
          };
        });

        setEvents(combinedEvents);

      } catch (error: any) {
        console.error("Lỗi API:", error);
        setErrorMsg("Lỗi khi tải dữ liệu lịch tổng. Vui lòng thử lại.");
        setEvents([]); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, []);

  const handleDateClick = (info: any) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (activeView === 'multiMonthYear') {
        calendarApi.changeView('dayGridMonth', info.dateStr);
      } else if (activeView === 'dayGridMonth' || activeView === 'timeGridWeek') {
        calendarApi.changeView('timeGridDay', info.dateStr);
      }
    }
  };

  const handleEventClick = (info: any) => {
    const cardData = info.event.extendedProps?.card;
    if (cardData?.boardId) {
      navigate(`/app/boards/${cardData.boardId}`);
    }
  };

  const handleDatesSet = (arg: any) => {
    setCurrentTitle(arg.view.title);
    setActiveView(arg.view.type);

    const now = new Date();
    const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startMs = new Date(arg.view.activeStart).getTime();
    const endMs = new Date(arg.view.activeEnd).getTime();
    const isTodayInView = todayMs >= startMs && todayMs < endMs;
    setIsShowingToday(isTodayInView);
  };

  const handlePrev = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().prev();
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().next();
    }
  };

  const handleToday = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
    }
  };

  const handleChangeView = (viewName: string) => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(viewName);
    }
  };

  const viewButtons = [
    { id: 'dayGridMonth', label: 'Tháng' },
    { id: 'timeGridWeek', label: 'Tuần' },
    { id: 'timeGridDay', label: 'Ngày' },
    { id: 'multiMonthYear', label: 'Năm' },
  ];

  return (
    <div className="flex flex-col h-full relative space-y-4">
      <style>{`
        .fc { font-family: inherit; --fc-border-color: #e2e8f0; --fc-button-bg-color: #2563eb; --fc-button-border-color: #2563eb; --fc-button-hover-bg-color: #1d4ed8; --fc-button-hover-border-color: #1d4ed8; --fc-button-active-bg-color: #1e40af; --fc-today-bg-color: #eff6ff; --fc-event-bg-color: #2563eb; --fc-event-border-color: #2563eb; }
        .fc-scrollgrid { border-radius: 1rem !important; overflow: hidden; border: 1px solid #e2e8f0 !important; background-color: #ffffff; }
      `}</style>

      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-white p-4 rounded-lg shadow-lg border border-slate-200 text-sm font-medium text-slate-700">
          ⏳ Đang tải dữ liệu lịch...
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3.5 rounded-xl text-sm font-medium flex justify-between items-center">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 cursor-pointer">✕</button>
        </div>
      )}

      {/* Custom Responsive Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col gap-3">
        {/* Row 1: Top Navigation Controls + View Mode Switchers */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Navigation (<, >) and Today button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handlePrev}
              type="button"
              className="p-1.5 sm:p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              title="Trước"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleNext}
              type="button"
              className="p-1.5 sm:p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              title="Sau"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleToday}
              type="button"
              disabled={isShowingToday}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                isShowingToday
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer shadow-2xs'
              }`}
            >
              Hôm nay
            </button>
          </div>

          {/* Right: View Mode Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {viewButtons.map(btn => {
              const isActive = activeView === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => handleChangeView(btn.id)}
                  type="button"
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer text-center ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Centered Current Date Title */}
        <div className="pt-2 border-t border-slate-100 text-center w-full">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 capitalize tracking-tight">
            {currentTitle}
          </h2>
        </div>
      </div>

      {/* Row 3: Calendar Grid */}
      <div className="flex-1 bg-white p-2 sm:p-4 rounded-2xl shadow-xs border border-slate-200">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={viLocale}
          headerToolbar={false}
          datesSet={handleDatesSet}
          events={events}
          editable={false}
          selectable={false}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="70vh"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
        />
      </div>
    </div>
  );
}