'use client';

import { useState } from 'react';
import { templates } from '@/data/templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Clipboard, ExternalLink, Play } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [createdSession, setCreatedSession] = useState<{ id: string; template: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const createSession = async (templateId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({ template_id: templateId })
        .select()
        .single();
      
      if (error) throw error;
      setCreatedSession({ id: data.id, template: templateId });
    } catch (e) {
      console.error(e);
      alert('Error creating session. Check console and ensure Supabase is connected.');
    } finally {
      setLoading(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <main className="min-h-screen bg-slate-50 p-8">
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
      </div>
    </main>
  );
}
