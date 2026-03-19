import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Ogiltig återställningslänk.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Lösenorden matchar inte.');
      return;
    }
    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken långt.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        const data = await res.json();
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Nytt lösenord</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Välj ett nytt lösenord för ditt konto.
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex flex-col items-center text-center gap-4">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <div className="space-y-1">
                  <h3 className="font-bold text-green-900 dark:text-green-400">Lösenordet har uppdaterats!</h3>
                  <p className="text-sm text-green-700 dark:text-green-500">
                    Du skickas nu vidare till inloggningssidan...
                  </p>
                </div>
              </div>
              <Link 
                to="/login"
                className="block w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl text-center hover:opacity-90 transition-opacity"
              >
                Logga in nu
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Nytt lösenord</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minst 6 tecken"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Bekräfta lösenord</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Upprepa lösenordet"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                disabled={loading || !token}
                type="submit"
                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  'Spara nytt lösenord'
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
