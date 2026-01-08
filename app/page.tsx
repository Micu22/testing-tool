'use client';

import { useState, useEffect } from 'react';
import { templates } from '@/data/templates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clipboard, ExternalLink, Play, Clock, User, FileText, Trash2, Lock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { getAdminSessions, createSession as createSessionAction, deleteSessionWithPassword } from './actions'; // Import server actions

export default function Home() {
  const [createdSession, setCreatedSession] = useState<{ id: string; template: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  
  // Delete Logic
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = async () => {
    try {
        const data = await getAdminSessions();
        if (data) setPastSessions(data);
    } catch (e) {
        console.error("Failed to load sessions:", e);
        // If unauthorized, middleware should handle, but UI might just show empty
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [createdSession]); 

  const createSession = async (templateId: string) => {
    setLoading(true);
    try {
      const data = await createSessionAction(templateId);
      setCreatedSession({ id: data.id, template: templateId });
    } catch (e) {
      console.error(e);
      alert('Error creating session. Ensure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);

    try {
        // Use Server Action for deletion
        await deleteSessionWithPassword(sessionToDelete, deletePassword);

        // Cleanup UI
        setPastSessions(prev => prev.filter(s => s.id !== sessionToDelete));
        setSessionToDelete(null);
        setDeletePassword('');
        
    } catch (e) {
        console.error(e);
        alert('Błąd usuwania: Nieprawidłowe hasło lub brak uprawnień.');
    } finally {
        setIsDeleting(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      {/* Delete Confirmation Modal Overlay */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md shadow-xl border-red-200">
                <CardHeader>
                    <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <CardTitle className="text-center text-red-700">Potwierdź usunięcie</CardTitle>
                    <CardDescription className="text-center">
                        Ta operacja jest nieodwracalna. Wszystkie dane tej sesji zostaną utracone.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Podaj hasło administratora</label>
                        <Input 
                            type="password" 
                            placeholder="Hasło..." 
                            value={deletePassword}
                            onChange={e => setDeletePassword(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex gap-2 justify-end bg-slate-50 rounded-b-lg">
                    <Button variant="ghost" onClick={() => { setSessionToDelete(null); setDeletePassword(''); }}>
                        Anuluj
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteSession} disabled={isDeleting || !deletePassword}>
                        {isDeleting ? 'Usuwanie...' : 'Usuń trwale'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Narzędzie Diagnostyki Psychologicznej</h1>
          <p className="text-slate-500">Wybierz test, aby rozpocząć nową sesję z pacjentem.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{template.title}</CardTitle>
                <p className="text-sm text-slate-500 mt-2">{template.description}</p>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => createSession(template.id)} 
                  disabled={loading}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Rozpocznij sesję
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {createdSession && (
          <Card className="bg-green-50 border-green-200 animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle className="text-green-800">Sesja utworzona!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-green-700">Link dla pacjenta</label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 bg-white p-2 rounded border border-green-200 text-sm">
                    {origin}/session/{createdSession.id}
                  </code>
                  <Button 
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(`${origin}/session/${createdSession.id}`)}
                  >
                    <Clipboard className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-green-700">Panel Administratora (Na żywo)</label>
                <div className="flex gap-2 mt-1">
                  <Link href={`/admin/${createdSession.id}`} className="flex-1">
                    <Button variant="default" className="w-full bg-green-700 hover:bg-green-800">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Otwórz widok administratora
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="pt-8">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Historia sesji
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                {pastSessions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">Brak sesji w historii.</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-medium">Data</th>
                                <th className="px-6 py-3 font-medium">Pacjent</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pastSessions.map(session => (
                                <tr key={session.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-mono text-slate-500">
                                        {new Date(session.created_at).toLocaleDateString('pl-PL')} {new Date(session.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-3 text-slate-900 font-medium">
                                        {session.patient_name || <span className="text-slate-400 italic">Anonimowy</span>}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${session.status === 'completed' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {session.status === 'completed' ? 'Zakończona' : 'W toku'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right space-x-1">
                                        <Link href={`/admin/${session.id}`} title="Podgląd na żywo">
                                            <Button variant="ghost" size="sm">
                                                <ExternalLink className="w-4 h-4 text-slate-500" />
                                            </Button>
                                        </Link>
                                        {session.status === 'completed' && (
                                            <Link href={`/report/${session.id}`} title="Pobierz raport">
                                                <Button variant="ghost" size="sm">
                                                    <FileText className="w-4 h-4 text-blue-500" />
                                                </Button>
                                            </Link>
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setSessionToDelete(session.id)}
                                            title="Usuń trwale"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </div>
    </main>
  );
}
