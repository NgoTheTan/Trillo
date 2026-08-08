import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';

export default function CalendarView() {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          .then(res => res.data)
          .catch(err => {
            console.error(`Lỗi lấy lịch của board ${board.id}:`, err);
            return []; 
          })
        );

        const allBoardsData = await Promise.all(calendarPromises);

        const combinedEvents = allBoardsData.flat().map((card: any) => {
          let eventColor = '#2563eb'; 
          const priority = card.priority?.toUpperCase(); 
          
          if (priority === 'HIGH') eventColor = '#ef4444';      
          else if (priority === 'MEDIUM') eventColor = '#f59e0b'; 
          else if (priority === 'LOW') eventColor = '#10b981';    

          return {
            title: card.title || 'Chưa có tiêu đề',
            start: card.deadline,
            allDay: false, 
            backgroundColor: eventColor,
            borderColor: eventColor
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
    const calendarApi = calendarRef.current.getApi();
    calendarApi.changeView('timeGridDay', info.dateStr);
  };

  const handleSelect = (info: any) => {
    const title = prompt('Nhập tên công việc/lịch trình mới:');
    if (title) {
      const newEvent = { title, start: info.startStr, end: info.endStr, allDay: info.allDay };
      setEvents([...events, newEvent]);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <style>{`
        .fc { font-family: inherit; --fc-border-color: #e2e8f0; --fc-button-bg-color: #2563eb; --fc-button-border-color: #2563eb; --fc-button-hover-bg-color: #1d4ed8; --fc-button-hover-border-color: #1d4ed8; --fc-button-active-bg-color: #1e40af; --fc-today-bg-color: #eff6ff; --fc-event-bg-color: #2563eb; --fc-event-border-color: #2563eb; }
        .fc .fc-button-primary { border-radius: 0.5rem; font-weight: 500; text-transform: capitalize; padding: 0.5rem 1rem; }
        .fc .fc-toolbar-title { font-weight: 800; color: #0f172a; font-size: 2rem !important; }
        .fc-scrollgrid { border-radius: 1rem !important; overflow: hidden; border: 1px solid #e2e8f0 !important; background-color: #ffffff; }
      `}</style>

      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-white p-4 rounded-lg shadow-lg border border-slate-200">
          ⏳ Đang tải dữ liệu lịch...
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl mb-4 font-medium flex justify-between items-center">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay' }}
          buttonText={{ today: 'Hôm nay', year: 'Năm', month: 'Tháng', week: 'Tuần', day: 'Ngày' }}
          events={events}
          selectable={true}
          select={handleSelect}
          dateClick={handleDateClick}
          height="75vh"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
        />
      </div>
    </div>
  );
}