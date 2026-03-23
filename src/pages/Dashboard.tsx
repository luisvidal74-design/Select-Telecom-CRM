import { useEffect, useState } from 'react';
import { 
  Users, 
  Smartphone, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign,
  Award,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Filter,
  Monitor
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell,
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Stats, User } from '../types';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import NotificationModal from '../components/NotificationModal';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [sellers, setSellers] = useState<User[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (user?.isAdmin === 1 || user?.isSupport === 1) {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          const filteredSellers = data.filter((s: User) => 
            s.role?.includes('Säljare') || (s.isAdmin !== 1 && s.isSupport !== 1 && !s.role)
          );
          setSellers(filteredSellers);
        })
        .catch(err => console.error('Error fetching sellers:', err));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const sellerIdToFetch = selectedSellerId || user.id;
      const isAdminFlag = user.isAdmin === 1 || user.isSupport === 1;
      
      // If admin and no specific seller selected, we fetch global stats (no sellerId in query if we want global)
      // But based on my server.ts change, if sellerId is provided, it filters.
      // So if selectedSellerId is empty, we should probably NOT send sellerId if we want global stats.
      
      let url = `/api/stats?isAdmin=${isAdminFlag}&year=${selectedYear}`;
      if (selectedSellerId) {
        url += `&sellerId=${selectedSellerId}`;
      } else if (!isAdminFlag) {
        url += `&sellerId=${user.id}`;
      }

      fetch(url)
        .then(res => res.json())
        .then(data => {
          setStats(data);
          setLoading(false);
        });
    }
  }, [user, selectedSellerId, selectedYear]);

  if (loading) return <div className="flex items-center justify-center h-64">Laddar statistik...</div>;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  
  const chartData = stats?.equipmentSales.map((sale, index) => {
    const scSale = stats.selectCareSales.find(sc => sc.month === sale.month);
    const dlSale = stats.drivingLogSales.find(dl => dl.month === sale.month);
    const itSale = stats.itEquipmentSales.find(it => it.month === sale.month);
    return {
      name: monthNames[index],
      mobiler: sale.count,
      selectCare: scSale ? scSale.count : 0,
      korjournaler: dlSale ? dlSale.count : 0,
      it: itSale ? itSale.count : 0
    };
  }) || [];

  const currentMonthIndex = new Date().getMonth();
  const currentMonthStats = {
    mobiler: stats?.equipmentSales[currentMonthIndex]?.count || 0,
    selectCare: stats?.selectCareSales[currentMonthIndex]?.count || 0,
    korjournaler: stats?.drivingLogSales[currentMonthIndex]?.count || 0,
    it: stats?.itEquipmentSales[currentMonthIndex]?.count || 0
  };

  const cards = [
    { 
      title: 'Antal kunder', 
      value: stats?.customerCount || 0, 
      icon: Users, 
      color: 'bg-blue-500',
      description: (user?.isAdmin === 1 || user?.isSupport === 1) ? 'Totala kunder i systemet' : 'Kunder jag ansvarar för'
    },
    { 
      title: 'Aktiva larm', 
      value: stats?.expiringSelectCare.length || 0, 
      icon: AlertTriangle, 
      color: stats?.expiringSelectCare.length ? 'bg-red-500' : 'bg-slate-400',
      description: (user?.isAdmin === 1 || user?.isSupport === 1) ? 'Avtal som löper ut snart' : 'Mina avtal som löper ut snart'
    },
    { 
      title: 'Omsättning IT', 
      value: `${(stats?.itRevenue || 0).toLocaleString()} kr`, 
      icon: Monitor, 
      color: 'bg-sky-500',
      description: 'Total IT-försäljning'
    },
    { 
      title: 'Omsättning Körjournaler', 
      value: `${(stats?.drivingLogRevenue || 0).toLocaleString()} kr`, 
      icon: DollarSign, 
      color: 'bg-orange-500',
      description: 'Månadsavgifter totalt'
    },
    { 
      title: 'Omsättning Mobiler', 
      value: `${(stats?.equipmentRevenue || 0).toLocaleString()} kr`, 
      icon: DollarSign, 
      color: 'bg-emerald-500',
      description: 'Total försäljning'
    },
    { 
      title: 'Omsättning Select Care', 
      value: `${(stats?.selectCareRevenue || 0).toLocaleString()} kr`, 
      icon: TrendingUp, 
      color: 'bg-indigo-500',
      description: 'Månadsavgifter totalt'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Översikt</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Välkommen {user?.firstName} {user?.lastName} till Select Telecom Dashboard
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
            >
              {[0, 1, 2, 3, 4].map(i => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>

          {(user?.isAdmin === 1 || user?.isSupport === 1) && (
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer min-w-[200px]"
              >
                <option value="">Alla säljare (Globalt)</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.slice(0, 3).map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={card.title === 'Aktiva larm' ? () => setIsNotificationModalOpen(true) : undefined}
            className={cn(
              "bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800",
              card.title === 'Aktiva larm' && "cursor-pointer hover:border-red-500 transition-colors"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.color} text-white shadow-lg`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{card.description}</p>
          </motion.div>
        ))}

        {stats?.topSellers && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-amber-500 text-white rounded-lg shadow-lg">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Toppsäljare</h3>
            </div>
            <div className="space-y-2">
              {stats.topSellers.map((seller, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className={cn(
                    "text-slate-600 dark:text-slate-400 font-medium",
                    user?.firstName === seller.firstName && user?.lastName === seller.lastName && "text-blue-600 dark:text-blue-400 font-bold"
                  )}>
                    {idx + 1}. {seller.firstName} {seller.lastName}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {seller.totalRevenue.toLocaleString()} kr
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        
        {cards.slice(3).map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 4) * 0.1 }}
            onClick={card.title === 'Aktiva larm' ? () => setIsNotificationModalOpen(true) : undefined}
            className={cn(
              "bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800",
              card.title === 'Aktiva larm' && "cursor-pointer hover:border-red-500 transition-colors"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.color} text-white shadow-lg`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{card.description}</p>
          </motion.div>
        ))}

        {stats?.topMobiles && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-500 text-white rounded-lg shadow-lg">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Mest sålda mobiler</h3>
            </div>
            <div className="space-y-2">
              {stats.topMobiles.length > 0 ? (
                stats.topMobiles.map((mobile, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {idx + 1}. {mobile.brand} {mobile.model}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {mobile.count} st
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">Ingen data tillgänglig</p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Försäljningstrend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }} 
                />
                <Legend iconType="circle" />
                <Line 
                  type="monotone" 
                  dataKey="mobiler" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 4, strokeWidth: 2, fill: 'white' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Sålda Mobiler" 
                />
                <Line 
                  type="monotone" 
                  dataKey="selectCare" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ r: 4, strokeWidth: 2, fill: 'white' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Select Care" 
                />
                <Line 
                  type="monotone" 
                  dataKey="korjournaler" 
                  stroke="#f59e0b" 
                  strokeWidth={4} 
                  dot={{ r: 4, strokeWidth: 2, fill: 'white' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Körjournaler" 
                />
                <Line 
                  type="monotone" 
                  dataKey="it" 
                  stroke="#0ea5e9" 
                  strokeWidth={4} 
                  dot={{ r: 4, strokeWidth: 2, fill: 'white' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="IT" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <TrendingUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Månadsstatistik</h3>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              Månadsvis <ChevronRight className="w-3 h-3 rotate-90" />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-8 flex-1">
            <div className="flex flex-col gap-3 w-full lg:w-1/2">
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex flex-col">
                  <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                    {currentMonthStats.mobiler + currentMonthStats.selectCare + currentMonthStats.it + currentMonthStats.korjournaler}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1">Totalt</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'Mobiler', value: currentMonthStats.mobiler, color: '#8b5cf6', icon: Smartphone, bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400' },
                  { name: 'Select Care', value: currentMonthStats.selectCare, color: '#10b981', icon: ShieldCheck, bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
                  { name: 'IT', value: currentMonthStats.it, color: '#0ea5e9', icon: Monitor, bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-600 dark:text-sky-400' },
                  { name: 'Körjournaler', value: currentMonthStats.korjournaler, color: '#f59e0b', icon: Calendar, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
                ].map((item) => {
                  return (
                    <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className={cn("p-2 rounded-lg", item.bg, item.text)}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{item.name} – {item.value} st</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 w-full h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Mobiler', value: currentMonthStats.mobiler || 0, fill: '#8b5cf6' },
                      { name: 'Select Care', value: currentMonthStats.selectCare || 0, fill: '#10b981' },
                      { name: 'IT', value: currentMonthStats.it || 0, fill: '#0ea5e9' },
                      { name: 'Körjournaler', value: currentMonthStats.korjournaler || 0, fill: '#f59e0b' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-slate-800 p-2 px-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {payload[0].name}: {payload[0].value}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      <NotificationModal 
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        items={stats?.expiringSelectCare || []}
      />
    </div>
  );
}
