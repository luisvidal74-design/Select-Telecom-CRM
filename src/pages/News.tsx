import React, { useEffect, useState } from 'react';
import { Plus, Search, Bell, Calendar, User, Trash2, Edit2, ChevronRight, X, Image as ImageIcon, Upload } from 'lucide-react';
import { News } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

export default function NewsPage() {
  const { user, updateUser } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [newsToDelete, setNewsToDelete] = useState<News | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    imageSize: 'large' as 'small' | 'medium' | 'large'
  });

  const isPrivileged = user && (user.isAdmin === 1 || user.role === 'Administratör' || user.role === 'Support');

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      setNews(data);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    }
  };

  useEffect(() => {
    fetchNews();
    
    // Mark news as read when visiting the page
    const markAsRead = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/users/${user.id}/read-news`, { method: 'POST' });
        if (res.ok) {
          const { timestamp } = await res.json();
          updateUser({ ...user, lastReadNewsTimestamp: timestamp });
          // Dispatch event to refresh count in Layout
          window.dispatchEvent(new CustomEvent('refresh-news-count'));
        }
      } catch (error) {
        console.error('Failed to mark news as read:', error);
      }
    };
    markAsRead();
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
      const url = editingNews ? `/api/news/${editingNews.id}` : '/api/news';
      const method = editingNews ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          authorId: user.id
        })
      });

      if (res.ok) {
        const updatedItem = await res.json();
        await fetchNews();
        if (selectedNews?.id === updatedItem.id) {
          // Merge with existing fields that might not be in the PUT response (like author name)
          setSelectedNews(prev => prev ? { ...prev, ...updatedItem } : null);
        }
        setIsModalOpen(false);
        setEditingNews(null);
        setFormData({ title: '', content: '', imageUrl: '', imageSize: 'large' });
      }
    } catch (error) {
      console.error('Failed to save news:', error);
      alert('Ett tekniskt fel uppstod. Kontrollera din internetanslutning.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: News) => {
    setNewsToDelete(item);
  };

  const confirmDelete = async () => {
    if (!newsToDelete) return;
    try {
      const res = await fetch(`/api/news/${newsToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchNews();
        if (selectedNews?.id === newsToDelete.id) setSelectedNews(null);
        setNewsToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete news:', error);
    }
  };

  const handleEdit = (item: News) => {
    setEditingNews(item);
    setFormData({ 
      title: item.title, 
      content: item.content, 
      imageUrl: item.imageUrl || '',
      imageSize: item.imageSize || 'large'
    });
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
    <div className="space-y-12 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Nyheter</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Håll dig uppdaterad om utrustning, Select Care och annat</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Sök i nyhetsflödet..."
              className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium shadow-sm"
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
          {isPrivileged && (
            <button 
              onClick={() => {
                setEditingNews(null);
                setFormData({ title: '', content: '', imageUrl: '', imageSize: 'large' });
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Nytt inlägg
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredNews.map((item, i) => {
          const isFeatured = i === 0 && !search;
          const imageSizeClass = item.imageSize === 'small' ? "h-48" : item.imageSize === 'medium' ? "h-64" : "";
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedNews(item)}
              className={cn(
                "group relative bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary transition-all cursor-pointer overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1",
                isFeatured && "md:col-span-2 lg:col-span-3 md:flex-row min-h-[400px]"
              )}
            >
              <div className={cn(
                "relative overflow-hidden shrink-0",
                isFeatured ? "w-full md:w-1/2 h-64 md:h-auto" : "w-full aspect-[16/10]",
                !isFeatured && item.imageSize === 'small' && "aspect-square max-h-48 mx-auto mt-4 rounded-2xl overflow-hidden",
                !isFeatured && item.imageSize === 'medium' && "aspect-video max-h-64 mx-auto mt-4 rounded-2xl overflow-hidden"
              )}>
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className={cn(
                      "w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out",
                      !isFeatured && (item.imageSize === 'small' || item.imageSize === 'medium') && "object-contain bg-slate-50 dark:bg-slate-800"
                    )}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                    <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-primary rounded-full shadow-sm">
                    {isFeatured ? 'Senaste nytt' : 'Information'}
                  </span>
                </div>
              </div>

              <div className={cn(
                "p-8 flex flex-col justify-between flex-1",
                isFeatured && "md:p-12"
              )}>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(item.createdAt)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {item.firstName} {item.lastName}
                    </div>
                  </div>

                  <h3 className={cn(
                    "font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-tight",
                    isFeatured ? "text-3xl lg:text-4xl" : "text-xl"
                  )}>
                    {item.title}
                  </h3>

                  <p className={cn(
                    "text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap",
                    isFeatured ? "text-lg line-clamp-3" : "text-sm line-clamp-2"
                  )}>
                    {item.content.replace(/[#*`]/g, '')}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    Läs mer <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>

                  {isPrivileged && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredNews.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Inga nyheter hittades</h3>
            <p className="text-slate-500 dark:text-slate-400">Prova att söka på något annat eller lägg till en nyhet.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedNews && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl cursor-pointer"
            onClick={() => setSelectedNews(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col relative cursor-default"
            >
              <button 
                onClick={() => setSelectedNews(null)}
                className="absolute top-6 right-6 z-10 p-3 bg-slate-900/50 hover:bg-slate-900/80 backdrop-blur-md text-white rounded-full transition-all hover:rotate-90 shadow-lg"
                title="Stäng"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {selectedNews.imageUrl && (
                  <div className={cn(
                    "relative w-full mx-auto",
                    selectedNews.imageSize === 'small' ? "max-w-md mt-8 rounded-3xl overflow-hidden shadow-lg" : 
                    selectedNews.imageSize === 'medium' ? "max-w-2xl mt-8 rounded-3xl overflow-hidden shadow-lg" : 
                    "h-[400px]"
                  )}>
                    <img 
                      src={selectedNews.imageUrl} 
                      alt={selectedNews.title} 
                      className={cn(
                        "w-full h-full",
                        selectedNews.imageSize === 'large' ? "object-cover" : "object-contain bg-slate-50 dark:bg-slate-800"
                      )}
                      referrerPolicy="no-referrer"
                    />
                    {selectedNews.imageSize === 'large' && (
                      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-black/20" />
                    )}
                  </div>
                )}

                <div className={cn(
                  "px-8 lg:px-16 pb-16",
                  (!selectedNews.imageUrl || selectedNews.imageSize !== 'large') && "pt-16"
                )}>
                  <div className="max-w-3xl mx-auto space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full">
                          Information
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {formatDate(selectedNews.createdAt)}
                        </span>
                      </div>
                      <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
                        {selectedNews.title}
                      </h1>
                    </div>

                    {isPrivileged && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEdit(selectedNews)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary rounded-xl transition-all font-bold text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Redigera
                        </button>
                        <button
                          onClick={() => handleDelete(selectedNews)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded-xl transition-all font-bold text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Radera
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold shadow-lg shadow-primary/20">
                        {(selectedNews.firstName || '?')[0]}{(selectedNews.lastName || '?')[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {selectedNews.firstName || 'Okänd'} {selectedNews.lastName || 'författare'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Publicerad av administratör</p>
                      </div>
                    </div>

                    <div className="markdown-body text-lg lg:text-xl text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert prose-slate max-w-none whitespace-pre-wrap">
                      <Markdown remarkPlugins={[remarkBreaks, remarkGfm]}>{selectedNews.content}</Markdown>
                    </div>

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                      <button
                        onClick={() => setSelectedNews(null)}
                        className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Stäng nyhet
                      </button>
                    </div>
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
                      <div className="flex items-center gap-4 mb-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageSize: 'small' })}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                            formData.imageSize === 'small' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          )}
                        >
                          Liten
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageSize: 'medium' })}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                            formData.imageSize === 'medium' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          )}
                        >
                          Mellan
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageSize: 'large' })}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                            formData.imageSize === 'large' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          )}
                        >
                          Stor (Fullbredd)
                        </button>
                      </div>
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {newsToDelete && (
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
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Radera nyhet?</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Är du säker på att du vill radera nyheten <span className="font-bold text-slate-900 dark:text-white">"{newsToDelete.title}"</span>? Detta går inte att ångra.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => setNewsToDelete(null)}
                    className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={confirmDelete}
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
