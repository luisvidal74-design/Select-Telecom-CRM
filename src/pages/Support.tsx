import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SupportTicket, Customer, SelectCare } from '../types';
import { 
  Plus, 
  Search, 
  Ticket, 
  Clock, 
  User, 
  Building2, 
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  Filter,
  X,
  Send,
  Smartphone,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const STATUS_CONFIG = {
  'Registrerad': { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: Ticket },
  'Väntar': { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock },
  'Skickat för reparation': { color: 'text-purple-600 bg-purple-50 border-purple-100', icon: Send },
  'Under reparation': { color: 'text-indigo-600 bg-indigo-50 border-indigo-100', icon: Smartphone },
  'Avslutad': { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 }
};

const PRIORITY_CONFIG = {
  'Låg': 'bg-slate-100 text-slate-600',
  'Normal': 'bg-blue-100 text-blue-600',
  'Hög': 'bg-orange-100 text-orange-600',
  'Kritisk': 'bg-red-100 text-red-600'
};

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newLogNote, setNewLogNote] = useState('');

  const [formData, setFormData] = useState({
    customerId: '',
    title: '',
    description: '',
    priority: 'Normal' as const,
    status: 'Registrerad' as const
  });

  useEffect(() => {
    fetchTickets();
    fetchCustomers();
  }, [user]);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/support-tickets?userId=${user?.id}&isAdmin=${user?.isAdmin}&role=${user?.role}`);
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        userId: user.id.toString(),
        isAdmin: user.isAdmin ? 'true' : 'false',
        role: user.role || ''
      });
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchTicketDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/support-tickets/${id}`);
      const data = await res.json();
      setSelectedTicket(data);
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customerId: Number(formData.customerId),
          createdBy: user?.id
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          customerId: '',
          title: '',
          description: '',
          priority: 'Normal',
          status: 'Registrerad'
        });
        fetchTickets();
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newLogNote.trim()) return;

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          note: newLogNote,
          action: 'Kommentar'
        })
      });

      if (res.ok) {
        setNewLogNote('');
        fetchTicketDetails(selectedTicket.id);
        fetchTickets(); // Refresh list to update 'updatedAt'
      }
    } catch (error) {
      console.error('Failed to add log:', error);
    }
  };

  const handleUpdateStatus = async (newStatus: SupportTicket['status']) => {
    if (!selectedTicket) return;

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedTicket,
          status: newStatus,
          userId: user?.id,
          note: `Status ändrad till ${newStatus}`
        })
      });

      if (res.ok) {
        fetchTicketDetails(selectedTicket.id);
        fetchTickets();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canEdit = user?.isAdmin === 1 || user?.role === 'Support';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Supportärenden</h1>
          <p className="text-slate-500 dark:text-slate-400">Hantera och spåra supportärenden</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20"
        >
          <Plus className="w-5 h-5" />
          Nytt ärende
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Ticket List */}
        <div className="flex-1 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Sök på ärendenummer, titel eller kund..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse" />
              ))
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => {
                const config = STATUS_CONFIG[ticket.status];
                const StatusIcon = config.icon;
                return (
                  <motion.div
                    key={ticket.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => fetchTicketDetails(ticket.id)}
                    className={cn(
                      "p-4 bg-white dark:bg-slate-900 rounded-2xl border cursor-pointer transition-all hover:shadow-md group",
                      selectedTicket?.id === ticket.id ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ticket.ticketNumber}</span>
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", PRIORITY_CONFIG[ticket.priority])}>
                            {ticket.priority}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                          {ticket.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {ticket.customerName}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {ticket.creatorName}
                          </div>
                        </div>
                      </div>
                      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap", config.color)}>
                        <StatusIcon className="w-4 h-4" />
                        {ticket.status}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Ticket className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">Inga ärenden hittades</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div className="w-full lg:w-[450px]">
          <AnimatePresence mode="wait">
            {selectedTicket ? (
              <motion.div
                key={selectedTicket.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden sticky top-24"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedTicket.ticketNumber}</h2>
                    <p className="text-xs text-slate-500">
                      Skapat {new Date(selectedTicket.createdAt).toLocaleString()} av {selectedTicket.creatorName}
                    </p>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedTicket.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{selectedTicket.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Status</p>
                        <select 
                          disabled={!canEdit}
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateStatus(e.target.value as any)}
                          className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none disabled:cursor-not-allowed"
                        >
                          {Object.keys(STATUS_CONFIG).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Prioritet</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTicket.priority}</p>
                      </div>
                    </div>

                    {selectedTicket.deviceName && (
                      <div className="space-y-3">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Smartphone className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-[10px] text-blue-600/60 uppercase font-bold tracking-widest">Enhet</p>
                              <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{selectedTicket.deviceName}</p>
                            </div>
                          </div>
                          {selectedTicket.selectCareId && selectedTicket.status !== 'Avslutad' && canEdit && (
                            <button
                              onClick={() => handleUpdateStatus('Avslutad')}
                              className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Aktivera enhet
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                      <History className="w-5 h-5" />
                      Händelselogg
                    </div>
                    
                    <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                      {selectedTicket.logs?.map((log) => (
                        <div key={log.id} className="relative pl-10">
                          <div className="absolute left-3 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{log.userName}</span>
                              <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{log.action}</p>
                            {log.note && <p className="text-xs text-slate-600 dark:text-slate-400">{log.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                  <form onSubmit={handleAddLog} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Skriv en anteckning..."
                      className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                      value={newLogNote}
                      onChange={(e) => setNewLogNote(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!newLogNote.trim()}
                      className="p-2 bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-700/20"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : (
              <div className="h-[400px] bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">Välj ett ärende</h3>
                <p className="text-sm text-slate-500 mt-2">Klicka på ett ärende i listan för att se detaljer och logghistorik</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nytt supportärende</h2>
                  <p className="text-sm text-slate-500">Registrera ett nytt ärende i systemet</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Företag</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    >
                      <option value="">Välj företag...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Titel</label>
                    <input
                      type="text"
                      required
                      placeholder="Kort beskrivning av ärendet"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Beskrivning</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Detaljerad beskrivning..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Prioritet</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      >
                        <option value="Låg">Låg</option>
                        <option value="Normal">Normal</option>
                        <option value="Hög">Hög</option>
                        <option value="Kritisk">Kritisk</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Status</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      >
                        <option value="Registrerad">Registrerad</option>
                        <option value="Väntar">Väntar</option>
                        <option value="Skickat för reparation">Skickat för reparation</option>
                        <option value="Under reparation">Under reparation</option>
                        <option value="Avslutad">Avslutad</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20"
                  >
                    Skapa ärende
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
