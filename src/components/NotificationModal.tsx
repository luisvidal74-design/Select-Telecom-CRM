import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, ShieldCheck, Calendar, ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SelectCare } from '../types';
import { cn } from '../lib/utils';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
}

export default function NotificationModal({ isOpen, onClose, items }: NotificationModalProps) {
  // Sort items by endDate (closest first)
  const sortedItems = [...items].sort((a, b) => {
    if (!a.endDate) return 1;
    if (!b.endDate) return -1;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-red-50/30 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Aktiva larm</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Avtal som löper ut inom 6 månader</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {sortedItems.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Inga aktiva larm just nu</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sortedItems.map((item, idx) => {
                    const isSelectCare = !!item.brand;
                    const title = isSelectCare ? `${item.brand} ${item.model}` : item.type;
                    const link = isSelectCare ? `/kunder/${item.customerId}?tab=selectCare` : '/avtal';

                    return (
                      <Link 
                        key={`${item.id}-${idx}`} 
                        to={link}
                        onClick={onClose}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                            {isSelectCare ? (
                              <ShieldCheck className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            ) : (
                              <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{title}</p>
                            <p className="text-xs text-slate-500">{item.customerName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Slutdatum</p>
                            <p className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1 justify-end">
                              <Calendar className="w-3.5 h-3.5" />
                              {item.endDate}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Visar totalt {sortedItems.length} avtal som kräver åtgärd
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
