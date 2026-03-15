import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CalendarEvent, Contract, SelectCare } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  FileText,
  ShieldCheck,
  X,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { sv } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectCare, setSelectCare] = useState<(SelectCare & { customerName: string })[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    type: 'event' as const
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [eventsRes, contractsRes, scRes] = await Promise.all([
        fetch(`/api/calendar-events?sellerId=${user?.id}`),
        fetch(`/api/contracts?sellerId=${user?.id}`),
        fetch(`/api/select-care?sellerId=${user?.id}`)
      ]);

      const [eventsData, contractsData, scData] = await Promise.all([
        eventsRes.json(),
        contractsRes.json(),
        scRes.json()
      ]);

      setEvents(eventsData);
      setContracts(contractsData);
      setSelectCare(scData);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sellerId: user?.id
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ title: '', description: '', startDate: '', endDate: '', type: 'event' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayItems = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    const dayEvents = events.filter(e => e.startDate.startsWith(dayStr)).map(e => ({ ...e, itemType: 'event' }));
    const dayContracts = contracts.filter(c => c.endDate === dayStr).map(c => ({ ...c, itemType: 'contract_expiry' }));
    const daySC = selectCare.filter(sc => sc.endDate === dayStr).map(sc => ({ ...sc, itemType: 'select_care_expiry' }));

    return [...dayEvents, ...dayContracts, ...daySC];
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Kalender</h1>
          <p className="text-slate-500 dark:text-slate-400">Översikt över dina händelser och avtalsförfall</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="px-4 font-bold text-slate-900 dark:text-white min-w-[140px] text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: sv })}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <button
            onClick={() => {
              setFormData({ ...formData, startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20"
          >
            <Plus className="w-5 h-5" />
            Ny händelse
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
            <div key={day} className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const items = getDayItems(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[140px] p-2 border-r border-b border-slate-50 dark:border-slate-800 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                  !isCurrentMonth && "bg-slate-50/30 dark:bg-slate-900/50 opacity-40"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full transition-all",
                    isToday ? "bg-blue-700 text-white shadow-lg shadow-blue-700/20" : "text-slate-600 dark:text-slate-400"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {items.slice(0, 3).map((item: any, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedEvent(item)}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold truncate transition-all hover:scale-[1.02]",
                        item.itemType === 'event' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30" :
                        item.itemType === 'contract_expiry' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30" :
                        "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30"
                      )}
                    >
                      {item.itemType === 'event' ? item.title : 
                       item.itemType === 'contract_expiry' ? `Utgång: ${item.customerName}` :
                       `SC Utgång: ${item.customerName}`}
                    </button>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[10px] text-slate-400 font-bold text-center mt-1">
                      +{items.length - 3} till
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Händelsedetaljer</h2>
                <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-4 rounded-2xl",
                    selectedEvent.itemType === 'event' ? "bg-blue-50 text-blue-600" :
                    selectedEvent.itemType === 'contract_expiry' ? "bg-amber-50 text-amber-600" :
                    "bg-indigo-50 text-indigo-600"
                  )}>
                    {selectedEvent.itemType === 'event' ? <CalendarIcon className="w-8 h-8" /> :
                     selectedEvent.itemType === 'contract_expiry' ? <FileText className="w-8 h-8" /> :
                     <ShieldCheck className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedEvent.itemType === 'event' ? selectedEvent.title : 
                       selectedEvent.itemType === 'contract_expiry' ? 'Avtalsförfall' : 'Select Care Förfall'}
                    </h3>
                    <p className="text-slate-500">{selectedEvent.customerName || 'Personlig händelse'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium">
                      {selectedEvent.startDate || selectedEvent.endDate}
                    </span>
                  </div>
                  {selectedEvent.description && (
                    <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                      <Info className="w-5 h-5 text-slate-400 mt-0.5" />
                      <p className="text-sm leading-relaxed">{selectedEvent.description}</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:opacity-90 transition-all"
                >
                  Stäng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ny händelse</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddEvent} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Titel</label>
                  <input
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Beskrivning</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Datum</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-700 text-white font-bold rounded-2xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20 mt-4"
                >
                  Spara händelse
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
