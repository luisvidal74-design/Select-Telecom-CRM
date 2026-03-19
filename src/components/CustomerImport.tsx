import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerImportProps {
  onImportComplete: () => void;
  onClose: () => void;
}

interface ImportRow {
  name: string;
  orgNumber: string;
  address?: string;
  city?: string;
  zipCode?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  responsibleSeller?: string;
  website?: string;
}

export default function CustomerImport({ onImportComplete, onClose }: CustomerImportProps) {
  const [data, setData] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        // Map Excel headers to our database fields
        const mappedData: ImportRow[] = jsonData.map(row => ({
          name: row['Namn'] || row['Företagsnamn'] || row['Name'] || '',
          orgNumber: row['Org.nr'] || row['Organisationsnummer'] || row['OrgNumber'] || '',
          address: row['Adress'] || row['Address'] || '',
          city: row['Ort'] || row['City'] || '',
          zipCode: row['Postnummer'] || row['ZipCode'] || '',
          contactPerson: row['Kontaktperson'] || row['ContactPerson'] || '',
          contactPhone: row['Telefon'] || row['ContactPhone'] || '',
          contactEmail: row['E-post'] || row['ContactEmail'] || '',
          responsibleSeller: row['Ansvarig säljare'] || row['ResponsibleSeller'] || '',
          website: row['Hemsida'] || row['Website'] || '',
        })).filter(row => row.name && row.orgNumber);

        if (mappedData.length === 0) {
          setError('Inga giltiga rader hittades. Kontrollera att kolumnerna "Namn" och "Org.nr" finns med.');
        } else {
          setData(mappedData);
          setError(null);
        }
      } catch (err) {
        setError('Kunde inte läsa filen. Kontrollera att det är en giltig Excel-fil.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: data }),
      });

      if (res.ok) {
        onImportComplete();
        onClose();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Ett fel uppstod vid importen.');
      }
    } catch (err) {
      setError('Kunde inte kontakta servern.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg text-green-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Importera kunder från Excel</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {data.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center hover:border-primary transition-colors cursor-pointer group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              <Upload className="w-12 h-12 text-slate-300 group-hover:text-primary transition-colors mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Klicka för att ladda upp Excel-fil</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Dra och släpp din fil här eller klicka för att bläddra. Se till att filen har rubriker som "Namn", "Org.nr", "Kontaktperson", etc.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hittade <span className="font-bold text-slate-900 dark:text-white">{data.length}</span> kunder i filen.
                </p>
                <button 
                  onClick={() => setData([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  Rensa och välj ny fil
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Namn</th>
                      <th className="px-4 py-2 font-medium">Org.nr</th>
                      <th className="px-4 py-2 font-medium">Kontaktperson</th>
                      <th className="px-4 py-2 font-medium">Ort</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.slice(0, 10).map((row, i) => (
                      <tr key={i} className="text-slate-700 dark:text-slate-300">
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2">{row.orgNumber}</td>
                        <td className="px-4 py-2">{row.contactPerson}</td>
                        <td className="px-4 py-2">{row.city}</td>
                      </tr>
                    ))}
                    {data.length > 10 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-center text-slate-400 italic">
                          ...och {data.length - 10} rader till
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <button 
            onClick={onClose} 
            className="px-6 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Avbryt
          </button>
          <button 
            onClick={handleImport}
            disabled={data.length === 0 || loading}
            className="px-8 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importerar...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Slutför import
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
