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
  Calendar
} from 'lucide-react';
import { 
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
import { Stats } from '../types';
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

  useEffect(() => {
    if (user) {
      fetch(`/api/stats?sellerId=${user.id}&isAdmin=${user.isAdmin === 1}`)
        .then(res => res.json())
        .then(data => {
          setStats(data);
          setLoading(false);
        });
    }
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64">Laddar statistik...</div>;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  
  const chartData = stats?.equipmentSales?.map((sale, index) => {
    const scSale = stats.selectCareSales?.find(sc => sc.month === sale.month);
    return {
      name: monthNames[index],
      mobiler: sale.count,
      selectCare: scSale ? scSale.count : 0
    };
  }) || [];

  const currentMonthIndex = new Date().getMonth();
  const currentMonthStats = {
    mobiler: stats?.equipmentSales?.[currentMonthIndex]?.count || 0,
    selectCare: stats?.selectCareSales?.[currentMonthIndex]?.count || 0
  };

  const cards = [
    { 
      title: 'Antal kunder', 
      value: stats?.customerCount || 0, 
      icon: Users, 
      color: 'bg-blue-500',
      description: 'Totala kunder i systemet'
    },
    { 
      title: 'Aktiva larm', 
      value: stats?.expiringSelectCare.length || 0, 
      icon: AlertTriangle, 
      color: stats?.expiringSelectCare.length ? 'bg-red-500' : 'bg-slate-400',
      description: 'Avtal som löper ut snart'
    },
    { 
      title: 'Körjournaler', 
      value: stats?.drivingLogsCount || 0, 
      icon: Calendar, 
      color: 'bg-amber-500',
      description: 'Registrerade körjournaler'
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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Översikt</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Välkommen {user?.firstName} {user?.lastName} till Select Telecom Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.map((card, i) => (
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Månadsstatistik</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Sålda mobiler denna månad</p>
                  <p className="text-xs text-slate-500">Baserat på senaste data</p>
                </div>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {currentMonthStats.mobiler}
              </span>
            </div>
 
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Select Care avtal denna månad</p>
                  <p className="text-xs text-slate-500">Nya tecknade avtal</p>
                </div>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {currentMonthStats.selectCare}
              </span>
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
