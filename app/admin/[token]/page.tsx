'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { templates } from '@/data/templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { facets, getFacetForQuestion } from '@/lib/big5_scoring';
import { calculateSten } from '@/lib/sten_scoring';
import { GaussianChart } from '@/components/GaussianChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

export default function AdminDashboard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  
  // Demographics and Meta
  const [patientSex, setPatientSex] = useState<'female' | 'male'>('female');
  const [patientAge, setPatientAge] = useState<number>(29);
  const [patientName, setPatientName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  
  // Graph selection - "activeGraphTrait" determines what is shown. 
  // null = All 5 Traits. 'N' = Facets of N, etc.
  const [activeGraphTrait, setActiveGraphTrait] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial Data Fetch
    const fetchInitialData = async () => {
      const { data: sessionData } = await supabase.from('sessions').select('*').eq('id', token).single();
      const { data: responsesData } = await supabase.from('responses').select('*').eq('session_id', token);

      if (sessionData) {
        setSession(sessionData);
        setTemplate(templates.find(t => t.id === sessionData.template_id));
        if (sessionData.patient_name) setPatientName(sessionData.patient_name);
      }
      
      const responseMap: Record<string, number> = {};
      responsesData?.forEach((r: any) => {
        responseMap[r.question_id] = r.value;
      });
      setResponses(responseMap);
      setLoading(false);
    };

    fetchInitialData();

    // 2. Realtime Subscription
    const channel = supabase
      .channel('realtime_responses')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to inserts and updates
          schema: 'public',
          table: 'responses',
          filter: `session_id=eq.${token}`,
        },
        (payload) => {
          const newResponse = payload.new as { question_id: string; value: number };
          setResponses((prev) => ({
            ...prev,
            [newResponse.question_id]: newResponse.value,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);

  const handleSaveName = async () => {
    setIsSavingName(true);
    await supabase.from('sessions').update({ patient_name: patientName }).eq('id', token);
    setIsSavingName(false);
  };

  const getQuestionNumber = (id: string) => {
    const match = id.match(/q(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Ładowanie podglądu...</div>;
  if (!session || !template) return <div className="p-8">Sesja nieznaleziona.</div>;

  const responseCount = Object.keys(responses).length;
  const questionCount = template.questions.length;
  const progress = Math.round((responseCount / questionCount) * 100);

  // --- Calculate Scores ---
  const traitScores: Record<string, number> = { N: 0, E: 0, O: 0, A: 0, C: 0 };
  const facetScores: Record<string, number> = {}; // e.g. "N1": 10

  // Iterate over all answers (assuming keys are 'q1', 'q2'...)
  // We need to iterate over all saved responses, or iterate over facets and sum available data?
  // iterating responses is safer as it only counts what we have.
  // But for display, maybe we want to show zeros for incomplete?
  // Let's iterate all questions from template and if answered, add to score.
  
  // Initialize specific facet counters
  facets.forEach(f => {
      facetScores[f.id] = 0;
  });

  template.questions.forEach((q: any) => {
      const val = responses[q.id];
      if (val !== undefined) {
         const num = getQuestionNumber(q.id);
         const facet = getFacetForQuestion(num);
         if (facet) {
             facetScores[facet.id] = (facetScores[facet.id] || 0) + val;
             traitScores[facet.trait] = (traitScores[facet.trait] || 0) + val;
         }
      }
  });

  const traits = [
      { id: 'N', name: 'Neurotyczność', color: 'bg-red-500', hex: '#ef4444' },
      { id: 'E', name: 'Ekstrawersja', color: 'bg-yellow-500', hex: '#eab308' },
      { id: 'O', name: 'Otwartość', color: 'bg-green-500', hex: '#22c55e' },
      { id: 'A', name: 'Ugodowość', color: 'bg-blue-500', hex: '#3b82f6' },
      { id: 'C', name: 'Sumienność', color: 'bg-indigo-500', hex: '#6366f1' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-[90rem] mx-auto space-y-6">
        <header className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Podgląd na żywo: {template.title}</h1>
                <p className="text-slate-500 font-mono text-xs mt-1">ID Sesji: {token}</p>
            </div>
            <div className="text-right">
                <div className="text-3xl font-bold text-slate-900">{progress}%</div>
                <div className="text-xs text-slate-500 uppercase font-semibold">Ukończono</div>
            </div>
        </header>

        {/* Demographics Config */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-medium text-slate-900">Konfiguracja norm (Steny)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex gap-6 items-end">
                <div className="space-y-1.5 flex-1 max-w-md">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Imię i nazwisko / ID</label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Wpisz identyfikator pacjenta..."
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                        />
                        <Button 
                            onClick={handleSaveName} 
                            disabled={isSavingName}
                            variant="default"
                        >
                            {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Płeć</label>
                    <select 
                        className="flex h-10 w-40 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                        value={patientSex}
                        onChange={(e) => setPatientSex(e.target.value as 'female' | 'male')}
                    >
                        <option value="female">Kobieta</option>
                        <option value="male">Mężczyzna</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                     <label className="text-xs font-semibold text-slate-500 uppercase">Wiek</label>
                     <input 
                        type="number" 
                        className="flex h-10 w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                        value={patientAge}
                        onChange={(e) => setPatientAge(parseInt(e.target.value) || 0)}
                     />
                </div>
                <div className="text-xs text-slate-400 pb-2">
                    Normy: {patientSex === 'female' ? 'Kobiety' : 'Mężczyźni'}, {patientAge < 30 ? '< 30 lat' : '30+ lat'}
                </div>
            </CardContent>
        </Card>

        {/* Scores Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {traits.map(trait => {
                const rawScore = traitScores[trait.id] || 0;
                const { sten, percentile } = calculateSten('trait', trait.id, rawScore, patientSex, patientAge);
                const isActive = activeGraphTrait === trait.id;
                
                return (
                <Card 
                    key={trait.id} 
                    className={cn(
                        "border-0 shadow-sm ring-1 transition-all cursor-pointer hover:ring-2", 
                        isActive ? "ring-2 ring-slate-900 scale-[1.02]" : "ring-slate-200 hover:ring-slate-400"
                    )}
                    onMouseEnter={() => setActiveGraphTrait(trait.id)}
                    onTouchStart={() => setActiveGraphTrait(trait.id)}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
                            {trait.name} 
                            <span className={cn("w-2 h-2 rounded-full", trait.color)} />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-bold text-slate-900">{rawScore}</div>
                            {sten > 0 && (
                                <div className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                    Sten: {sten}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                             <div className="text-xs text-slate-400">Suma punktów</div>
                             {sten > 0 && <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Perc: {percentile}</div>}
                        </div>
                        
                        {/* Facet Breakdown in Hover or Small list */}
                        <div className="mt-4 space-y-1">
                            {facets.filter(f => f.trait === trait.id).map(f => {
                                const fRaw = facetScores[f.id] || 0;
                                const fStenData = calculateSten('facet', f.id, fRaw, patientSex, patientAge);
                                
                                return (
                                <div key={f.id} className="flex justify-between items-center text-xs py-0.5 border-b border-slate-50 last:border-0">
                                    <span className="text-slate-600 font-medium w-1/3 truncate" title={f.name}>{f.name}</span>
                                    <div className="flex gap-2 text-slate-500 items-baseline">
                                        <span className="text-[10px] text-slate-400">Raw:{fRaw}</span>
                                        {fStenData.sten > 0 && <span className="font-bold text-slate-700">Sten:{fStenData.sten}</span>}
                                        {fStenData.percentile && <span className="text-[9px] text-emerald-600 font-medium">{fStenData.percentile}</span>}
                                    </div>
                                </div>
                            )})}
                        </div>
                    </CardContent>
                </Card>
            )})}
        </div>

        {/* Gaussian Graph Section */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200" onMouseEnter={() => setActiveGraphTrait(null)}>
             <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-900">
                    Rozkład Gaussa (Steny) - {activeGraphTrait ? `Podskale dla: ${traits.find(t => t.id === activeGraphTrait)?.name}` : 'Główne skale (Big 5)'}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 flex justify-center bg-slate-50/50">
                 {(() => {
                     let items: any[] = [];
                     
                     if (activeGraphTrait) {
                         // Show Facets for this trait
                         const traitFacets = facets.filter(f => f.trait === activeGraphTrait);
                         const traitInfo = traits.find(t => t.id === activeGraphTrait);
                         const color = traitInfo?.hex || '#000';
                         
                         items = traitFacets.map(f => {
                             const rawScore = facetScores[f.id] || 0;
                             const { sten } = calculateSten('facet', f.id, rawScore, patientSex, patientAge);
                             return { score: sten || 0, label: `${f.id} - ${f.name}`, color: color };
                         });
                     } else {
                         // Show Main 5 Traits
                         items = traits.map(t => {
                             const rawScore = traitScores[t.id] || 0;
                             const { sten } = calculateSten('trait', t.id, rawScore, patientSex, patientAge);
                             return { score: sten || 0, label: t.name, color: t.hex };
                         });
                     }
                     
                     return <GaussianChart items={items} />;
                 })()}
            </CardContent>
        </Card>

        {/* Raw Responses Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-900">
                 Szczegółowe odpowiedzi
             </div>
             <div className="p-6">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
                    {template.questions.map((q: any) => {
                        const num = getQuestionNumber(q.id);
                        const answer = responses[q.id];
                        const hasAnswer = answer !== undefined;
                        
                        return (
                            <div 
                                key={q.id} 
                                title={`${num}. ${q.text} (Odpowiedź: ${hasAnswer ? answer : '-'})`}
                                className={cn(
                                    "aspect-square flex flex-col items-center justify-center rounded border text-xs transition-colors",
                                    hasAnswer 
                                        ? "bg-slate-50 border-slate-200 text-slate-700" 
                                        : "bg-transparent border-slate-100 text-slate-300"
                                )}
                            >
                                <span className="font-bold mb-0.5 text-[10px] text-slate-400">{num}</span>
                                <span className={cn("font-bold text-sm", hasAnswer ? "text-slate-900" : "text-slate-200")}>
                                    {hasAnswer ? answer : "·"}
                                </span>
                            </div>
                        )
                    })}
                </div>
             </div>
        </div>
      </div>
    </div>
  );
}
