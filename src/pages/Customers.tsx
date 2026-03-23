import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, MapPin, User as UserIcon, Phone, ChevronRight, Trash2, ChevronLeft, FileSpreadsheet, X } from 'lucide-react';
import { Customer, User } from '../types';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import CustomerImport from '../components/CustomerImport';

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    orgNumber: '',
    address: '',
    city: '',
    zipCode: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    responsibleSeller: '',
    website: ''
  });

  const fetchCustomers = async () => {
    if (!user) return;
    const params = new URLSearchParams({
      userId: user.id.toString(),
      isAdmin: user.isAdmin ? 'true' : 'false',
      role: user.role || ''
    });
    const res = await fetch(`/api/customers?${params}`);
    const data = await res.json();
    setCustomers(data);
  };

  const fetchSellers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    // Filter for users who have 'Säljare' in their role or are not admins but could be sellers
    // Based on Users.tsx, 'Säljare' is the default role for non-admins
    const sellerUsers = data.filter((u: User) => 
      u.status === 'approved' && 
      (u.role?.toLowerCase().includes('säljare') || (!u.isAdmin && !u.role))
    );
    setSellers(sellerUsers);
  };

  useEffect(() => {
    fetchCustomers();
    fetchSellers();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      await fetchCustomers();
      setIsModalOpen(false);
      setFormData({
        name: '',
        orgNumber: '',
        address: '',
        city: '',
        zipCode: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        responsibleSeller: '',
        website: ''
      });
    }
  };

  const filteredCustomers = customers
    .filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.orgNumber.includes(search)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCustomers(customers.filter(c => c.id !== id));
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Kunder</h1>
          <p className="text-slate-500 dark:text-slate-400">Hantera dina företagskunder</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Sök på företagsnamn eller org.nr..."
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-400 dark:bg-slate-500 hover:bg-slate-500 dark:hover:bg-slate-400 text-white rounded-full p-0.5 transition-colors"
                title="Rensa sökning"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {(user?.isAdmin === 1 || user?.isSupport === 1) && (
            <>
              <button 
                onClick={() => setIsImportOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                Importera Excel
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Lägg till kund
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {paginatedCustomers.map((customer, i) => (
          <motion.div
            key={customer.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link 
              to={`/kunder/${customer.id}`}
              className="flex items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary transition-all group shadow-sm"
            >
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center group-hover:bg-primary/10 transition-colors overflow-hidden">
                {customer.website ? (
                  <img 
                    src={`https://img.logo.dev/${customer.website.replace(/^https?:\/\//, '').split('/')[0]}?token=${import.meta.env.VITE_LOGODEV_SECRET || 'pk_placeholder'}`} 
                    alt={customer.name}
                    className="w-full h-full object-contain p-1"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>';
                    }}
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" />
                )}
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate leading-tight">{customer.name}</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{customer.orgNumber}</p>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-primary/60" />
                  <span className="truncate">{customer.city}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <UserIcon className="w-3.5 h-3.5 text-primary/60" />
                  <span className="truncate">{customer.contactPerson}</span>
                </div>

                {customer.responsibleSeller && (
                  <div className="flex items-center">
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold truncate uppercase tracking-tight">
                      Säljare: {customer.responsibleSeller}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(user?.isAdmin === 1 || user?.isSupport === 1) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteConfirm(customer.id);
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Sida {currentPage} av {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Radera kund?</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Är du säker på att du vill radera denna kund? All data kopplad till kunden (användare, utrustning och avtal) kommer också att raderas permanent.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Avbryt
                </button>
                <button 
                  onClick={() => handleDelete(deleteConfirm)}
                  className="py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all active:scale-95"
                >
                  Ja, radera
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {isImportOpen && (
        <CustomerImport 
          onImportComplete={() => fetchCustomers()}
          onClose={() => setIsImportOpen(false)}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lägg till ny kund</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Företagsnamn</label>
                  <input required className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organisationsnummer</label>
                  <input required className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={formData.orgNumber} onChange={e => setFormData({...formData, orgNumber: e.target.value})} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adress</label>
                  <input required className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Postnummer</label>
                  <input required className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ort</label>
                  <input required className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kontaktperson</label>
                  <input required className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">E-post (kontaktperson)</label>
                  <input required type="email" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Telefonnummer</label>
                  <input required className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ansvarig säljare</label>
                  <select 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary appearance-none"
                    value={formData.responsibleSeller}
                    onChange={e => setFormData({...formData, responsibleSeller: e.target.value})}
                  >
                    <option value="">Välj säljare...</option>
                    {sellers.map(seller => (
                      <option key={seller.id} value={`${seller.firstName} ${seller.lastName}`}>
                        {seller.firstName} {seller.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hemsida (för logotyp)</label>
                  <input className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="t.ex. google.com" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Avbryt</button>
                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity">Spara kund</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
