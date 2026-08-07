import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';

export default function CalendarView() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<{ date: string; tasks: any[] } | null>(null);

  useEffect(() => {
    axios.get('http://localhost:8080/api/cards/calendar') 
      .then(response => {
        const formattedEvents = response.data.map((card: any) => ({
          title: card.title,
          date: card.deadline 
        }));
        setEvents(formattedEvents);
      })
      .catch(error => {
        console.error("Lỗi tải dữ liệu lịch:", error);
        setEvents([]);
      });
  }, []);

  const handleDateClick = (info: any) => {
    const tasksOnDay = events.filter(e => e.date === info.dateStr);
    setSelectedDay({
      date: info.dateStr,
      tasks: tasksOnDay
    });
  };

  return (
    <div className="flex flex-col h-full">
      <style>{`
        .fc {
          font-family: inherit;
          --fc-border-color: #e2e8f0;
          --fc-button-bg-color: #2563eb;
          --fc-button-border-color: #2563eb;
          --fc-button-hover-bg-color: #1d4ed8;
          --fc-button-hover-border-color: #1d4ed8;
          --fc-button-active-bg-color: #1e40af;
          --fc-button-active-border-color: #1e40af;
          --fc-today-bg-color: #eff6ff;
          --fc-event-bg-color: #2563eb;
          --fc-event-border-color: #2563eb;
        }
        .fc .fc-button-primary {
          border-radius: 0.5rem;
          font-weight: 500;
          text-transform: capitalize;
          padding: 0.5rem 1rem;
        }
        .fc .fc-toolbar-title {
          font-weight: 800;
          color: #0f172a;
          font-size: 2rem !important;
        }
        .fc-scrollgrid {
          border-radius: 1rem !important;
          overflow: hidden;
          border: 1px solid #e2e8f0 !important;
          background-color: #ffffff;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #e2e8f0;
        }
        .fc-col-header-cell-cushion {
          color: #475569;
          font-weight: 600;
          padding: 12px 0 !important;
        }
        .fc-daygrid-day-number {
          color: #1e293b;
          font-weight: 500;
          padding: 8px !important;
        }
      `}</style>

      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay'
          }}
          buttonText={{
            today: 'Hôm nay',
            year: 'Năm',
            month: 'Tháng',
            week: 'Tuần',
            day: 'Ngày'
          }}
          events={events}
          dateClick={handleDateClick}
          height="75vh"
        />
      </div>

      {selectedDay && (
        <div className="mt-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Việc cần làm: <span className="text-blue-600">{selectedDay.date}</span>
            </h3>
            <button 
              onClick={() => setSelectedDay(null)}
              className="text-slate-400 hover:text-red-500 font-medium bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
          <ul className="space-y-2">
            {selectedDay.tasks.length > 0 ? (
              selectedDay.tasks.map((task, idx) => (
                <li key={idx} className="p-3 bg-blue-50 text-blue-900 rounded-xl font-medium border border-blue-100">
                  {task.title}
                </li>
              ))
            ) : (
              <li className="p-3 bg-slate-50 text-slate-500 rounded-xl font-medium border border-slate-100">
                Không có lịch trình cho ngày này.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}