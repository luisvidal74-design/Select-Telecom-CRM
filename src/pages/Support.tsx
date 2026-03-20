import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  History,
  Bell
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
  const isPrivileged = user?.isAdmin === 1 || user?.role?.toLowerCase() === 'administratör' || user?.role?.toLowerCase() === 'support';
  const [searchParams, setSearchParams] = useSearchParams();
  const customerIdParam = searchParams.get('customerId');
  const ticketIdParam = searchParams.get('ticketId');
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [supportStaff, setSupportStaff] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const [newLogNote, setNewLogNote] = useState('');

  const [formData, setFormData] = useState({
    customerId: customerIdParam || '',
    title: '',
    description: '',
    priority: 'Normal' as const,
    status: 'Registrerad' as const,
    assignedTo: ''
  });

  useEffect(() => {
    fetchTickets();
    fetchCustomers();
    fetchSupportStaff();
  }, [user, customerIdParam]);

  useEffect(() => {
    if (ticketIdParam) {
      fetchTicketDetails(Number(ticketIdParam));
    }
  }, [ticketIdParam]);

  const fetchTickets = async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        userId: user.id.toString(),
        isAdmin: user.isAdmin ? 'true' : 'false',
        role: user.role || ''
      });
      
      if (customerIdParam) {
        params.append('customerId', customerIdParam);
      }
      
      const res = await fetch(`/api/support-tickets?${params}`);
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

  const fetchSupportStaff = async () => {
    try {
      const res = await fetch('/api/users/support-staff');
      const data = await res.json();
      setSupportStaff(data);
    } catch (error) {
      console.error('Failed to fetch support staff:', error);
    }
  };

  const fetchTicketDetails = async (id: number) => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        userId: user.id.toString(),
        isAdmin: user.isAdmin ? 'true' : 'false',
        role: user.role || ''
      });
      const res = await fetch(`/api/support-tickets/${id}?${params}`);
      const data = await res.json();
      setSelectedTicket(data);
      // Dispatch event to refresh notification count in Layout
      window.dispatchEvent(new CustomEvent('refresh-ticket-count'));
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
          assignedTo: formData.assignedTo ? Number(formData.assignedTo) : null,
          createdBy: user?.id,
          isAdmin: user?.isAdmin,
          role: user?.role
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          customerId: '',
          title: '',
          description: '',
          priority: 'Normal',
          status: 'Registrerad',
          assignedTo: ''
        });
        fetchTickets();
        // Dispatch event to refresh notification count in Layout
        window.dispatchEvent(new CustomEvent('refresh-ticket-count'));
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
        window.dispatchEvent(new CustomEvent('refresh-ticket-count'));
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
        window.dispatchEvent(new CustomEvent('refresh-ticket-count'));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleTagSeller = async () => {
    if (!selectedTicket || !selectedTicket.responsibleSeller) return;

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket.id}/tag-seller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          sellerName: selectedTicket.responsibleSeller
        })
      });

      if (res.ok) {
        fetchTicketDetails(selectedTicket.id);
        fetchTickets();
        window.dispatchEvent(new CustomEvent('refresh-ticket-count'));
      }
    } catch (error) {
      console.error('Failed to tag seller:', error);
    }
  };

  const handleAssign = async (staffId: number | null) => {
    if (!selectedTicket || !user) return;

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: staffId,
          userId: user.id,
          note: staffId === user.id ? 'Tog över ärendet' : undefined
        })
      });

      if (res.ok) {
        fetchTicketDetails(selectedTicket.id);
        fetchTickets();
        window.dispatchEvent(new CustomEvent('refresh-ticket-count'));
      }
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTickets = filteredTickets
    .filter(t => t.status !== 'Avslutad')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
  const closedTickets = filteredTickets
    .filter(t => t.status === 'Avslutad')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const ACTIVE_PER_PAGE = 15;
  const CLOSED_PER_PAGE = 6;

  const paginatedActive = activeTickets.slice((activePage - 1) * ACTIVE_PER_PAGE, activePage * ACTIVE_PER_PAGE);
  const paginatedClosed = closedTickets.slice((closedPage - 1) * CLOSED_PER_PAGE, closedPage * CLOSED_PER_PAGE);

  const activeTotalPages = Math.ceil(activeTickets.length / ACTIVE_PER_PAGE);
  const closedTotalPages = Math.ceil(closedTickets.length / CLOSED_PER_PAGE);

  const canEdit = isPrivileged;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Supportärenden</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {customerIdParam ? (
              <span className="flex items-center gap-2">
                Visar ärenden för <span className="text-primary font-bold">{customers.find(c => c.id === Number(customerIdParam))?.name || 'vald kund'}</span>
                <button 
                  onClick={() => setSearchParams({})}
                  className="text-xs text-red-500 hover:text-red-600 font-bold underline ml-2"
                >
                  Rensa filter
                </button>
              </span>
            ) : (
              'Hantera och spåra supportärenden'
            )}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Sök på ärendenummer, titel eller kund..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Nytt ärende
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredTickets.length > 0 ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Aktiva ärenden</h2>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">{activeTickets.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {paginatedActive.length > 0 ? (
                  paginatedActive.map((ticket, i) => {
                    const config = STATUS_CONFIG[ticket.status];
                    const StatusIcon = config.icon;
                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSearchParams({ ticketId: ticket.id.toString() })}
                        className={cn(
                          "flex items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all group shadow-sm relative",
                          ticket.assignedTo === user?.id ? "hover:border-blue-600" : "hover:border-emerald-600",
                          selectedTicket?.id === ticket.id ? (ticket.assignedTo === user?.id ? "border-blue-600 ring-1 ring-blue-600" : "border-emerald-600 ring-1 ring-emerald-600") : "border-slate-200 dark:border-slate-800"
                        )}
                      >
                        {((isPrivileged ? ticket.isReadByAdmin === 0 : ticket.isReadByCreator === 0) || (ticket.isTagged === 1 && ticket.taggedUserId === user?.id)) && (
                          <div className={cn(
                            "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 animate-pulse z-10",
                            ticket.assignedTo === user?.id ? "bg-blue-500" : "bg-emerald-500"
                          )} />
                        )}
                        
                        <div className={cn(
                          "w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors",
                          ticket.assignedTo === user?.id ? "group-hover:bg-blue-600/10" : "group-hover:bg-emerald-600/10"
                        )}>
                          <Ticket className={cn(
                            "w-5 h-5 text-slate-600 dark:text-slate-400 transition-colors",
                            ticket.assignedTo === user?.id ? "group-hover:text-blue-600" : "group-hover:text-emerald-600"
                          )} />
                        </div>

                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{ticket.ticketNumber}</span>
                              <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", PRIORITY_CONFIG[ticket.priority])}>
                                {ticket.priority}
                              </span>
                            </div>
                            <h3 className={cn(
                              "text-sm font-bold text-slate-900 dark:text-white transition-colors truncate leading-tight",
                              ticket.assignedTo === user?.id ? "group-hover:text-blue-600" : "group-hover:text-emerald-600"
                            )}>
                              {ticket.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600/60" />
                            <span className="truncate">{ticket.customerName}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <User className="w-3.5 h-3.5 text-emerald-600/60" />
                            <span className="truncate">{ticket.creatorName}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              ticket.assignedTo ? (ticket.assignedTo === user?.id ? "bg-blue-500 animate-pulse" : "bg-emerald-500") : "bg-slate-300 dark:bg-slate-700"
                            )} />
                            <span className={cn(
                              "truncate italic",
                              ticket.assignedTo === user?.id && "text-blue-600 font-bold not-italic"
                            )}>
                              {ticket.assignedTo === user?.id ? 'Tilldelad dig' : (ticket.assignedName || 'Ej tilldelad')}
                            </span>
                          </div>

                          <div className="flex items-center justify-end md:justify-start">
                            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-tight", config.color)}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {ticket.status}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500">Inga aktiva ärenden</p>
                  </div>
                )}
              </div>

              {activeTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setActivePage(p => Math.max(1, p - 1))}
                    disabled={activePage === 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <History className="w-4 h-4 rotate-180" />
                  </button>
                  <span className="text-xs font-bold text-slate-500">Sida {activePage} av {activeTotalPages}</span>
                  <button
                    onClick={() => setActivePage(p => Math.min(activeTotalPages, p + 1))}
                    disabled={activePage === activeTotalPages}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {closedTickets.length > 0 && (
              <div className="space-y-3 pt-8 pb-4 px-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-[32px] border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Avslutade ärenden</h2>
                  <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{closedTickets.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {paginatedClosed.map((ticket, i) => {
                    const config = STATUS_CONFIG[ticket.status];
                    const StatusIcon = config.icon;
                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSearchParams({ ticketId: ticket.id.toString() })}
                        className={cn(
                          "flex items-center gap-3 sm:gap-4 bg-white/60 dark:bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all hover:border-red-500 group shadow-sm relative opacity-75 hover:opacity-100",
                          selectedTicket?.id === ticket.id ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                        )}
                      >
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                          <CheckCircle2 className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-red-500 transition-colors" />
                        </div>

                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{ticket.ticketNumber}</span>
                              <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", PRIORITY_CONFIG[ticket.priority])}>
                                {ticket.priority}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-500 transition-colors truncate leading-tight">
                              {ticket.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{ticket.customerName}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{ticket.creatorName}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              ticket.assignedTo ? (ticket.assignedTo === user?.id ? "bg-blue-500 animate-pulse" : "bg-emerald-500") : "bg-slate-300 dark:bg-slate-700"
                            )} />
                            <span className={cn(
                              "truncate italic",
                              ticket.assignedTo === user?.id && "text-blue-600 font-bold not-italic"
                            )}>
                              {ticket.assignedTo === user?.id ? 'Tilldelad dig' : (ticket.assignedName || 'Ej tilldelad')}
                            </span>
                          </div>

                          <div className="flex items-center justify-end md:justify-start">
                            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-tight", config.color)}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {ticket.status}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {closedTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setClosedPage(p => Math.max(1, p - 1))}
                      disabled={closedPage === 1}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <History className="w-4 h-4 rotate-180" />
                    </button>
                    <span className="text-xs font-bold text-slate-500">Sida {closedPage} av {closedTotalPages}</span>
                    <button
                      onClick={() => setClosedPage(p => Math.min(closedTotalPages, p + 1))}
                      disabled={closedPage === closedTotalPages}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Ticket className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">Inga ärenden hittades</p>
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedTicket.ticketNumber}</h2>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", PRIORITY_CONFIG[selectedTicket.priority])}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Skapat {new Date(selectedTicket.createdAt).toLocaleString()} av {selectedTicket.creatorName}
                  </p>
                </div>
                <button onClick={() => {
                  setSelectedTicket(null);
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('ticketId');
                  setSearchParams(newParams);
                }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{selectedTicket.title}</h3>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Status</p>
                      <select 
                        disabled={!canEdit}
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as any)}
                        className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none disabled:cursor-not-allowed cursor-pointer"
                      >
                        {Object.keys(STATUS_CONFIG).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Kund</p>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {selectedTicket.customerName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Handläggare</p>
                        {canEdit && selectedTicket.assignedTo !== user?.id && (
                          <button
                            onClick={() => handleAssign(user?.id || null)}
                            className="text-[10px] text-blue-600 hover:underline font-bold"
                          >
                            Ta ärende
                          </button>
                        )}
                      </div>
                      <select 
                        disabled={!canEdit}
                        value={selectedTicket.assignedTo || ''}
                        onChange={(e) => handleAssign(Number(e.target.value) || null)}
                        className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="">Välj handläggare...</option>
                        {supportStaff.map(s => (
                          <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Ansvarig säljare</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTicket.responsibleSeller || 'Ej angiven'}</p>
                      </div>
                      {selectedTicket.responsibleSeller && canEdit && (
                        <button
                          onClick={handleTagSeller}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                          title="Tagga säljare"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedTicket.deviceName && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-600/60 uppercase font-bold tracking-widest">Enhet</p>
                          <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{selectedTicket.deviceName}</p>
                        </div>
                      </div>
                      {selectedTicket.selectCareId && selectedTicket.status !== 'Avslutad' && canEdit && (
                        <button
                          onClick={() => handleUpdateStatus('Avslutad')}
                          className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Aktivera enhet
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg">
                    <History className="w-6 h-6 text-blue-600" />
                    Händelselogg
                  </div>
                  
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                    {selectedTicket.logs?.map((log) => (
                      <div key={log.id} className="relative pl-10">
                        <div className="absolute left-3 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{log.userName}</span>
                            <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[9px] font-bold uppercase tracking-widest w-fit">
                            {log.action}
                          </div>
                          {log.note && <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{log.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <form onSubmit={handleAddLog} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Skriv en anteckning..."
                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 text-sm shadow-sm"
                    value={newLogNote}
                    onChange={(e) => setNewLogNote(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!newLogNote.trim()}
                    className="px-6 bg-blue-700 text-white rounded-2xl hover:bg-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-700/20 flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Tilldela till</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    >
                      <option value="">Välj handläggare (valfritt)...</option>
                      {supportStaff.map(s => (
                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                      ))}
                    </select>
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
