import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        // For demo purposes, we'll show the token if it's returned
        if (data.debugToken) {
          setDebugToken(data.debugToken);
        }
      } else {
        setError(data.error || 'Ett fel uppstod.');
      }
    } catch (err) {
      setError('Kunde inte kontakta servern.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-8 sm:p-12">
          <div className="mb-8">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" />
              Tillbaka till inloggning
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Glömt lösenord?</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex flex-col items-center text-center gap-4">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <div className="space-y-1">
                  <h3 className="font-bold text-green-900 dark:text-green-400">Mejl skickat!</h3>
                  <p className="text-sm text-green-700 dark:text-green-500">
                    Om e-postadressen finns i vårt system har vi skickat en återställningslänk.
                  </p>
                </div>
              </div>

              {debugToken && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Demo-läge: Återställningslänk</p>
                  <Link 
                    to={`/reset-password?token=${debugToken}`}
                    className="text-sm text-blue-500 hover:underline break-all block"
                  >
                    Klicka här för att återställa lösenordet direkt (simulerar mejl-länk)
                  </Link>
                </div>
              )}

              <Link 
                to="/login"
                className="block w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl text-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Gå till inloggning
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">E-postadress</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    required
                    type="email"
                    placeholder="namn@foretag.se"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  'Skicka återställningslänk'
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
