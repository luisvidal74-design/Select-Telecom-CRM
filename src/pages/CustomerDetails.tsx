import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Users as UsersIcon, 
  Smartphone, 
  ShieldCheck, 
  Plus, 
  ChevronRight,
  Monitor,
  Trash2, 
  Edit2, 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Hash,
  User as UserIcon,
  AlertTriangle,
  X,
  Wrench,
  History,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  Download,
  Eye,
  FileIcon,
  Loader2,
  Ticket,
  AlertCircle,
  Send
} from 'lucide-react';
import { Customer, CustomerUser, Equipment, ITEquipment, SelectCare, Brand, DrivingLog, Contract, ContractFile, User, SupportTicket } from '../types';
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

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'equipment' | 'it' | 'o365' | 'selectCare' | 'drivingLogs' | 'contracts' | 'support'>('users');
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrivingLogModalOpen, setIsDrivingLogModalOpen] = useState(false);
  const [isEditDrivingLogModalOpen, setIsEditDrivingLogModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedSc, setSelectedSc] = useState<SelectCare | null>(null);
  const [statusNotes, setStatusNotes] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [drivingLogs, setDrivingLogs] = useState<DrivingLog[]>([]);
  const [pasteData, setPasteData] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newMemory, setNewMemory] = useState('');
  const [newPurchasePlace, setNewPurchasePlace] = useState('');
  const [newO365Type, setNewO365Type] = useState('');
  const [selectedSummary, setSelectedSummary] = useState<{ type: 'user' | 'equipment' | 'it' | 'o365' | 'selectCare' | 'selectCareHistory' | 'contract' | 'drivingLog', item: any } | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: 'user' | 'equipment' | 'it' | 'o365' | 'selectCare' | 'contracts' | 'drivingLogs', id: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string, id: number } | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sellers, setSellers] = useState<User[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '', office: '', isAuthorizedBuyer: 0 });
  const [equipmentForm, setEquipmentForm] = useState({ brand: '', model: '', color: '', memory: '', imei: '', purchasePlace: '', orderNumber: '', purchaseDate: '', purchasePrice: 0, customerPrice: 0, sellerId: 0, userId: 0, trackingNumber: '', notes: '' });
  const [itForm, setItForm] = useState({ deviceName: '', brand: '', model: '', memory: '', serialNumber: '', trackingNumber: '', purchasePlace: '', orderNumber: '', purchaseDate: '', purchasePrice: 0, customerPrice: 0, sellerId: 0, userId: 0, comment: '' });
  const [scForm, setScForm] = useState({ brand: '', model: '', color: '', memory: '', imei: '', purchasePlace: '', orderNumber: '', purchaseDate: '', purchasePrice: 0, monthlyFee: 0, userId: 0, contractPeriod: 24, endDate: '', siemensContractNumber: '', sellerId: 0, trackingNumber: '' });
  const [o365Form, setO365Form] = useState({ licenseType: '', email: '', password: '', price: 0, startDate: '', bindingPeriod: 12, endDate: '', userId: 0, notes: '' });
  const [o365LicenseTypes, setO365LicenseTypes] = useState<{ id: number, name: string }[]>([]);
  const [suggestions, setSuggestions] = useState<{ brands: string[], models: string[], colors: string[], memories: string[] }>({ brands: [], models: [], colors: [], memories: [] });
  const [itSuggestions, setItSuggestions] = useState<{ brands: string[], models: string[], memory: string[], purchasePlaces: string[] }>({ brands: [], models: [], memory: [], purchasePlaces: [] });
  const [customerForm, setCustomerForm] = useState({ name: '', orgNumber: '', address: '', city: '', zipCode: '', contactPerson: '', contactPhone: '', responsibleSeller: '', website: '', services: '' });
  const [drivingLogForm, setDrivingLogForm] = useState({ regNo: '', driverName: '', email: '', deviceType: '', schema: '', monthlyFee: 0, sellerId: 0 });
  const [drivingLogSellerId, setDrivingLogSellerId] = useState<number>(0);
  const [contractForm, setContractForm] = useState({
    type: 'Telefoniavtal',
    startDate: new Date().toISOString().split('T')[0],
    contractPeriod: 24,
    endDate: '',
    customFields: '',
    sellerId: 0
  });

  const calculateEndDate = (startDate: string, months: number) => {
    if (!startDate || !months) return '';
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const getExpirationStatus = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(now.getMonth() + 6);
    
    if (end < now) return 'expired';
    if (end <= sixMonthsFromNow) return 'expiring-soon';
    return 'active';
  };

  useEffect(() => {
    if (scForm.purchaseDate && scForm.contractPeriod) {
      const newEndDate = calculateEndDate(scForm.purchaseDate, scForm.contractPeriod);
      if (newEndDate !== scForm.endDate) {
        setScForm(prev => ({ ...prev, endDate: newEndDate }));
      }
    }
  }, [scForm.purchaseDate, scForm.contractPeriod]);

  useEffect(() => {
    if (contractForm.startDate && contractForm.contractPeriod) {
      const newEndDate = calculateEndDate(contractForm.startDate, contractForm.contractPeriod);
      if (newEndDate !== contractForm.endDate) {
        setContractForm(prev => ({ ...prev, endDate: newEndDate }));
      }
    }
  }, [contractForm.startDate, contractForm.contractPeriod]);

  useEffect(() => {
    if (o365Form.startDate && o365Form.bindingPeriod) {
      const newEndDate = calculateEndDate(o365Form.startDate, o365Form.bindingPeriod);
      if (newEndDate !== o365Form.endDate) {
        setO365Form(prev => ({ ...prev, endDate: newEndDate }));
      }
    }
  }, [o365Form.startDate, o365Form.bindingPeriod]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab && ['users', 'equipment', 'it', 'o365', 'selectCare', 'drivingLogs', 'contracts', 'support'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [location.search]);

  const fetchData = async () => {
    if (!user) return;
    const params = new URLSearchParams({
      userId: user.id.toString(),
      isAdmin: user.isAdmin ? 'true' : 'false',
      role: user.role || ''
    });
    const [custRes, brandRes, logsRes, contractsRes, usersRes, ticketsRes, o365TypesRes] = await Promise.all([
      fetch(`/api/customers/${id}?${params}`),
      fetch('/api/brands'),
      fetch(`/api/customers/${id}/driving-logs`),
      fetch(`/api/contracts?customerId=${id}`),
      fetch('/api/users'),
      fetch(`/api/support-tickets?customerId=${id}&${params}`),
      fetch('/api/o365-licenses/types')
    ]);
    const custData = await custRes.json();
    const brandData = await brandRes.json();
    const logsData = await logsRes.json();
    const contractsData = await contractsRes.json();
    const usersData = await usersRes.json();
    const ticketsData = await ticketsRes.json();
    const o365TypesData = await o365TypesRes.json();
    
    setSupportTickets(ticketsData);
    setO365LicenseTypes(o365TypesData);
    const sellerUsers = usersData.filter((u: User) => 
      u.status === 'approved' && 
      (u.role?.toLowerCase().includes('säljare') || (!u.isAdmin && !u.role))
    );
    
    const responsibleSellerUser = sellerUsers.find((u: User) => 
      `${u.firstName} ${u.lastName}`.toLowerCase() === custData.responsibleSeller?.toLowerCase()
    );
    const defaultSellerId = responsibleSellerUser ? responsibleSellerUser.id : (user?.id || 0);

    setCustomer(custData);
    setDrivingLogs(logsData);
    setContracts(contractsData);
    setSellers(sellerUsers);
    
    setEquipmentForm(prev => ({ ...prev, sellerId: defaultSellerId }));
    setItForm(prev => ({ ...prev, sellerId: defaultSellerId }));
    setScForm(prev => ({ ...prev, sellerId: defaultSellerId }));
    setContractForm(prev => ({ ...prev, sellerId: defaultSellerId }));
    setDrivingLogSellerId(defaultSellerId);

    setCustomerForm({
      name: custData.name,
      orgNumber: custData.orgNumber,
      address: custData.address,
      city: custData.city,
      zipCode: custData.zipCode,
      contactPerson: custData.contactPerson,
      contactPhone: custData.contactPhone,
      responsibleSeller: custData.responsibleSeller || '',
      website: custData.website || '',
      services: custData.services || ''
    });
    setBrands(brandData);
    
    // Fetch suggestions
    const suggestionsRes = await fetch('/api/equipment/suggestions');
    if (suggestionsRes.ok) {
      const suggestionsData = await suggestionsRes.json();
      setSuggestions(suggestionsData);
    }

    const itSuggestionsRes = await fetch('/api/it-equipment/suggestions');
    if (itSuggestionsRes.ok) {
      const itSuggestionsData = await itSuggestionsRes.json();
      setItSuggestions(itSuggestionsData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem 
      ? `/api/customer-users/${editingItem.id}` 
      : `/api/customers/${id}/users`;
    const method = editingItem ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm),
    });
    if (res.ok) {
      fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
      setUserForm({ firstName: '', lastName: '', email: '', phone: '', role: '', office: '', isAuthorizedBuyer: 0 });
    } else {
      const errorData = await res.json();
      alert(`Fel vid sparning: ${errorData.error || res.statusText}`);
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem 
      ? `/api/equipment/${editingItem.id}` 
      : `/api/customers/${id}/equipment`;
    const method = editingItem ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...equipmentForm, sellerId: equipmentForm.sellerId || user?.id }),
    });
    if (res.ok) {
      fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
      setEquipmentForm({ brand: '', model: '', color: '', memory: '', imei: '', purchasePlace: '', orderNumber: '', purchaseDate: '', purchasePrice: 0, customerPrice: 0, sellerId: 0, userId: 0, trackingNumber: '', notes: '' });
    } else {
      const errorData = await res.json();
      alert(`Fel vid sparning: ${errorData.error || res.statusText}`);
    }
  };

  const handleAddITEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem 
      ? `/api/it-equipment/${editingItem.id}` 
      : `/api/customers/${id}/it-equipment`;
    const method = editingItem ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...itForm, sellerId: itForm.sellerId || user?.id }),
    });
    if (res.ok) {
      fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
      setItForm({ deviceName: '', brand: '', model: '', memory: '', serialNumber: '', trackingNumber: '', purchasePlace: '', orderNumber: '', purchaseDate: '', purchasePrice: 0, customerPrice: 0, sellerId: 0, userId: 0, comment: '' });
    } else {
      const errorData = await res.json();
      alert(`Fel vid sparning: ${errorData.error || res.statusText}`);
    }
  };

  const handleAddSC = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem 
      ? `/api/select-care/${editingItem.id}` 
      : `/api/customers/${id}/select-care`;
    const method = editingItem ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...scForm, sellerId: scForm.sellerId || user?.id }),
    });
    if (res.ok) {
      fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
      setScForm({ brand: '', model: '', color: '', memory: '', imei: '', purchasePlace: '', orderNumber: '', purchaseDate: '', purchasePrice: 0, monthlyFee: 0, userId: 0, contractPeriod: 24, endDate: '', siemensContractNumber: '', sellerId: 0, trackingNumber: '' });
    } else {
      const errorData = await res.json();
      alert(`Fel vid sparning: ${errorData.error || res.statusText}`);
    }
  };

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingItem ? `/api/contracts/${editingItem.id}` : '/api/contracts';
      const method = editingItem ? 'PUT' : 'POST';
      
      const fd = new FormData();
      fd.append('customerId', id || '');
      fd.append('type', contractForm.type);
      fd.append('startDate', contractForm.startDate);
      fd.append('contractPeriod', contractForm.contractPeriod.toString());
      fd.append('endDate', contractForm.endDate);
      fd.append('sellerId', (contractForm.sellerId || user?.id || '').toString());
      fd.append('userId', user?.id.toString() || '');
      fd.append('isAdmin', user?.isAdmin ? 'true' : 'false');
      fd.append('role', user?.role || '');
      fd.append('customFields', contractForm.customFields);
      
      selectedFiles.forEach(file => {
        fd.append('files', file);
      });

      const res = await fetch(url, {
        method,
        body: fd
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingItem(null);
        setSelectedFiles([]);
        setContractForm({
          type: 'Telefoniavtal',
          startDate: new Date().toISOString().split('T')[0],
          contractPeriod: 24,
          endDate: '',
          customFields: '',
          sellerId: 0
        });
        fetchData();
      } else {
        const errorData = await res.json();
        alert(`Fel vid sparning: ${errorData.error || res.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save contract:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBrand = async () => {
    if (!newBrand) return;
    const url = activeTab === 'it' ? '/api/it-equipment/brands' : '/api/brands';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBrand }),
    });
    if (res.ok) {
      const brandRes = await fetch('/api/brands');
      const brandData = await brandRes.json();
      setBrands(brandData);
      
      // Select the new brand in the form
      if (activeTab === 'equipment') {
        setEquipmentForm(prev => ({ ...prev, brand: newBrand }));
      } else if (activeTab === 'selectCare') {
        setScForm(prev => ({ ...prev, brand: newBrand }));
      } else if (activeTab === 'it') {
        setItForm(prev => ({ ...prev, brand: newBrand }));
      }
      
      setNewBrand('');
      // Refresh suggestions
      const suggRes = await fetch('/api/equipment/suggestions');
      const suggData = await suggRes.json();
      setSuggestions(suggData);

      const itSuggRes = await fetch('/api/it-equipment/suggestions');
      const itSuggData = await itSuggRes.json();
      setItSuggestions(itSuggData);
    }
  };

  const handleAddModel = async () => {
    if (!newModel) return;
    const url = activeTab === 'it' ? '/api/it-equipment/models' : '/api/models';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newModel }),
    });
    if (res.ok) {
      // Select the new model in the form
      if (activeTab === 'equipment') {
        setEquipmentForm(prev => ({ ...prev, model: newModel }));
      } else if (activeTab === 'selectCare') {
        setScForm(prev => ({ ...prev, model: newModel }));
      } else if (activeTab === 'it') {
        setItForm(prev => ({ ...prev, model: newModel }));
      }
      
      setNewModel('');
      // Refresh suggestions
      const suggRes = await fetch('/api/equipment/suggestions');
      const suggData = await suggRes.json();
      setSuggestions(suggData);

      const itSuggRes = await fetch('/api/it-equipment/suggestions');
      const itSuggData = await itSuggRes.json();
      setItSuggestions(itSuggData);
    }
  };

  const handleAddColor = async () => {
    if (!newColor) return;
    const res = await fetch('/api/colors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newColor }),
    });
    if (res.ok) {
      // Select the new color in the form
      if (activeTab === 'equipment') {
        setEquipmentForm(prev => ({ ...prev, color: newColor }));
      } else if (activeTab === 'selectCare') {
        setScForm(prev => ({ ...prev, color: newColor }));
      }
      
      setNewColor('');
      // Refresh suggestions
      const suggRes = await fetch('/api/equipment/suggestions');
      const suggData = await suggRes.json();
      setSuggestions(suggData);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory) return;
    const url = activeTab === 'it' ? '/api/it-equipment/memory' : '/api/memories';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemory }),
    });
    if (res.ok) {
      // Select the new memory in the form
      if (activeTab === 'equipment') {
        setEquipmentForm(prev => ({ ...prev, memory: newMemory }));
      } else if (activeTab === 'selectCare') {
        setScForm(prev => ({ ...prev, memory: newMemory }));
      } else if (activeTab === 'it') {
        setItForm(prev => ({ ...prev, memory: newMemory }));
      }
      
      setNewMemory('');
      // Refresh suggestions
      const suggRes = await fetch('/api/equipment/suggestions');
      const suggData = await suggRes.json();
      setSuggestions(suggData);

      const itSuggRes = await fetch('/api/it-equipment/suggestions');
      const itSuggData = await itSuggRes.json();
      setItSuggestions(itSuggData);
    }
  };

  const handleAddITPurchasePlace = async (name: string) => {
    if (!name) return;
    const res = await fetch('/api/it-equipment/purchase-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setItForm(prev => ({ ...prev, purchasePlace: name }));
      const itSuggRes = await fetch('/api/it-equipment/suggestions');
      const itSuggData = await itSuggRes.json();
      setItSuggestions(itSuggData);
    }
  };

  const handleUpdateStatus = async (sc: SelectCare, newStatus: 'Aktiv' | 'Under reparation') => {
    try {
      const res = await fetch(`/api/select-care/${sc.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus, 
          notes: statusNotes,
          userId: user?.id,
          userName: `${user?.firstName} ${user?.lastName}`
        }),
      });
      if (res.ok) {
        setIsStatusModalOpen(false);
        setStatusNotes('');
        setSelectedSc(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddO365License = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem 
      ? `/api/o365-licenses/${editingItem.id}` 
      : `/api/o365-licenses`;
    const method = editingItem ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...o365Form, customerId: id }),
    });
    if (res.ok) {
      fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
      setO365Form({ licenseType: '', email: '', password: '', price: 0, startDate: '', bindingPeriod: 12, endDate: '', userId: 0, notes: '' });
      setNewO365Type('');
    } else {
      const errorData = await res.json();
      alert(`Fel vid sparning: ${errorData.error || res.statusText}`);
    }
  };

  const handleEdit = (type: 'user' | 'equipment' | 'it' | 'o365' | 'selectCare' | 'contracts' | 'drivingLogs', item: any) => {
    setEditingItem({ type, id: item.id });
    if (type === 'user') {
      setUserForm({ 
        firstName: item.firstName, 
        lastName: item.lastName, 
        email: item.email, 
        phone: item.phone, 
        role: item.role, 
        office: item.office,
        isAuthorizedBuyer: item.isAuthorizedBuyer || 0
      });
      setIsModalOpen(true);
    } else if (type === 'equipment') {
      setEquipmentForm({
        brand: item.brand,
        model: item.model,
        color: item.color,
        memory: item.memory,
        imei: item.imei,
        purchasePlace: item.purchasePlace,
        orderNumber: item.orderNumber,
        purchaseDate: item.purchaseDate,
        purchasePrice: item.purchasePrice,
        customerPrice: item.customerPrice,
        sellerId: item.sellerId || 0,
        userId: item.userId || 0,
        trackingNumber: item.trackingNumber || '',
        notes: item.notes || ''
      });
      setIsModalOpen(true);
    } else if (type === 'it') {
      setItForm({
        deviceName: item.deviceName,
        brand: item.brand,
        model: item.model,
        memory: item.memory || '',
        serialNumber: item.serialNumber,
        trackingNumber: item.trackingNumber || '',
        purchasePlace: item.purchasePlace || '',
        orderNumber: item.orderNumber || '',
        purchaseDate: item.purchaseDate || '',
        purchasePrice: item.purchasePrice || 0,
        customerPrice: item.customerPrice || 0,
        sellerId: item.sellerId || 0,
        userId: item.userId || 0,
        comment: item.comment || ''
      });
      setIsModalOpen(true);
    } else if (type === 'selectCare') {
      setScForm({
        brand: item.brand,
        model: item.model,
        color: item.color,
        memory: item.memory,
        imei: item.imei,
        purchasePlace: item.purchasePlace,
        orderNumber: item.orderNumber,
        purchaseDate: item.purchaseDate,
        purchasePrice: item.purchasePrice,
        monthlyFee: item.monthlyFee,
        userId: item.userId,
        contractPeriod: item.contractPeriod || 24,
        endDate: item.endDate || '',
        siemensContractNumber: item.siemensContractNumber || '',
        sellerId: item.sellerId || 0,
        trackingNumber: item.trackingNumber || ''
      });
      setIsModalOpen(true);
    } else if (type === 'o365') {
      setO365Form({
        licenseType: item.licenseType,
        email: item.email,
        password: item.password || '',
        price: item.price || 0,
        startDate: item.startDate,
        bindingPeriod: item.bindingPeriod,
        endDate: item.endDate,
        userId: item.userId || 0,
        notes: item.notes || ''
      });
      setIsModalOpen(true);
    } else if (type === 'contracts') {
      setContractForm({
        type: item.type,
        startDate: item.startDate,
        contractPeriod: item.contractPeriod,
        endDate: item.endDate,
        customFields: item.customFields || '',
        sellerId: item.sellerId || 0
      });
      setSelectedFiles([]);
      setIsModalOpen(true);
    } else if (type === 'drivingLogs') {
      setDrivingLogForm({
        regNo: item.regNo,
        driverName: item.driverName,
        email: item.email,
        deviceType: item.deviceType || '',
        schema: item.schema || '',
        monthlyFee: item.monthlyFee || 0,
        sellerId: item.sellerId || 0
      });
      setIsEditDrivingLogModalOpen(true);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerForm),
    });
    if (res.ok) {
      fetchData();
      setIsCustomerModalOpen(false);
    } else {
      const errorData = await res.json();
      alert(`Fel vid sparning: ${errorData.error || res.statusText}`);
    }
  };

  const handleDelete = async (type: string, itemId: number) => {
    console.log(`[Delete] Executing delete for ${type} with ID: ${itemId}`);
    
    try {
      console.log(`[Delete] Fetching DELETE /api/${type}/${itemId}`);
      const url = type === 'select-care' 
        ? `/api/${type}/${itemId}?deletedBy=${encodeURIComponent(user?.firstName + ' ' + user?.lastName)}` 
        : type === 'contracts'
        ? `/api/contracts/${itemId}?userId=${user?.id}&isAdmin=${user?.isAdmin}&role=${encodeURIComponent(user?.role || '')}`
        : `/api/${type}/${itemId}`;
        
      const res = await fetch(url, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`[Delete] Response status: ${res.status}`);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[Delete] Success:', data);
        await fetchData();
        setDeleteConfirm(null);
        console.log('[Delete] Data refreshed and modal closed');
      } else {
        let errorMessage = res.statusText;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.warn('[Delete] Could not parse error response as JSON');
        }
        console.error(`[Delete] Failed: ${errorMessage}`);
        alert(`Fel vid radering: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('[Delete] Network or unexpected error:', error);
      alert(`Ett oväntat fel uppstod vid radering: ${error.message}`);
    }
  };

  const handleSaveDrivingLogs = async () => {
    const lines = pasteData.split('\n').filter(line => line.trim());
    const logs = lines.map(line => {
      // Try splitting by tabs or multiple spaces first (common for Excel/Table copy-paste)
      const parts = line.split(/\t|\s{2,}/).filter(p => p.trim());
      if (parts.length >= 3) {
        return {
          regNo: parts[0].trim(),
          driverName: parts[1].trim(),
          email: parts[2].trim(),
          deviceType: parts[3]?.trim() || '',
          schema: parts[4]?.trim() || '',
          monthlyFee: parts[5] ? Number(parts[5].replace(/[^\d.,]/g, '').replace(',', '.')) : 0
        };
      } else {
        // Fallback for single space separated
        const spaceParts = line.split(/\s+/).filter(p => p.trim());
        if (spaceParts.length >= 3) {
          const email = spaceParts[spaceParts.length - 1];
          const regNo = spaceParts[0];
          const driverName = spaceParts.slice(1, -1).join(' ');
          return { regNo, driverName, email, deviceType: '', schema: '', monthlyFee: 0 };
        }
      }
      return null;
    }).filter(Boolean);

    if (logs.length === 0) {
      alert('Kunde inte tolka datan. Kontrollera formatet (Regnr Namn E-post).');
      return;
    }

    try {
      const res = await fetch(`/api/customers/${id}/driving-logs/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs, sellerId: drivingLogSellerId || user?.id })
      });

      if (res.ok) {
        setPasteData('');
        setIsDrivingLogModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save driving logs:', error);
      alert('Ett fel uppstod när körjournalerna skulle sparas.');
    }
  };

  const handleUpdateDrivingLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || editingItem.type !== 'drivingLogs') return;

    const res = await fetch(`/api/driving-logs/${editingItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...drivingLogForm, sellerId: drivingLogForm.sellerId || user?.id })
    });

    if (res.ok) {
      setIsEditDrivingLogModalOpen(false);
      setEditingItem(null);
      fetchData();
    }
  };

  if (loading) return <div>Laddar kunddata...</div>;
  if (!customer) return <div>Kund hittades inte.</div>;

  const authorizedBuyers = customer.users?.filter(u => u.isAuthorizedBuyer === 1) || [];

  return (
    <div className="space-y-8">
      <button onClick={() => navigate('/kunder')} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Tillbaka till kunder
      </button>

      <div className="bg-white dark:bg-slate-900 w-full min-h-[116px] p-6 md:p-8 mb-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 relative">
        {(user?.isAdmin === 1 || user?.isSupport === 1) && (
          <button 
            onClick={() => setIsCustomerModalOpen(true)}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
            title="Redigera kunduppgifter"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {customer.website ? (
                <img 
                  src={`https://img.logo.dev/${customer.website.replace(/^https?:\/\//, '').split('/')[0]}?token=${import.meta.env.VITE_LOGODEV_SECRET || 'pk_placeholder'}`} 
                  alt={customer.name}
                  className="w-full h-full object-contain p-2"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="w-8 h-8 md:w-10 md:h-10 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>';
                  }}
                />
              ) : (
                <Building2 className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-[23px] font-bold text-slate-900 dark:text-white truncate">{customer.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base mb-2">{customer.orgNumber}</p>
              
              <div className="flex flex-col gap-2">
                {customer.responsibleSeller && (
                  <div className="flex">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold">
                      <UserIcon className="w-3 h-3" />
                      Ansvarig säljare: {customer.responsibleSeller}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {customer.services && JSON.parse(customer.services).map((service: string) => (
                    <span key={service} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 text-sm border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800 md:mr-12">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" /> <span className="truncate">{customer.address}, {customer.zipCode} {customer.city}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <UserIcon className="w-4 h-4 text-slate-400 flex-shrink-0" /> <span className="truncate">{customer.contactPerson}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" /> <span className="truncate">{customer.contactPhone}</span>
            </div>
            {authorizedBuyers.length > 0 && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0" /> 
                <span className="truncate">
                  Behörig beställare: {authorizedBuyers.map(u => `${u.firstName} ${u.lastName}`).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 md:gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'users', label: 'Användare', icon: UsersIcon },
          { id: 'equipment', label: 'Utrustning', icon: Smartphone },
          { id: 'it', label: 'IT', icon: Monitor },
          { id: 'o365', label: 'O365 Licenser', icon: Mail },
          { id: 'drivingLogs', label: 'Körjournaler', icon: Calendar },
          { id: 'selectCare', label: 'Select Care', icon: ShieldCheck },
          { id: 'contracts', label: 'Avtal', icon: FileText },
          { id: 'support', label: 'Supportärenden', icon: Ticket },
        ].filter(tab => user?.role !== 'Kund' || tab.id !== 'contracts').map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-white dark:bg-slate-900 text-primary shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'selectCare' && customer?.selectCare?.some(sc => getExpirationStatus(sc.endDate) !== 'active') && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {activeTab === 'users' && 'Användare'}
            {activeTab === 'equipment' && 'Utrustning'}
            {activeTab === 'it' && 'IT-utrustning'}
            {activeTab === 'o365' && 'O365 Licenser'}
            {activeTab === 'selectCare' && 'Select Care Avtal'}
            {activeTab === 'contracts' && 'Avtal'}
            {activeTab === 'drivingLogs' && 'Körjournaler'}
            {activeTab === 'support' && 'Supportärenden'}
          </h2>
        {user?.role !== 'Kund' && (
          user?.isAdmin === 1 || 
          ((user?.isSupport === 1 || customer?.responsibleSeller === `${user?.firstName} ${user?.lastName}`) && !['users', 'equipment', 'it', 'o365', 'drivingLogs'].includes(activeTab))
        ) && activeTab !== 'support' && (
          <button 
            onClick={() => {
              if (activeTab === 'drivingLogs') {
                setIsDrivingLogModalOpen(true);
              } else {
                setEditingItem(null);
                if (activeTab === 'contracts') {
                  setContractForm({
                    type: 'Telefoniavtal',
                    startDate: new Date().toISOString().split('T')[0],
                    contractPeriod: 24,
                    endDate: '',
                    customFields: '',
                    sellerId: 0
                  });
                  setSelectedFiles([]);
                }
                setIsModalOpen(true);
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'users' && 'Lägg till användare'}
            {activeTab === 'equipment' && 'Lägg till utrustning'}
            {activeTab === 'it' && 'Lägg till utrustning'}
            {activeTab === 'o365' && 'Lägg till licens'}
            {activeTab === 'selectCare' && 'Lägg till avtal'}
            {activeTab === 'contracts' && 'Nytt avtal'}
            {activeTab === 'drivingLogs' && 'Uppdatera lista'}
          </button>
        )}
        </div>

        <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-[24px] border border-slate-200 dark:border-slate-800">
          <AnimatePresence mode="wait">
            {activeTab === 'users' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                {customer.users?.map(cUser => (
                  <div 
                    key={cUser.id} 
                    onClick={() => setSelectedSummary({ type: 'user', item: cUser })}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary transition-all cursor-pointer group shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-slate-700">
                        <UserIcon className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white truncate">{cUser.firstName} {cUser.lastName}</h4>
                            {cUser.isAuthorizedBuyer === 1 && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded uppercase tracking-wider">Beställare</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{cUser.role}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{cUser.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{cUser.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-slate-50 dark:border-slate-800">
                      {user?.isAdmin === 1 && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit('user', cUser); }} 
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'customer-users', id: cUser.id }); }} 
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'equipment' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                {customer.equipment?.map(eq => (
                  <div 
                    key={eq.id} 
                    onClick={() => setSelectedSummary({ type: 'equipment', item: eq })}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-transparent hover:border-primary transition-all cursor-pointer group shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white truncate">{eq.brand} {eq.model}</h4>
                          <p className="text-xs text-slate-500 truncate">{eq.color} • {eq.memory}</p>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">IMEI</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{eq.imei}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Inköpsdatum</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{eq.purchaseDate}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kollinummer</span>
                          {eq.trackingNumber ? (
                            <a 
                              href={`https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall/?shipmentId=${eq.trackingNumber}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary hover:underline truncate"
                            >
                              {eq.trackingNumber}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kundpris</span>
                          <span className="text-xs font-bold text-primary">{eq.customerPrice.toLocaleString()} kr</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-slate-50 dark:border-slate-800">
                      {user?.isAdmin === 1 && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit('equipment', eq); }} 
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'equipment', id: eq.id }); }} 
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'it' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                {customer.itEquipment?.map(it => (
                  <div 
                    key={it.id} 
                    onClick={() => setSelectedSummary({ type: 'it', item: it })}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-transparent hover:border-primary transition-all cursor-pointer group shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Monitor className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white truncate">{it.deviceName}</h4>
                          <p className="text-xs text-slate-500 truncate">{it.brand} {it.model} {it.memory && `• ${it.memory}`}</p>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Serienummer</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{it.serialNumber}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Inköpsdatum</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{it.purchaseDate}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kollinummer</span>
                          {it.trackingNumber ? (
                            <a 
                              href={`https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall/?shipmentId=${it.trackingNumber}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary hover:underline truncate"
                            >
                              {it.trackingNumber}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kundpris</span>
                          <span className="text-xs font-bold text-primary">{it.customerPrice.toLocaleString()} kr</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-slate-50 dark:border-slate-800">
                      {user?.isAdmin === 1 && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit('it', it); }} 
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'it-equipment', id: it.id }); }} 
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'o365' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                {customer.o365Licenses && customer.o365Licenses.length > 0 ? (
                  customer.o365Licenses.map(license => (
                    <div 
                      key={license.id} 
                      onClick={() => setSelectedSummary({ type: 'o365', item: license })}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-transparent hover:border-primary transition-all cursor-pointer group shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white whitespace-normal leading-tight">{license.licenseType}</h4>
                            <p className="text-xs text-slate-500 truncate">{license.email}</p>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Startdatum</span>
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{license.startDate}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Slutdatum</span>
                            <span className={cn("text-xs font-bold truncate", getExpirationStatus(license.endDate) === 'expired' ? 'text-red-500' : 'text-slate-600 dark:text-slate-400')}>
                              {license.endDate}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Användare</span>
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{license.userName || 'Ej kopplad'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pris</span>
                            <span className="text-xs font-bold text-primary">{license.price?.toLocaleString() || 0} kr</span>
                          </div>
                          {license.notes && (
                            <div className="flex flex-col md:col-span-5 mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Noteringar</span>
                              <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{license.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-slate-50 dark:border-slate-800">
                        {user?.isAdmin === 1 && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEdit('o365', license); }} 
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'o365-licenses', id: license.id }); }} 
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Mail className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">Inga O365 licenser registrerade</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'selectCare' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {/* Under Reparation Section */}
                {(customer.selectCare?.filter(sc => sc.status === 'Under reparation') || []).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-2">
                      <Wrench className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Under reparation</h3>
                    </div>
                    <div className="space-y-2">
                      {customer.selectCare?.filter(sc => sc.status === 'Under reparation').map(sc => {
                        const linkedUser = customer.users?.find(u => u.id === sc.userId);
                        return (
                          <div 
                            key={sc.id} 
                            className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
                                <div>
                                  <h4 className="font-bold text-slate-900 dark:text-white truncate">{sc.brand} {sc.model}</h4>
                                  <p className="text-xs text-amber-600 font-medium">Under reparation</p>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Användare</span>
                                  <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : 'Ej kopplad'}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">IMEI</span>
                                  <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{sc.imei}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kollinummer</span>
                                  {sc.trackingNumber ? (
                                    <a 
                                      href={`https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall/?shipmentId=${sc.trackingNumber}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs text-primary hover:underline truncate"
                                    >
                                      {sc.trackingNumber}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-400">-</span>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Senaste logg</span>
                                  <span className="text-xs text-slate-500 italic truncate">
                                    {sc.logs?.[0] ? (
                                      <>
                                        {sc.logs[0].timestamp.split('T')[0]}: {sc.logs[0].notes || 'Ingen anteckning'}
                                        {sc.logs[0].userName && <span className="ml-1 text-indigo-600 font-bold">({sc.logs[0].userName})</span>}
                                      </>
                                    ) : 'Ingen logg'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-slate-50 dark:border-slate-800">
                              <button 
                                onClick={() => { setSelectedSc(sc); setIsLogsModalOpen(true); }}
                                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-lg transition-colors"
                                title="Visa historik"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => { setSelectedSc(sc); setIsStatusModalOpen(true); }}
                                className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-colors"
                                title="Markera som klar"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active/Expired Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Aktiva avtal</h3>
                  </div>
                  <div className="space-y-2">
                    {(customer.selectCare?.filter(sc => sc.status !== 'Under reparation') || []).map(sc => {
                      const linkedUser = customer.users?.find(u => u.id === sc.userId);
                      const status = getExpirationStatus(sc.endDate);
                      return (
                        <div 
                          key={sc.id} 
                          onClick={() => setSelectedSummary({ type: 'selectCare', item: sc })}
                          className={cn(
                            "bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all cursor-pointer group shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4",
                            status === 'expired' ? "border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/5 hover:border-red-500" :
                            status === 'expiring-soon' ? "border-amber-200 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/5 hover:border-amber-500" :
                            "border-transparent hover:border-indigo-500"
                          )}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                              status === 'expired' ? "bg-red-100 dark:bg-red-900/30" :
                              status === 'expiring-soon' ? "bg-amber-100 dark:bg-amber-900/30" :
                              "bg-indigo-50 dark:bg-indigo-900/20"
                            )}>
                              {status !== 'active' ? (
                                <AlertTriangle className={cn(
                                  "w-5 h-5",
                                  status === 'expired' ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                                )} />
                              ) : (
                                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-center">
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white truncate">{sc.brand} {sc.model}</h4>
                                <p className="text-xs text-indigo-500 font-medium">Select Care Avtal</p>
                              </div>
                              <div className="flex items-center">
                                {status === 'expiring-soon' && (
                                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full uppercase tracking-wider whitespace-nowrap">Löper ut snart</span>
                                )}
                                {status === 'expired' && (
                                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold rounded-full uppercase tracking-wider whitespace-nowrap">Utgått</span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Användare</span>
                                <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : 'Ej kopplad'}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Månadsavgift</span>
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{sc.monthlyFee.toLocaleString()} kr/mån</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">IMEI</span>
                                <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{sc.imei}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kollinummer</span>
                                {sc.trackingNumber ? (
                                  <a 
                                    href={`https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall/?shipmentId=${sc.trackingNumber}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-primary hover:underline truncate"
                                  >
                                    {sc.trackingNumber}
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-slate-50 dark:border-slate-800">
                            {user?.role !== 'Kund' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedSc(sc); setIsLogsModalOpen(true); }}
                                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-lg transition-colors"
                                title="Visa historik"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            )}
                            {user?.role !== 'Kund' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedSc(sc); setIsStatusModalOpen(true); }}
                                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-lg transition-colors"
                                title="Skicka på reparation"
                              >
                                <Wrench className="w-4 h-4" />
                              </button>
                            )}
                            {user?.role !== 'Kund' && (user?.isAdmin === 1 || user?.isSupport === 1 || customer?.responsibleSeller === `${user?.firstName} ${user?.lastName}`) && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEdit('selectCare', sc); }} 
                                  className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation(); 
                                    console.log('Delete button clicked for SC:', sc.id);
                                    setDeleteConfirm({ type: 'select-care', id: sc.id }); 
                                  }} 
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors relative z-10"
                                  title="Radera avtal"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'contracts' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Avtalshantering</h3>
                    <p className="text-sm text-slate-500">Här listas alla aktiva och utgångna avtal för {customer.name}</p>
                  </div>
                </div>

                {contracts.length > 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800">
                            <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Typ</th>
                            <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start</th>
                            <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Slut</th>
                            <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period</th>
                            <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Åtgärder</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contracts.map((contract) => {
                            const status = getExpirationStatus(contract.endDate);
                            return (
                              <tr 
                                key={contract.id}
                                onClick={() => setSelectedSummary({ type: 'contract', item: contract })}
                                className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                              >
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <FileText className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{contract.type}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                    status === 'expired' ? "text-red-600 bg-red-50 border-red-100" :
                                    status === 'expiring-soon' ? "text-amber-600 bg-amber-50 border-amber-100" :
                                    "text-emerald-600 bg-emerald-50 border-emerald-100"
                                  )}>
                                    {status === 'expired' ? 'Utgått' : status === 'expiring-soon' ? 'Löper ut snart' : 'Aktivt'}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-xs font-medium text-slate-600 dark:text-slate-400">{contract.startDate}</td>
                                <td className="py-4 px-6 text-xs font-bold text-slate-900 dark:text-white">{contract.endDate}</td>
                                <td className="py-4 px-6 text-xs text-slate-500">{contract.contractPeriod} mån</td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(user?.isAdmin === 1 || user?.isSupport === 1 || customer?.responsibleSeller === `${user?.firstName} ${user?.lastName}`) && (
                                      <>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleEdit('contracts', contract); }}
                                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'contracts', id: contract.id }); }}
                                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-10 h-10 text-slate-200" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Inga avtal registrerade</h4>
                    <p className="text-slate-500 max-w-xs mx-auto">Lägg till kundens första avtal för att börja hantera deras bindningstider och dokument.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'drivingLogs' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Registrerade körjournaler</h3>
                      <p className="text-sm text-slate-500">Totalt {drivingLogs.length} aktiva körjournaler för {customer.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Total månadskostnad</p>
                      <p className="text-xl font-black text-primary">
                        {drivingLogs.reduce((sum, log) => sum + (log.monthlyFee || 0), 0).toLocaleString()} kr
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reg.nr</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Användare</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">E-post</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Typ av enhet</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Schema</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Månadskostnad</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Åtgärder</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drivingLogs.length > 0 ? (
                          drivingLogs.map((log) => (
                            <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-3 px-4 font-mono text-sm font-bold text-primary uppercase">{log.regNo}</td>
                              <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 font-medium">{log.driverName}</td>
                              <td className="py-3 px-4 text-sm text-slate-500">{log.email}</td>
                              <td className="py-3 px-4 text-sm text-slate-500">{log.deviceType || '-'}</td>
                              <td className="py-3 px-4 text-sm text-slate-500">{log.schema || '-'}</td>
                              <td className="py-3 px-4 text-sm font-bold text-slate-900 dark:text-white text-right">
                                {log.monthlyFee ? `${log.monthlyFee.toLocaleString()} kr` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {user?.isAdmin === 1 && (
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => handleEdit('drivingLogs', log)}
                                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete('driving-logs', log.id)}
                                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-12 text-center text-slate-400 italic">Inga körjournaler registrerade</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'support' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Supportärenden</h3>
                    <p className="text-sm text-slate-500">Här visas de senaste supportärendena för {customer.name}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/support?customerId=${customer.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all font-bold text-sm"
                  >
                    Se alla ärenden
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {supportTickets.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {supportTickets.slice(0, 6).map((ticket) => {
                      const status = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['Registrerad'];
                      const StatusIcon = status.icon;
                      
                      return (
                        <div 
                          key={ticket.id}
                          onClick={() => navigate(`/support?ticketId=${ticket.id}`)}
                          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className={cn("p-2.5 rounded-xl flex-shrink-0", status.color.split(' ')[1])}>
                                <StatusIcon className={cn("w-5 h-5", status.color.split(' ')[0])} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                    {ticket.title}
                                  </h4>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG]
                                  )}>
                                    {ticket.priority}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    #{ticket.id}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                status.color
                              )}>
                                {ticket.status}
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Ticket className="w-10 h-10 text-slate-200" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Inga supportärenden</h4>
                    <p className="text-slate-500 max-w-xs mx-auto">Det finns inga registrerade supportärenden för den här kunden än.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {activeTab === 'selectCare' && (
          <div className="mt-12 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              Historik - Raderade Select Care Avtal
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-[24px] border border-slate-200 dark:border-slate-800">
              {customer.selectCareHistory && customer.selectCareHistory.length > 0 ? (
                <div className="space-y-2">
                  {customer.selectCareHistory.map(history => {
                    const linkedUser = customer.users?.find(u => u.id === history.userId);
                    return (
                      <div 
                        key={history.id}
                        onClick={() => setSelectedSummary({ type: 'selectCareHistory', item: history })}
                        className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 opacity-75 grayscale-[0.5] flex items-center justify-between gap-4 cursor-pointer hover:opacity-100 hover:grayscale-0 transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white truncate">{history.brand} {history.model}</h4>
                              <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Borttaget: {new Date(history.deletedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Användare</span>
                              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : 'Ej kopplad'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Månadsavgift</span>
                              <span className="text-xs font-bold text-slate-500">{history.monthlyFee.toLocaleString()} kr/mån</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Avtalsperiod</span>
                              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{history.contractPeriod} mån ({history.endDate})</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kollinummer</span>
                              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{history.trackingNumber || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-slate-500 text-sm">Ingen historik tillgänglig ännu.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Redigera kunduppgifter</h2>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUpdateCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Företagsnamn</label>
                  <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organisationsnummer</label>
                  <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={customerForm.orgNumber} onChange={e => setCustomerForm({...customerForm, orgNumber: e.target.value})} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adress</label>
                  <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Postnummer</label>
                  <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={customerForm.zipCode} onChange={e => setCustomerForm({...customerForm, zipCode: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ort</label>
                  <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={customerForm.city} onChange={e => setCustomerForm({...customerForm, city: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kontaktperson</label>
                  <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={customerForm.contactPerson} onChange={e => setCustomerForm({...customerForm, contactPerson: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Telefonnummer</label>
                  <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={customerForm.contactPhone} onChange={e => setCustomerForm({...customerForm, contactPhone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ansvarig säljare</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary appearance-none"
                    value={customerForm.responsibleSeller}
                    onChange={e => setCustomerForm({...customerForm, responsibleSeller: e.target.value})}
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
                  <input className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="t.ex. google.com" value={customerForm.website} onChange={e => setCustomerForm({...customerForm, website: e.target.value})} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tjänster</label>
                  <div className="flex flex-wrap gap-2">
                    {['Telefoni', 'IT', 'Select Care', 'Körjournaler', 'Avtalshantering'].map(service => {
                      const currentServices = customerForm.services ? JSON.parse(customerForm.services) : [];
                      const isSelected = currentServices.includes(service);
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => {
                            const nextServices = isSelected 
                              ? currentServices.filter((s: string) => s !== service)
                              : [...currentServices, service];
                            setCustomerForm({...customerForm, services: JSON.stringify(nextServices)});
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                            isSelected 
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-none" 
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                          )}
                        >
                          {service}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-6 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Avbryt</button>
                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity">Spara ändringar</button>
              </div>
            </form>
          </motion.div>
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
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Bekräfta radering</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Är du säker på att du vill radera detta objekt? Denna åtgärd går inte att ångra.
                  {deleteConfirm.type === 'select-care' && ' Avtalet kommer dock att sparas i historiken.'}
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
                  onClick={() => handleDelete(deleteConfirm.type, deleteConfirm.id)}
                  className="py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all active:scale-95"
                >
                  Ja, radera
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {selectedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sammanställning</h2>
              <button onClick={() => setSelectedSummary(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45 text-slate-500" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              {selectedSummary.type === 'user' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSummary.item.firstName} {selectedSummary.item.lastName}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-slate-500 font-medium">{selectedSummary.item.role}</p>
                        {selectedSummary.item.isAuthorizedBuyer === 1 && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded uppercase tracking-wider">Behörig beställare</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">E-post</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.email}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Telefon</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.phone}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Kontor</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.office}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Roll</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.role}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Användar-ID</p>
                      <p className="text-slate-900 dark:text-white font-semibold">#{selectedSummary.item.id}</p>
                    </div>
                  </div>

                  {/* Linked Services Summary */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Kopplade tjänster</h4>
                    
                    {/* Equipment */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Utrustning</p>
                      {(customer?.equipment?.filter(eq => eq.userId === selectedSummary.item.id)?.length ?? 0) > 0 ? (
                        customer?.equipment?.filter(eq => eq.userId === selectedSummary.item.id).map(eq => (
                          <div 
                            key={eq.id} 
                            onClick={() => setSelectedSummary({ type: 'equipment', item: eq })}
                            className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all cursor-pointer group"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{eq.brand} {eq.model}</p>
                              <p className="text-[10px] text-slate-500">{eq.imei}</p>
                            </div>
                            <Smartphone className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">Ingen utrustning kopplad</p>
                      )}
                    </div>

                    {/* IT Equipment */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">IT-utrustning</p>
                      {(customer?.itEquipment?.filter(it => it.userId === selectedSummary.item.id)?.length ?? 0) > 0 ? (
                        customer?.itEquipment?.filter(it => it.userId === selectedSummary.item.id).map(it => (
                          <div 
                            key={it.id} 
                            onClick={() => setSelectedSummary({ type: 'it', item: it })}
                            className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all cursor-pointer group"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{it.deviceName}</p>
                              <p className="text-[10px] text-slate-500">{it.brand} {it.model}</p>
                            </div>
                            <Monitor className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">Ingen IT-utrustning kopplad</p>
                      )}
                    </div>

                    {/* Select Care */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Select Care</p>
                      {(customer?.selectCare?.filter(sc => sc.userId === selectedSummary.item.id)?.length ?? 0) > 0 ? (
                        customer?.selectCare?.filter(sc => sc.userId === selectedSummary.item.id).map(sc => (
                          <div 
                            key={sc.id} 
                            onClick={() => setSelectedSummary({ type: 'selectCare', item: sc })}
                            className="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl flex items-center justify-between border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer group"
                          >
                            <div>
                              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{sc.brand} {sc.model}</p>
                              <p className="text-[10px] text-indigo-600/60 dark:text-indigo-400/60 font-medium">{sc.imei} • {sc.contractPeriod} mån • {sc.endDate}</p>
                            </div>
                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">Inget Select Care-avtal kopplat</p>
                      )}
                    </div>

                    {/* Driving Logs */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Körjournaler</p>
                      {drivingLogs.filter(log => log.email === selectedSummary.item.email).length > 0 ? (
                        drivingLogs.filter(log => log.email === selectedSummary.item.email).map(log => (
                          <div 
                            key={log.id} 
                            onClick={() => setSelectedSummary({ type: 'drivingLog', item: log })}
                            className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-all cursor-pointer group"
                          >
                            <div>
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{log.regNo}</p>
                              <p className="text-[10px] text-emerald-500">{log.deviceType} • {log.schema}</p>
                            </div>
                            <Calendar className="w-4 h-4 text-emerald-400" />
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">Inga körjournaler kopplade</p>
                      )}
                    </div>

                    {/* O365 Licenses */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">O365 Licenser</p>
                      {(customer?.o365Licenses?.filter(lic => lic.userId === selectedSummary.item.id)?.length ?? 0) > 0 ? (
                        customer?.o365Licenses?.filter(lic => lic.userId === selectedSummary.item.id).map(lic => (
                          <div 
                            key={lic.id} 
                            onClick={() => {
                              setShowPassword(false);
                              setSelectedSummary({ type: 'o365', item: lic });
                            }}
                            className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl flex items-center justify-between border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-all cursor-pointer group"
                          >
                            <div>
                              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{lic.licenseType}</p>
                              <p className="text-[10px] text-blue-600/60 dark:text-blue-400/60 font-medium">
                                {lic.email} • {lic.price} kr • {lic.bindingPeriod} mån • {lic.endDate}
                              </p>
                            </div>
                            <Mail className="w-4 h-4 text-blue-400" />
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">Inga O365-licenser kopplade</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedSummary.type === 'drivingLog' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSummary.item.regNo}</h3>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedSummary.item.driverName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">E-post</p>
                      <p className="text-slate-900 dark:text-white font-semibold truncate">{selectedSummary.item.email}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Enhetstyp</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.deviceType || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Schema</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.schema || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Månadsavgift</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{selectedSummary.item.monthlyFee?.toLocaleString() || 0} kr/mån</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Registrerad</p>
                    <p className="text-slate-900 dark:text-white font-semibold">{new Date(selectedSummary.item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {selectedSummary.type === 'it' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Monitor className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSummary.item.deviceName}</h3>
                      <p className="text-slate-500 font-medium">{selectedSummary.item.brand} {selectedSummary.item.model} {selectedSummary.item.memory && `• ${selectedSummary.item.memory}`}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Serienummer</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.serialNumber}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Ordernummer</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.orderNumber}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpsdatum</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchaseDate}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpsställe</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchasePlace}</p>
                    </div>
                    {user?.role !== 'Kund' && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpspris</p>
                        <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchasePrice.toLocaleString()} kr</p>
                      </div>
                    )}
                    <div className="p-4 bg-primary/5 rounded-2xl space-y-1 border border-primary/10">
                      <p className="text-[10px] text-primary uppercase font-bold tracking-widest">Kundpris</p>
                      <p className="text-primary font-bold text-lg">{selectedSummary.item.customerPrice.toLocaleString()} kr</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Kollinummer</p>
                      {selectedSummary.item.trackingNumber ? (
                        <a 
                          href={`https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall/?shipmentId=${selectedSummary.item.trackingNumber}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary font-semibold hover:underline"
                        >
                          {selectedSummary.item.trackingNumber}
                        </a>
                      ) : (
                        <p className="text-slate-400 font-semibold">-</p>
                      )}
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Kopplad till</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.userName || 'Ej kopplad'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Kommentar</p>
                      <p className="text-slate-900 dark:text-white font-medium whitespace-pre-wrap">{selectedSummary.item.comment || 'Ingen kommentar'}</p>
                    </div>
                    {user?.role !== 'Kund' && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl space-y-1 border border-emerald-100 dark:border-emerald-900/30 col-span-2">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-widest">TB (Täckningsbidrag)</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                            {(selectedSummary.item.customerPrice - selectedSummary.item.purchasePrice).toLocaleString()} kr
                          </p>
                          <p className="text-emerald-500 text-sm font-medium">
                            ({selectedSummary.item.customerPrice > 0 
                              ? (((selectedSummary.item.customerPrice - selectedSummary.item.purchasePrice) / selectedSummary.item.customerPrice) * 100).toFixed(1) 
                              : '0'}%)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedSummary.type === 'o365' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSummary.item.licenseType}</h3>
                      <p className="text-slate-500 font-medium">{selectedSummary.item.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Startdatum</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.startDate}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Slutdatum</p>
                      <p className={cn("font-bold", getExpirationStatus(selectedSummary.item.endDate) === 'expired' ? 'text-red-500' : 'text-slate-900 dark:text-white')}>
                        {selectedSummary.item.endDate}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Bindningstid</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.bindingPeriod} månader</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl space-y-1 border border-primary/10">
                      <p className="text-[10px] text-primary uppercase font-bold tracking-widest">Pris</p>
                      <p className="text-primary font-bold text-lg">{selectedSummary.item.price?.toLocaleString() || 0} kr</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Kopplad till</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.userName || 'Ej kopplad'}</p>
                    </div>
                    {user?.isAdmin === 1 && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 col-span-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Lösenord</p>
                        <div className="flex items-center justify-between">
                          <p className="text-slate-900 dark:text-white font-mono font-semibold">
                            {showPassword ? selectedSummary.item.password : '••••••••'}
                          </p>
                          <button 
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-primary text-xs font-bold hover:underline"
                          >
                            {showPassword ? 'Dölj' : 'Visa'}
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedSummary.item.notes && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 col-span-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Noteringar</p>
                        <p className="text-slate-900 dark:text-white font-medium whitespace-pre-wrap">{selectedSummary.item.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedSummary.type === 'equipment' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Smartphone className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSummary.item.brand} {selectedSummary.item.model}</h3>
                      <p className="text-slate-500 font-medium">{selectedSummary.item.color} • {selectedSummary.item.memory}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">IMEI / Serie</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.imei}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Ordernummer</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.orderNumber}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpsdatum</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchaseDate}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpsställe</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchasePlace}</p>
                    </div>
                    {user?.role !== 'Kund' && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpspris</p>
                        <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchasePrice.toLocaleString()} kr</p>
                      </div>
                    )}
                    <div className="p-4 bg-primary/5 rounded-2xl space-y-1 border border-primary/10">
                      <p className="text-[10px] text-primary uppercase font-bold tracking-widest">Kundpris</p>
                      <p className="text-primary font-bold text-lg">{selectedSummary.item.customerPrice.toLocaleString()} kr</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Kollinummer</p>
                      {selectedSummary.item.trackingNumber ? (
                        <a 
                          href={`https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall/?shipmentId=${selectedSummary.item.trackingNumber}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary font-semibold hover:underline"
                        >
                          {selectedSummary.item.trackingNumber}
                        </a>
                      ) : (
                        <p className="text-slate-400 font-semibold">-</p>
                      )}
                    </div>
                    {user?.role !== 'Kund' && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl space-y-1 border border-emerald-100 dark:border-emerald-900/30 col-span-2">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-widest">TB (Täckningsbidrag)</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                            {(selectedSummary.item.customerPrice - selectedSummary.item.purchasePrice).toLocaleString()} kr
                          </p>
                          <p className="text-emerald-500 text-sm font-medium">
                            ({selectedSummary.item.customerPrice > 0 
                              ? (((selectedSummary.item.customerPrice - selectedSummary.item.purchasePrice) / selectedSummary.item.customerPrice) * 100).toFixed(1) 
                              : '0'}%)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedSummary.item.notes && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Noteringar</p>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">{selectedSummary.item.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedSummary.type === 'selectCare' && (
                <div className="space-y-6">
                  {getExpirationStatus(selectedSummary.item.endDate) !== 'active' && (
                    <div className={cn(
                      "p-4 rounded-2xl flex items-center gap-4 border",
                      getExpirationStatus(selectedSummary.item.endDate) === 'expired' 
                        ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-200"
                        : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-200"
                    )}>
                      <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-sm">
                          {getExpirationStatus(selectedSummary.item.endDate) === 'expired' 
                            ? 'Detta avtal har löpt ut!' 
                            : 'Detta avtal löper ut inom 6 månader!'}
                        </p>
                        <p className="text-xs opacity-80">Slutdatum: {selectedSummary.item.endDate}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                      <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSummary.item.brand} {selectedSummary.item.model}</h3>
                      <p className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedSummary.item.color} • {selectedSummary.item.memory}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Användare</p>
                      <p className="text-slate-900 dark:text-white font-semibold">
                        {customer.users?.find(u => u.id === selectedSummary.item.userId)?.firstName} {customer.users?.find(u => u.id === selectedSummary.item.userId)?.lastName || 'Ej kopplad'}
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl space-y-1 border border-indigo-100 dark:border-indigo-900/30">
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-widest">Månadsavgift</p>
                      <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{selectedSummary.item.monthlyFee.toLocaleString()} kr/mån</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">IMEI</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.imei}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Självrisk</p>
                      <p className="text-slate-900 dark:text-white font-semibold">1500 kr</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Avtalstid</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.contractPeriod} månader</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Slutdatum</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.endDate}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpsställe</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchasePlace}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Ordernummer</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.orderNumber}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpsdatum</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchaseDate}</p>
                    </div>
                    {user?.role !== 'Kund' && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpspris</p>
                        <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchasePrice.toLocaleString()} kr</p>
                      </div>
                    )}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Siemens avtalsnummer</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.siemensContractNumber || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Kollinummer</p>
                      {selectedSummary.item.trackingNumber ? (
                        <a 
                          href={`https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall/?shipmentId=${selectedSummary.item.trackingNumber}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary font-semibold hover:underline"
                        >
                          {selectedSummary.item.trackingNumber}
                        </a>
                      ) : (
                        <p className="text-slate-900 dark:text-white font-semibold">-</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedSummary.type === 'selectCareHistory' && (
                <div className="space-y-6">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-4 text-red-800 dark:text-red-200">
                    <Trash2 className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Detta avtal har raderats</p>
                      <p className="text-xs opacity-80">Raderat: {new Date(selectedSummary.item.deletedAt).toLocaleString()}</p>
                      <p className="text-xs opacity-80 font-bold">Raderat av: {selectedSummary.item.deletedBy || 'Okänd'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                      <ShieldCheck className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSummary.item.brand} {selectedSummary.item.model}</h3>
                      <p className="text-slate-500 font-bold">{selectedSummary.item.color} • {selectedSummary.item.memory}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Användare</p>
                      <p className="text-slate-900 dark:text-white font-semibold">
                        {customer.users?.find(u => u.id === selectedSummary.item.userId)?.firstName} {customer.users?.find(u => u.id === selectedSummary.item.userId)?.lastName || 'Ej kopplad'}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Månadsavgift</p>
                      <p className="text-slate-900 dark:text-white font-bold">{selectedSummary.item.monthlyFee.toLocaleString()} kr/mån</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">IMEI</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.imei}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Avtalstid</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.contractPeriod} månader</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Slutdatum</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.endDate}</p>
                    </div>
                    {user?.role !== 'Kund' && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inköpspris</p>
                        <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.purchasePrice.toLocaleString()} kr</p>
                      </div>
                    )}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Siemens avtalsnummer</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.siemensContractNumber || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Kollinummer</p>
                      {selectedSummary.item.trackingNumber ? (
                        <a 
                          href={`https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall/?shipmentId=${selectedSummary.item.trackingNumber}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary font-semibold hover:underline"
                        >
                          {selectedSummary.item.trackingNumber}
                        </a>
                      ) : (
                        <p className="text-slate-900 dark:text-white font-semibold">-</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {selectedSummary.type === 'contract' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSummary.item.type}</h3>
                      <p className="text-slate-500 font-medium">Bindningstid: {selectedSummary.item.contractPeriod} månader</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Startdatum</p>
                      <p className="text-slate-900 dark:text-white font-semibold">{selectedSummary.item.startDate}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Slutdatum</p>
                      <p className="text-slate-900 dark:text-white font-bold">{selectedSummary.item.endDate}</p>
                    </div>
                  </div>

                  {selectedSummary.item.customFields && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Övrig information</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedSummary.item.customFields}</p>
                    </div>
                  )}

                  {selectedSummary.item.files && selectedSummary.item.files.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Dokument ({selectedSummary.item.files.length})</p>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedSummary.item.files.map((file: any) => (
                          <div 
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 group/file"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <FileIcon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {file.mimeType === 'application/pdf' && (
                                <button 
                                  onClick={() => setViewingPdf({ url: `/api/files/${file.id}`, name: file.name })}
                                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                  title="Förhandsgranska"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <a 
                                href={`/api/files/${file.id}/download`}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-all"
                                title="Ladda ner"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              {(user?.isAdmin === 1 || user?.isSupport === 1 || customer?.responsibleSeller === `${user?.firstName} ${user?.lastName}`) && (
                                <button 
                                  onClick={async () => {
                                    if (confirm('Radera fil?')) {
                                      await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
                                      fetchData();
                                      // Update the local state in selectedSummary if needed, or just close and let user re-open
                                      setSelectedSummary(null);
                                    }
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                  title="Radera"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setSelectedSummary(null)} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl">Stäng</button>
            </div>
          </motion.div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingItem ? 'Redigera' : 'Lägg till'} {
                  activeTab === 'users' ? 'användare' : 
                  activeTab === 'equipment' ? 'utrustning' : 
                  activeTab === 'it' ? 'utrustning' :
                  activeTab === 'o365' ? 'O365 licens' :
                  'Select Care avtal'
                }
              </h2>
              <button onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45 text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'users' && (
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Namn</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={userForm.firstName} onChange={e => setUserForm({...userForm, firstName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Efternamn</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={userForm.lastName} onChange={e => setUserForm({...userForm, lastName: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">E-post</label>
                    <input type="email" required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Telefonnummer</label>
                    <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Roll</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Kontor</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={userForm.office} onChange={e => setUserForm({...userForm, office: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input 
                      type="checkbox" 
                      id="isAuthorizedBuyer"
                      className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={userForm.isAuthorizedBuyer === 1}
                      onChange={e => setUserForm({...userForm, isAuthorizedBuyer: e.target.checked ? 1 : 0})}
                    />
                    <label htmlFor="isAuthorizedBuyer" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Behörig beställare</label>
                  </div>
                  <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl mt-4">Spara användare</button>
                </form>
              )}

              {(activeTab === 'equipment' || activeTab === 'selectCare') && (
                <form onSubmit={activeTab === 'equipment' ? handleAddEquipment : handleAddSC} className="space-y-4">
                  {user?.isAdmin === 1 && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Säljare (Statistik)</label>
                      <select 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                        value={activeTab === 'equipment' ? equipmentForm.sellerId : scForm.sellerId} 
                        onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, sellerId: Number(e.target.value)}) : setScForm({...scForm, sellerId: Number(e.target.value)})}
                      >
                        <option value={user.id}>Mig själv ({user.firstName})</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Märke</label>
                      <div className="flex gap-2">
                        <select 
                          required 
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                          value={activeTab === 'equipment' ? equipmentForm.brand : scForm.brand}
                          onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, brand: e.target.value}) : setScForm({...scForm, brand: e.target.value})}
                        >
                          <option value="">Välj märke</option>
                          {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input 
                          placeholder="Nytt märke..." 
                          className="flex-1 px-4 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={newBrand}
                          onChange={e => setNewBrand(e.target.value)}
                        />
                        <button type="button" onClick={handleAddBrand} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">Lägg till</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Modell</label>
                      <div className="flex gap-2">
                        <select 
                          required 
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                          value={activeTab === 'equipment' ? equipmentForm.model : scForm.model}
                          onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, model: e.target.value}) : setScForm({...scForm, model: e.target.value})}
                        >
                          <option value="">Välj modell</option>
                          {suggestions.models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input 
                          placeholder="Ny modell..." 
                          className="flex-1 px-4 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={newModel}
                          onChange={e => setNewModel(e.target.value)}
                        />
                        <button type="button" onClick={handleAddModel} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">Lägg till</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Färg</label>
                      <div className="flex gap-2">
                        <select 
                          required 
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                          value={activeTab === 'equipment' ? equipmentForm.color : scForm.color}
                          onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, color: e.target.value}) : setScForm({...scForm, color: e.target.value})}
                        >
                          <option value="">Välj färg</option>
                          {suggestions.colors.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input 
                          placeholder="Ny färg..." 
                          className="flex-1 px-4 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={newColor}
                          onChange={e => setNewColor(e.target.value)}
                        />
                        <button type="button" onClick={handleAddColor} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">Lägg till</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Minne</label>
                      <div className="flex gap-2">
                        <select 
                          required 
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                          value={activeTab === 'equipment' ? equipmentForm.memory : scForm.memory}
                          onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, memory: e.target.value}) : setScForm({...scForm, memory: e.target.value})}
                        >
                          <option value="">Välj minne</option>
                          {suggestions.memories.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input 
                          placeholder="Nytt minne..." 
                          className="flex-1 px-4 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={newMemory}
                          onChange={e => setNewMemory(e.target.value)}
                        />
                        <button type="button" onClick={handleAddMemory} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">Lägg till</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">IMEI / Serienummer</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={activeTab === 'equipment' ? equipmentForm.imei : scForm.imei} onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, imei: e.target.value}) : setScForm({...scForm, imei: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Kollinummer</label>
                      <input className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={activeTab === 'equipment' ? equipmentForm.trackingNumber : scForm.trackingNumber} onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, trackingNumber: e.target.value}) : setScForm({...scForm, trackingNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Inköpsställe</label>
                      <select 
                        required 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                        value={activeTab === 'equipment' ? equipmentForm.purchasePlace : scForm.purchasePlace} 
                        onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, purchasePlace: e.target.value}) : setScForm({...scForm, purchasePlace: e.target.value})}
                      >
                        <option value="">Välj inköpsställe</option>
                        <option value="Telefonshoppen">Telefonshoppen</option>
                        <option value="Dustin">Dustin</option>
                        <option value="Netonnet">Netonnet</option>
                        <option value="Elgiganten">Elgiganten</option>
                        <option value="Power">Power</option>
                        <option value="Komplett">Komplett</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Ordernummer</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={activeTab === 'equipment' ? equipmentForm.orderNumber : scForm.orderNumber} onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, orderNumber: e.target.value}) : setScForm({...scForm, orderNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Inköpsdatum</label>
                      <input type="date" required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={activeTab === 'equipment' ? equipmentForm.purchaseDate : scForm.purchaseDate} onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, purchaseDate: e.target.value}) : setScForm({...scForm, purchaseDate: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Inköpspris</label>
                      <input type="number" required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={activeTab === 'equipment' ? equipmentForm.purchasePrice : scForm.purchasePrice} onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, purchasePrice: Number(e.target.value)}) : setScForm({...scForm, purchasePrice: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      {activeTab === 'equipment' ? 'Kundpris' : 'Kundens månadsavgift'}
                    </label>
                    <input type="number" required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={activeTab === 'equipment' ? equipmentForm.customerPrice : scForm.monthlyFee} onChange={e => activeTab === 'equipment' ? setEquipmentForm({...equipmentForm, customerPrice: Number(e.target.value)}) : setScForm({...scForm, monthlyFee: Number(e.target.value)})} />
                  </div>

                  {activeTab === 'equipment' && equipmentForm.purchasePrice > 0 && equipmentForm.customerPrice > 0 && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">TB (Vinst)</span>
                        <div className="text-right">
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {(equipmentForm.customerPrice - equipmentForm.purchasePrice).toLocaleString()} kr
                          </p>
                          <p className="text-[10px] text-emerald-500 font-bold">
                            {(((equipmentForm.customerPrice - equipmentForm.purchasePrice) / equipmentForm.customerPrice) * 100).toFixed(1)}% marginal
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'equipment' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Koppla till användare</label>
                      <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={equipmentForm.userId} onChange={e => setEquipmentForm({...equipmentForm, userId: Number(e.target.value)})}>
                        <option value="0">Välj användare (valfritt)</option>
                        {customer?.users?.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                      </select>
                    </div>
                  )}
                  {activeTab === 'selectCare' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Avtalstid (månader)</label>
                          <div className="flex gap-2">
                            <select 
                              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                              value={[12, 24, 36, 48].includes(scForm.contractPeriod) ? scForm.contractPeriod : ''}
                              onChange={e => setScForm({...scForm, contractPeriod: Number(e.target.value)})}
                            >
                              <option value="">Annan...</option>
                              <option value="12">12 mån</option>
                              <option value="24">24 mån</option>
                              <option value="36">36 mån</option>
                              <option value="48">48 mån</option>
                            </select>
                            <input 
                              type="number" 
                              placeholder="Månader..." 
                              className="w-24 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                              value={scForm.contractPeriod}
                              onChange={e => setScForm({...scForm, contractPeriod: Number(e.target.value)})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Slutdatum</label>
                          <input 
                            type="date" 
                            readOnly 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none cursor-not-allowed" 
                            value={scForm.endDate} 
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Koppla till användare</label>
                        <select required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={scForm.userId} onChange={e => setScForm({...scForm, userId: Number(e.target.value)})}>
                          <option value="0">Välj användare</option>
                          {customer?.users?.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Siemens avtalsnummer</label>
                        <input 
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                          value={scForm.siemensContractNumber} 
                          onChange={e => setScForm({...scForm, siemensContractNumber: e.target.value})} 
                          placeholder="Ange Siemens avtalsnummer..."
                        />
                      </div>
                    </>
                  )}
                  {activeTab === 'equipment' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Noteringar</label>
                      <textarea 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary resize-none" 
                        rows={3}
                        value={equipmentForm.notes} 
                        onChange={e => setEquipmentForm({...equipmentForm, notes: e.target.value})} 
                        placeholder="Skriv några noteringar..."
                      />
                    </div>
                  )}
                  <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl mt-4">Spara {activeTab === 'equipment' ? 'utrustning' : 'avtal'}</button>
                </form>
              )}

              {activeTab === 'it' && (
                <form onSubmit={handleAddITEquipment} className="space-y-4">
                  {user?.isAdmin === 1 && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Säljare (Statistik)</label>
                      <select 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                        value={itForm.sellerId} 
                        onChange={e => setItForm({...itForm, sellerId: Number(e.target.value)})}
                      >
                        <option value={user.id}>Mig själv ({user.firstName})</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Enhetsnamn</label>
                    <input 
                      required 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                      value={itForm.deviceName} 
                      onChange={e => setItForm({...itForm, deviceName: e.target.value})} 
                      placeholder="T.ex. Ronnys Dator, Kontorsskrivare..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Märke</label>
                      <div className="flex gap-2">
                        <select 
                          required 
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                          value={itForm.brand}
                          onChange={e => setItForm({...itForm, brand: e.target.value})}
                        >
                          <option value="">Välj märke</option>
                          {itSuggestions.brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input 
                          placeholder="Nytt märke..." 
                          className="flex-1 px-4 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={newBrand}
                          onChange={e => setNewBrand(e.target.value)}
                        />
                        <button type="button" onClick={handleAddBrand} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">Lägg till</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Modell</label>
                      <div className="flex gap-2">
                        <select 
                          required 
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                          value={itForm.model}
                          onChange={e => setItForm({...itForm, model: e.target.value})}
                        >
                          <option value="">Välj modell</option>
                          {itSuggestions.models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input 
                          placeholder="Ny modell..." 
                          className="flex-1 px-4 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={newModel}
                          onChange={e => setNewModel(e.target.value)}
                        />
                        <button type="button" onClick={handleAddModel} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">Lägg till</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Minne</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                          value={itForm.memory}
                          onChange={e => setItForm({...itForm, memory: e.target.value})}
                        >
                          <option value="">Välj minne (valfritt)</option>
                          {itSuggestions.memory.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input 
                          placeholder="Nytt minne..." 
                          className="flex-1 px-4 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={newMemory}
                          onChange={e => setNewMemory(e.target.value)}
                        />
                        <button type="button" onClick={handleAddMemory} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">Lägg till</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Serienummer</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={itForm.serialNumber} onChange={e => setItForm({...itForm, serialNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Kollinummer</label>
                      <input className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={itForm.trackingNumber} onChange={e => setItForm({...itForm, trackingNumber: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Inköpsställe</label>
                      <div className="flex gap-2">
                        <select 
                          required 
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                          value={itForm.purchasePlace}
                          onChange={e => setItForm({...itForm, purchasePlace: e.target.value})}
                        >
                          <option value="">Välj inköpsställe</option>
                          {itSuggestions.purchasePlaces.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input 
                          placeholder="Nytt inköpsställe..." 
                          className="flex-1 px-4 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={newPurchasePlace}
                          onChange={e => setNewPurchasePlace(e.target.value)}
                        />
                        <button type="button" onClick={() => handleAddITPurchasePlace(newPurchasePlace)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">Lägg till</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Ordernummer</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={itForm.orderNumber} onChange={e => setItForm({...itForm, orderNumber: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Inköpsdatum</label>
                      <input type="date" required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={itForm.purchaseDate} onChange={e => setItForm({...itForm, purchaseDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Inköpspris</label>
                      <input type="number" required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={itForm.purchasePrice} onChange={e => setItForm({...itForm, purchasePrice: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Kundpris</label>
                      <input type="number" required className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={itForm.customerPrice} onChange={e => setItForm({...itForm, customerPrice: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Koppla till användare</label>
                    <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" value={itForm.userId} onChange={e => setItForm({...itForm, userId: Number(e.target.value)})}>
                      <option value="0">Välj användare (valfritt)</option>
                      {customer?.users?.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Kommentar</label>
                    <textarea 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                      value={itForm.comment}
                      onChange={e => setItForm({...itForm, comment: e.target.value})}
                      placeholder="Ange kommentar..."
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl mt-4">Spara IT-utrustning</button>
                </form>
              )}

              {activeTab === 'o365' && (
                <form onSubmit={handleAddO365License} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Licenstyp</label>
                    <div className="flex gap-2">
                      <select 
                        required 
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                        value={o365Form.licenseType}
                        onChange={e => setO365Form({...o365Form, licenseType: e.target.value})}
                      >
                        <option value="">Välj licenstyp</option>
                        {o365LicenseTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input 
                        placeholder="Ny licenstyp..." 
                        className="flex-1 px-4 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        value={newO365Type}
                        onChange={e => setNewO365Type(e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          if (newO365Type.trim()) {
                            setO365LicenseTypes([...o365LicenseTypes, { id: Date.now(), name: newO365Type.trim() }]);
                            setO365Form({ ...o365Form, licenseType: newO365Type.trim() });
                            setNewO365Type('');
                          }
                        }} 
                        className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold"
                      >
                        Lägg till
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">E-post</label>
                    <input 
                      type="email" 
                      required 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                      value={o365Form.email} 
                      onChange={e => setO365Form({...o365Form, email: e.target.value})} 
                      placeholder="Ange e-post..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Lösenord (valfritt)</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                        value={o365Form.password} 
                        onChange={e => setO365Form({...o365Form, password: e.target.value})} 
                        placeholder="Ange lösenord..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Pris (valfritt)</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                        value={o365Form.price} 
                        onChange={e => setO365Form({...o365Form, price: Number(e.target.value)})} 
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Startdatum</label>
                      <input 
                        type="date" 
                        required 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                        value={o365Form.startDate} 
                        onChange={e => setO365Form({...o365Form, startDate: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Bindningstid (mån)</label>
                      <input 
                        type="number" 
                        required 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                        value={o365Form.bindingPeriod} 
                        onChange={e => setO365Form({...o365Form, bindingPeriod: Number(e.target.value)})} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Slutdatum (beräknas automatiskt)</label>
                    <input 
                      type="date" 
                      readOnly 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none cursor-not-allowed" 
                      value={o365Form.endDate} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Koppla till användare</label>
                    <div className="relative">
                      <select 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                        value={o365Form.userId} 
                        onChange={e => setO365Form({...o365Form, userId: Number(e.target.value)})}
                      >
                        <option value="0">Välj användare (valfritt)</option>
                        {customer?.users?.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Noteringar</label>
                    <textarea 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary min-h-[100px]" 
                      value={o365Form.notes} 
                      onChange={e => setO365Form({...o365Form, notes: e.target.value})} 
                      placeholder="Ange noteringar om licensen..."
                    />
                  </div>

                  <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl mt-4">Spara O365 licens</button>
                </form>
              )}

              {activeTab === 'contracts' && (
                <form onSubmit={handleAddContract} className="space-y-4">
                  {user?.isAdmin === 1 && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Säljare (Statistik)</label>
                      <select 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" 
                        value={contractForm.sellerId} 
                        onChange={e => setContractForm({...contractForm, sellerId: Number(e.target.value)})}
                      >
                        <option value={user.id}>Mig själv ({user.firstName})</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Avtalstyp</label>
                    <select 
                      required 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                      value={contractForm.type}
                      onChange={e => setContractForm({...contractForm, type: e.target.value})}
                    >
                      <option value="Telefoniavtal">Telefoniavtal</option>
                      <option value="Växelavtal">Växelavtal</option>
                      <option value="IT-avtal">IT-avtal</option>
                      <option value="Licensavtal">Licensavtal</option>
                      <option value="Annat">Annat</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Startdatum</label>
                      <input 
                        type="date" 
                        required 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                        value={contractForm.startDate}
                        onChange={e => setContractForm({...contractForm, startDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Bindningstid (mån)</label>
                      <input 
                        type="number" 
                        required 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                        value={contractForm.contractPeriod}
                        onChange={e => setContractForm({...contractForm, contractPeriod: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Slutdatum</label>
                    <input 
                      type="date" 
                      readOnly 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none cursor-not-allowed"
                      value={contractForm.endDate}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Övrig information</label>
                    <textarea 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                      value={contractForm.customFields}
                      onChange={e => setContractForm({...contractForm, customFields: e.target.value})}
                      placeholder="Ange eventuell övrig information..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Ladda upp dokument (PDF/Excel)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        multiple 
                        accept=".pdf,.xlsx,.xls"
                        onChange={e => {
                          if (e.target.files) {
                            setSelectedFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                      <Upload className="w-8 h-8 text-slate-300 group-hover:text-primary mx-auto mb-2 transition-colors" />
                      <p className="text-sm text-slate-500 font-medium">Klicka för att välja filer eller dra och släpp</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">PDF eller Excel</p>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Valda filer ({selectedFiles.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                              <FileIcon className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{file.name}</span>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Sparar...
                      </>
                    ) : (
                      editingItem ? 'Uppdatera avtal' : 'Spara avtal'
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
      {/* Driving Logs Modal */}
      {/* Status Update Modal */}
      <AnimatePresence>
        {isStatusModalOpen && selectedSc && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Uppdatera status</h3>
                <button onClick={() => setIsStatusModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                    <Smartphone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{selectedSc.brand} {selectedSc.model}</p>
                    <p className="text-xs text-slate-500">IMEI: {selectedSc.imei}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleUpdateStatus(selectedSc, 'Aktiv')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        selectedSc.status === 'Aktiv' ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-100 dark:border-slate-800 hover:border-emerald-200"
                      )}
                    >
                      <CheckCircle2 className={cn("w-6 h-6", selectedSc.status === 'Aktiv' ? "text-emerald-600" : "text-slate-300")} />
                      <span className="text-xs font-bold uppercase tracking-wider">Aktiv</span>
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(selectedSc, 'Under reparation')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        selectedSc.status === 'Under reparation' ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" : "border-slate-100 dark:border-slate-800 hover:border-amber-200"
                      )}
                    >
                      <Wrench className={cn("w-6 h-6", selectedSc.status === 'Under reparation' ? "text-amber-600" : "text-slate-300")} />
                      <span className="text-xs font-bold uppercase tracking-wider">Reparation</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Anteckning (valfritt)</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                      rows={3}
                      placeholder="T.ex. Sprucken skärm, inskickad till verkstad..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logs Modal */}
      <AnimatePresence>
        {isLogsModalOpen && selectedSc && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                    <History className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Logghistorik</h3>
                    <p className="text-xs text-slate-500">{selectedSc.brand} {selectedSc.model}</p>
                  </div>
                </div>
                <button onClick={() => setIsLogsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {selectedSc.logs && selectedSc.logs.length > 0 ? (
                  <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                    {selectedSc.logs.map((log, idx) => (
                      <div key={log.id} className="relative pl-12">
                        <div className={cn(
                          "absolute left-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm",
                          log.toStatus === 'Under reparation' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                          {log.toStatus === 'Under reparation' ? <Wrench className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {log.fromStatus} → {log.toStatus}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-medium">
                                <UserIcon className="w-3 h-3" />
                                <span>Utförd av: {log.userName || 'System'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                              <Clock className="w-3 h-3" />
                              {log.timestamp.replace('T', ' ').split('.')[0]}
                            </div>
                          </div>
                          {log.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Ingen historik tillgänglig</p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setIsLogsModalOpen(false)}
                  className="w-full py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all"
                >
                  Stäng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPdf && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingPdf(null)}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{viewingPdf.name}</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Förhandsgranskning</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingPdf(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
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

      <AnimatePresence>
        {isDrivingLogModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Uppdatera körjournaler</h3>
                <button onClick={() => setIsDrivingLogModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                {user?.isAdmin === 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Säljare (Statistik)</label>
                    <select 
                      className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                      value={drivingLogSellerId}
                      onChange={(e) => setDrivingLogSellerId(Number(e.target.value))}
                    >
                      <option value={user.id}>Mig själv ({user.firstName})</option>
                      {sellers.map(s => (
                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Klistra in data</label>
                  <p className="text-xs text-slate-500 mb-2">Klistra in rader med formatet: Regnr Namn E-post Typ Schema Månadskostnad (tab- eller mellanslagsseparerat)</p>
                  <textarea
                    rows={12}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white font-mono text-sm resize-none"
                    placeholder="AAT846 Andreas Forsberg andreas.forsberg86@gmail.com..."
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsDrivingLogModalOpen(false)}
                  className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Avbryt
                </button>
                <button 
                  onClick={handleSaveDrivingLogs}
                  className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
                >
                  Spara körjournaler
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isEditDrivingLogModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Redigera körjournal</h3>
                <button onClick={() => setIsEditDrivingLogModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateDrivingLog} className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Reg.nr</label>
                    <input 
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white font-mono uppercase"
                      value={drivingLogForm.regNo}
                      onChange={e => setDrivingLogForm({...drivingLogForm, regNo: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Användare</label>
                    <input 
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                      value={drivingLogForm.driverName}
                      onChange={e => setDrivingLogForm({...drivingLogForm, driverName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">E-post</label>
                  <input 
                    required
                    type="email"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                    value={drivingLogForm.email}
                    onChange={e => setDrivingLogForm({...drivingLogForm, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Typ av enhet</label>
                    <input 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                      value={drivingLogForm.deviceType}
                      onChange={e => setDrivingLogForm({...drivingLogForm, deviceType: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Schema</label>
                    <input 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                      value={drivingLogForm.schema}
                      onChange={e => setDrivingLogForm({...drivingLogForm, schema: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Månadskostnad</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                    value={drivingLogForm.monthlyFee}
                    onChange={e => setDrivingLogForm({...drivingLogForm, monthlyFee: parseFloat(e.target.value) || 0})}
                  />
                </div>
                {user?.isAdmin === 1 && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Säljare (Statistik)</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                      value={drivingLogForm.sellerId || 0}
                      onChange={e => setDrivingLogForm({...drivingLogForm, sellerId: Number(e.target.value)})}
                    >
                      <option value={user.id}>Mig själv ({user.firstName})</option>
                      {sellers.map(s => (
                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsEditDrivingLogModalOpen(false)}
                    className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Avbryt
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
                  >
                    Spara ändringar
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
