import React, { useEffect, useState } from 'react';
import { Plus, Search, Bell, Calendar, User, Trash2, Edit2, ChevronRight, X, Image as ImageIcon, Upload } from 'lucide-react';
import { News } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';

export default function NewsPage() {
  const { user } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as News[];
      setNews(newsData);
    }, (error) => {
      console.error('Failed to fetch news:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setFormData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      if (editingNews) {
        const newsRef = doc(db, 'news', editingNews.id.toString());
        await updateDoc(newsRef, {
          title: formData.title,
          content: formData.content,
          imageUrl: formData.imageUrl,
          updatedAt: Timestamp.now().toDate().toISOString()
        });
      } else {
        await addDoc(collection(db, 'news'), {
          title: formData.title,
          content: formData.content,
          imageUrl: formData.imageUrl,
          authorId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: Timestamp.now().toDate().toISOString(),
          updatedAt: Timestamp.now().toDate().toISOString()
        });
      }

      setIsModalOpen(false);
      setEditingNews(null);
      setFormData({ title: '', content: '', imageUrl: '' });
    } catch (error) {
      console.error('Failed to save news:', error);
      alert('Ett tekniskt fel uppstod. Kontrollera din internetanslutning.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Är du säker på att du vill radera denna nyhet?')) return;
    try {
      await deleteDoc(doc(db, 'news', id.toString()));
      if (selectedNews?.id === id) setSelectedNews(null);
    } catch (error) {
      console.error('Failed to delete news:', error);
    }
  };

  const handleEdit = (item: News) => {
    setEditingNews(item);
    setFormData({ title: item.title, content: item.content, imageUrl: item.imageUrl || '' });
    setIsModalOpen(true);
  };

  const filteredNews = news.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Nyheter</h1>
          <p className="text-slate-500 dark:text-slate-400">Håll dig uppdaterad om utrustning, Select Care och annat</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Sök i nyheter..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {user?.isAdmin && (
            <button 
              onClick={() => {
                setEditingNews(null);
                setFormData({ title: '', content: '', imageUrl: '' });
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Nytt inlägg
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredNews.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedNews(item)}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary transition-all cursor-pointer group shadow-sm relative overflow-hidden flex flex-col md:flex-row"
          >
            {item.imageUrl && (
              <div className="w-full md:w-48 h-48 md:h-auto flex-shrink-0 relative overflow-hidden">
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
                  <Bell className="w-3 h-3" />
                  <span>Information</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                  {item.content.replace(/[#*`]/g, '')}
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(item.createdAt)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {item.firstName} {item.lastName}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {user?.isAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </motion.div>
        ))}

        {filteredNews.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Inga nyheter hittades</h3>
            <p className="text-slate-500 dark:text-slate-400">Prova att söka på något annat eller lägg till en nyhet.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nyhet</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(selectedNews.createdAt)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                <div className="max-w-none prose dark:prose-invert prose-slate">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                    {selectedNews.title}
                  </h1>
                  <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-500">
                      {(selectedNews.firstName || '?')[0]}{(selectedNews.lastName || '?')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedNews.firstName || 'Okänd'} {selectedNews.lastName || 'författare'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Publicerad av administratör</p>
                    </div>
                  </div>
                  {selectedNews.imageUrl && (
                    <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <img 
                        src={selectedNews.imageUrl} 
                        alt={selectedNews.title} 
                        className="w-full h-auto"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="markdown-body text-slate-600 dark:text-slate-300 leading-relaxed">
                    <Markdown>{selectedNews.content}</Markdown>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingNews ? 'Redigera nyhet' : 'Skapa nyhet'}
                  </h3>
                  <button 
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Rubrik</label>
                    <input
                      required
                      type="text"
                      disabled={isSubmitting}
                      placeholder="Ange en rubrik..."
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white font-medium disabled:opacity-50"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Bild (Klistra in eller ladda upp)</label>
                    <div className="flex flex-col gap-4">
                      {formData.imageUrl ? (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-primary group">
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                            className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          <label className={cn(
                            "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group",
                            isSubmitting && "opacity-50 cursor-not-allowed"
                          )}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary mb-2" />
                              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Klicka för att ladda upp eller klistra in bild</p>
                              <p className="text-xs text-slate-400 mt-1">PNG, JPG upp till 10MB</p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={handleImageUpload}
                              disabled={isSubmitting}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Innehåll (Markdown stöds)</label>
                    <textarea
                      required
                      rows={8}
                      disabled={isSubmitting}
                      onPaste={handleImagePaste}
                      placeholder="Skriv din nyhet här... Du kan använda Markdown för formatering. Du kan även klistra in bilder här!"
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white font-medium resize-none disabled:opacity-50"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
                  <button 
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Avbryt
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sparar...
                      </>
                    ) : (
                      editingNews ? 'Spara ändringar' : 'Publicera'
                    )}
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
