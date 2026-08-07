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

  useEffect(() => {
    axios.get('http://localhost:8080/api/cards/calendar')
      .then(response => {
        const formattedEvents = response.data.map((card: any) => ({
          title: card.title,
          start: card.deadline, 
          allDay: true 
        }));
        setEvents(formattedEvents);
      })
      .catch(() => setEvents([]));
  }, []);

  const handleDateClick = (info: any) => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.changeView('timeGridDay', info.dateStr);
  };

  const handleSelect = (info: any) => {
    const title = prompt('Nhập tên công việc/lịch trình mới:');
    if (title) {
      const newEvent = {
        title,
        start: info.startStr,
        end: info.endStr,
        allDay: info.allDay
      };
      
      setEvents([...events, newEvent]);
      
    }
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
      `}</style>

      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <FullCalendar
          ref={calendarRef}
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