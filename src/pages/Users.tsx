import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, Shield, User as UserIcon, Mail, Phone, Edit2, Trash2, MoreVertical, ShieldAlert, UserCheck, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/users/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchUsers();
  };

  const handleDeleteUser = async (user: User) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    const res = await fetch(`/api/users/${userToDelete.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      fetchUsers();
      setIsDetailsModalOpen(false);
      setUserToDelete(null);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const res = await fetch(`/api/users/${selectedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });

    if (res.ok) {
      fetchUsers();
      setIsEditModalOpen(false);
      setSelectedUser(null);
    }
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isAdmin: user.isAdmin,
      isSupport: user.isSupport
    });
    setIsEditModalOpen(true);
  };

  const openDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Användarhantering</h1>
        <p className="text-slate-500 dark:text-slate-400">Godkänn nya konton och hantera roller</p>
      </div>

      {pendingUsers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-amber-600 flex items-center gap-2">
            <Shield className="w-5 h-5" /> Väntar på godkännande
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {pendingUsers.map(user => (
              <motion.div 
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</h4>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleStatus(user.id, 'approved')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4" /> Godkänn
                  </button>
                  <button 
                    onClick={() => handleStatus(user.id, 'rejected')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" /> Avböj
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* User Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-700">
                <button 
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute -bottom-12 left-8">
                  <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-900 p-1 shadow-xl">
                    <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                      {selectedUser.profilePic ? (
                        <img src={selectedUser.profilePic} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="w-10 h-10 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-16 p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      selectedUser.isAdmin ? "bg-primary/10 text-primary" : 
                      selectedUser.isSupport ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" :
                      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      {selectedUser.role || (selectedUser.isAdmin ? 'Admin' : selectedUser.isSupport ? 'Support' : 'Säljare')}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600" /> Aktiv
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">E-post</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Telefon</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedUser.phone || 'Ej angivet'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => { setIsDetailsModalOpen(false); openEdit(selectedUser); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:opacity-90 transition-opacity"
                  >
                    <Edit2 className="w-4 h-4" /> Redigera
                  </button>
                  {currentUser?.id !== selectedUser.id && (
                    <button 
                      onClick={() => handleDeleteUser(selectedUser)}
                      className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Redigera användare</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Förnamn</label>
                    <input 
                      type="text"
                      value={editForm.firstName || ''}
                      onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Efternamn</label>
                    <input 
                      type="text"
                      value={editForm.lastName || ''}
                      onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Roll</label>
                  <input 
                    type="text"
                    value={editForm.role || ''}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    placeholder="t.ex. Säljare, Support"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Telefon</label>
                  <input 
                    type="text"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Administratör</p>
                      <p className="text-[10px] text-slate-500">Full tillgång till systemet</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({...editForm, isAdmin: editForm.isAdmin ? 0 : 1})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      editForm.isAdmin ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                      editForm.isAdmin ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Support</p>
                      <p className="text-[10px] text-slate-500">Kan hantera kunder och se översikt</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({...editForm, isSupport: editForm.isSupport ? 0 : 1})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      editForm.isSupport ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                      editForm.isSupport ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="pt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 -mx-6 px-6 mt-6">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Avbryt
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20"
                  >
                    Spara
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Aktiva användare</h2>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Namn</th>
                <th className="px-6 py-4">Roll</th>
                <th className="px-6 py-4">Kontakt</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Åtgärder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {approvedUsers.map(user => (
                <tr 
                  key={user.id} 
                  onClick={() => openDetails(user)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                        {user.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <UserIcon className="w-4 h-4 text-slate-400" />}
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      user.isAdmin ? "bg-primary/10 text-primary" : 
                      user.isSupport ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" :
                      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      {user.role || (user.isAdmin ? 'Admin' : user.isSupport ? 'Support' : 'Säljare')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500"><Mail className="w-3 h-3" /> {user.email}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500"><Phone className="w-3 h-3" /> {user.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-xs font-bold text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" /> Aktiv
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEdit(user)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {currentUser?.id !== user.id && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    {/* Delete User Confirmation Modal */}
    <AnimatePresence>
      {userToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-8"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Radera användare?</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Är du säker på att du vill radera användaren <span className="font-bold text-slate-900 dark:text-white">"{userToDelete.firstName} {userToDelete.lastName}"</span>? Detta går inte att ångra.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-colors"
                >
                  Ja, radera
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </div>
  );
}
