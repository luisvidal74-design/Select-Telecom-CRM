import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Contract, Customer, ContractFile } from '../types';
import { 
  Plus, 
  ChevronRight,
  Search, 
  FileText, 
  Calendar, 
  Clock, 
  Building2, 
  Trash2, 
  Edit2, 
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  X,
  Upload,
  Download,
  Eye,
  FileIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Contracts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    type: 'Telefoniavtal',
    startDate: new Date().toISOString().split('T')[0],
    contractPeriod: 24,
    endDate: '',
    customFields: ''
  });

  useEffect(() => {
    fetchContracts();
    fetchCustomers();
  }, [user]);

  useEffect(() => {
    if (formData.startDate && formData.contractPeriod) {
      const start = new Date(formData.startDate);
      start.setMonth(start.getMonth() + Number(formData.contractPeriod));
      setFormData(prev => ({ ...prev, endDate: start.toISOString().split('T')[0] }));
    }
  }, [formData.startDate, formData.contractPeriod]);

  const fetchContracts = async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        userId: user.id.toString(),
        isAdmin: user.isAdmin ? 'true' : 'false',
        role: user.role || ''
      });
      const res = await fetch(`/api/contracts?${params}`);
      const data = await res.json();
      setContracts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingContract ? `/api/contracts/${editingContract.id}` : '/api/contracts';
      const method = editingContract ? 'PUT' : 'POST';
      
      const fd = new FormData();
      fd.append('customerId', formData.customerId);
      fd.append('type', formData.type);
      fd.append('startDate', formData.startDate);
      fd.append('contractPeriod', formData.contractPeriod.toString());
      fd.append('endDate', formData.endDate);
      fd.append('sellerId', user?.id.toString() || '');
      fd.append('userId', user?.id.toString() || '');
      fd.append('isAdmin', user?.isAdmin ? 'true' : 'false');
      fd.append('role', user?.role || '');
      fd.append('customFields', formData.customFields);
      
      selectedFiles.forEach(file => {
        fd.append('files', file);
      });

      const res = await fetch(url, {
        method,
        body: fd
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingContract(null);
        setSelectedFiles([]);
        setFormData({
          customerId: '',
          type: 'Telefoniavtal',
          startDate: new Date().toISOString().split('T')[0],
          contractPeriod: 24,
          endDate: '',
          customFields: ''
        });
        fetchContracts();
      }
    } catch (error) {
      console.error('Failed to save contract:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      customerId: contract.customerId.toString(),
      type: contract.type || '',
      startDate: contract.startDate || '',
      contractPeriod: contract.contractPeriod || 24,
      endDate: contract.endDate || '',
      customFields: contract.customFields || ''
    });
    setSelectedFiles([]);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Är du säker på att du vill radera detta avtal?')) return;
    try {
      const params = new URLSearchParams({
        userId: user?.id.toString() || '',
        isAdmin: user?.isAdmin ? 'true' : 'false',
        role: user?.role || ''
      });
      const res = await fetch(`/api/contracts/${id}?${params}`, { method: 'DELETE' });
      if (res.ok) fetchContracts();
    } catch (error) {
      console.error('Failed to delete contract:', error);
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatus = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(now.getMonth() + 6);

    if (end < now) return { label: 'Utgått', color: 'text-red-600 bg-red-50 border-red-100' };
    if (end <= sixMonthsFromNow) return { label: 'Löper ut snart', color: 'text-amber-600 bg-amber-50 border-amber-100' };
    return { label: 'Aktivt', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mina Avtal</h1>
          <p className="text-slate-500 dark:text-slate-400">Hantera dina kundavtal och bindningstider</p>
        </div>
        <button
          onClick={() => {
            setEditingContract(null);
            setFormData({
              customerId: '',
              type: 'Telefoniavtal',
              startDate: new Date().toISOString().split('T')[0],
              contractPeriod: 24,
              endDate: '',
              customFields: ''
            });
            setSelectedFiles([]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20"
        >
          <Plus className="w-5 h-5" />
          Nytt avtal
        </button>
      </div>

      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
        <input
          type="text"
          placeholder="Sök på kund eller avtalstyp..."
          className="w-full pl-12 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-400 dark:bg-slate-500 hover:bg-slate-500 dark:hover:bg-slate-400 text-white rounded-full p-0.5 transition-colors"
            title="Rensa sökning"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredContracts.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kund</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Typ</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Slut</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => {
                  const status = getStatus(contract.endDate);
                  return (
                    <motion.tr
                      key={contract.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/customers/${contract.customerId}?tab=contracts`)}
                    >
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 dark:text-white">{contract.customerName}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{contract.type}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap", status.color)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs font-medium text-slate-500">{contract.startDate}</td>
                      <td className="py-4 px-6 text-xs font-bold text-slate-900 dark:text-white">{contract.endDate}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(contract);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contract.id);
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inga avtal hittades</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Börja med att lägga till ditt första kundavtal</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {editingContract ? 'Redigera avtal' : 'Nytt avtal'}
                  </h2>
                  <p className="text-sm text-slate-500">Fyll i uppgifterna för kundavtalet</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Företag</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        required
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                        value={formData.customerId}
                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      >
                        <option value="">Välj företag...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Avtalstyp</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        required
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="Telefoniavtal">Telefoniavtal</option>
                        <option value="Växelavtal">Växelavtal</option>
                        <option value="Körjournalavtal">Körjournalavtal</option>
                        <option value="IT-avtal">IT-avtal</option>
                        <option value="Annat">Annat</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Startdatum</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="date"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Bindningstid (månader)</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        required
                        min="1"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                        value={formData.contractPeriod}
                        onChange={(e) => setFormData({ ...formData, contractPeriod: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Slutdatum (beräknat)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="date"
                        readOnly
                        className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl outline-none cursor-not-allowed text-slate-500"
                        value={formData.endDate}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Ladda upp dokument (PDF, Excel)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-600 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Klicka för att ladda upp</p>
                      <p className="text-xs text-slate-500">Dra och släpp filer här eller klicka för att välja</p>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setSelectedFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                    </div>
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedFiles.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-800">
                            <FileIcon className="w-3.5 h-3.5" />
                            {file.name}
                            <button 
                              type="button"
                              onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Övrig information</label>
                  <textarea
                    rows={3}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none"
                    placeholder="Anteckningar om avtalet..."
                    value={formData.customFields}
                    onChange={(e) => setFormData({ ...formData, customFields: e.target.value })}
                  />
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
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingContract ? 'Spara ändringar' : 'Skapa avtal')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {viewingPdf && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-md">{viewingPdf.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={viewingPdf.url.replace('/api/files/', '/api/files/') + '/download'}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
                    title="Ladda ner"
                  >
                    <Download className="w-6 h-6" />
                  </a>
                  <button 
                    onClick={() => setViewingPdf(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-slate-950">
                <iframe 
                  src={viewingPdf.url} 
                  className="w-full h-full border-none"
                  title="PDF Viewer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
