'use client';

import { useEffect, useState, use } from 'react';
import { getSessionDetails, getSessionResponses, updatePatientDetails, generateSessionToken } from '@/app/actions';
import { templates } from '@/data/templates';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { facets, getFacetForQuestion } from '@/lib/big5_scoring';
import { calculateSten } from '@/lib/sten_scoring';
import { GaussianChart } from '@/components/GaussianChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Printer, Share2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Create a client component specific supabase instance factory
const createScopedClient = (token: string) => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUB_KEY!,
        {
            global: { headers: { Authorization: `Bearer ${token}` } },
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
            },
        }
    );
};

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
  
  // Graph selection
  const [activeGraphTrait, setActiveGraphTrait] = useState<string | null>(null);

  useEffect(() => {
    let scopedSupabase: any = null;

    const init = async () => {
      try {
        // 1. Fetch initial static data (via secured Server Actions)
        const [sessionData, responsesData] = await Promise.all([
             getSessionDetails(token),
             getSessionResponses(token)
        ]);
        
        // 2. Hydrate State
        if (sessionData) {
            setSession(sessionData);
            setTemplate(templates.find((t: any) => t.id === sessionData.template_id));
            if (sessionData.patient_name) setPatientName(sessionData.patient_name);
            if (sessionData.patient_sex) setPatientSex(sessionData.patient_sex);
            if (sessionData.patient_age) setPatientAge(sessionData.patient_age);
        }
        
        const responseMap: Record<string, number> = {};
        responsesData?.forEach((r: any) => {
          responseMap[r.question_id] = r.value;
        });
        setResponses(responseMap);
        setLoading(false);

        // 3. Initialize Realtime with Scoped Token
        const jwt = await generateSessionToken(token);
        scopedSupabase = createScopedClient(jwt);

        scopedSupabase
            .channel(`session-${token}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'responses',
                    filter: `session_id=eq.${token}`, // Filter adds efficiency, RLS adds security
                },
                (payload: any) => {
                    const newResponse = payload.new as { question_id: string; value: number };
                    if (newResponse && newResponse.question_id) {
                        setResponses((prev) => ({
                            ...prev,
                            [newResponse.question_id]: newResponse.value,
                        }));
                    }
                }
            )
            .subscribe();
            
      } catch (e) {
        console.error("Initialization error", e);
        setLoading(false);
      }
    };

    init();

    return () => {
        if (scopedSupabase) scopedSupabase.removeAllChannels();
    };
  }, [token]);

  const handleSaveDetails = async () => {
    setIsSavingName(true);
    try {
        await updatePatientDetails(token, {
            name: patientName,
            sex: patientSex,
            age: patientAge
        });
    } catch (e) {
        console.error("Failed to save demographics", e);
        alert("Błąd zapisu danych pacjenta");
    } finally {
        setIsSavingName(false);
    }
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
    <div className="min-h-screen bg-slate-100 p-8 font-sans print:p-0 print:bg-white">
      <div className="max-w-[90rem] mx-auto space-y-6 print:space-y-4 print:max-w-none">
        
        {/* Print Only Intro */}
        <div className="hidden print:block mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{template.title} - Raport Indywidualny</h1>
            <div className="text-sm text-slate-500 mb-6 flex justify-between border-b pb-4">
               <div>
                  <span className="font-semibold">Pacjent:</span> {patientName || "Anonimowy"}
               </div>
               <div>
                  <span className="font-semibold">Data badania:</span> {new Date().toLocaleDateString('pl-PL')}
               </div>
            </div>
            <p className="text-justify text-slate-700 leading-relaxed mb-6">
                Poniższy raport przedstawia wyniki badania psychometrycznego przeprowadzonego przy użyciu standaryzowanego kwestionariusza osobowości. 
                Wyniki zostały przeliczone na skalę stenową w oparciu o normy dostosowane do płci i wieku osoby badanej. 
                Profil ten pozwala na ocenę nasilenia poszczególnych cech oraz ich składników, co umożliwia głębszą analizę funkcjonowania w różnych sferach życia.
                Prosimy o interpretację wyników wyłącznie w kontekście pełnej diagnozy psychologicznej.
            </p>
        </div>

        <header className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Podgląd na żywo: {template.title}</h1>
                    <p className="text-slate-500 font-mono text-xs mt-1">ID Sesji: {token}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Button className="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    Drukuj Raport / PDF
                </Button>
                <div className="text-right">
                    <div className="text-3xl font-bold text-slate-900">{progress}%</div>
                    <div className="text-xs text-slate-500 uppercase font-semibold">Ukończono</div>
                </div>
            </div>
        </header>

        {/* Demographics Config - Hide in Print if static data is shown above */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 print:hidden">
            <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-medium text-slate-900">Konfiguracja norm (Steny)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4 space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Imię i nazwisko / ID</label>
                        <Input
                            placeholder="Wpisz identyfikator pacjenta..."
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Płeć</label>
                        <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                            value={patientSex}
                            onChange={(e) => setPatientSex(e.target.value as 'female' | 'male')}
                        >
                            <option value="female">Kobieta</option>
                            <option value="male">Mężczyzna</option>
                        </select>
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                         <label className="text-xs font-semibold text-slate-500 uppercase">Wiek</label>
                         <input 
                            type="number" 
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                            value={patientAge}
                            onChange={(e) => setPatientAge(parseInt(e.target.value) || 0)}
                         />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                         <Button 
                            onClick={handleSaveDetails} 
                            disabled={isSavingName}
                            variant="default"
                            className="w-full"
                        >
                            {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span className="ml-2 md:hidden lg:inline">Zapisz</span>
                        </Button>
                    </div>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                    Normy: {patientSex === 'female' ? 'Kobiety' : 'Mężczyźni'}, {patientAge < 30 ? '< 30 lat' : '30+ lat'}
                </div>
            </CardContent>
        </Card>

        {/* Scores Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:flex print:flex-col print:gap-4">
            {traits.map(trait => {
                const rawScore = traitScores[trait.id] || 0;
                const { sten, percentile } = calculateSten('trait', trait.id, rawScore, patientSex, patientAge);
                const isActive = activeGraphTrait === trait.id;
                
                return (
                <Card 
                    key={trait.id} 
                    className={cn(
                        "border-0 shadow-sm ring-1 transition-all cursor-pointer hover:ring-2 print:ring-1 print:shadow-none print:break-inside-avoid print:bg-slate-50 print:rounded-none print:break-after-page print:mb-8", 
                        isActive ? "ring-2 ring-slate-900 scale-[1.02] print:scale-100 print:ring-slate-300" : "ring-slate-200 hover:ring-slate-400"
                    )}
                    onMouseEnter={() => setActiveGraphTrait(trait.id)}
                    onTouchStart={() => setActiveGraphTrait(trait.id)}
                >
                    <CardHeader className="pb-2 print:p-0">
                        <CardTitle className="text-sm font-medium text-slate-500 flex justify-between print:text-3xl print:font-bold print:text-slate-900 print:mb-4">
                            {trait.name} 
                            <span className={cn("w-2 h-2 rounded-full print:border", trait.color)} />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="print:p-0">
                        <div className="print:flex print:items-center print:gap-4 print:mb-6">
                            <div className="flex items-baseline gap-2">
                                <div className="text-3xl font-bold text-slate-900 print:hidden">{rawScore}</div>
                                {sten > 0 && (
                                    <div className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded print:bg-transparent print:text-slate-900 print:border print:border-slate-200">
                                        Sten: {sten}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-center mt-1 print:mt-0">
                                 <div className="text-xs text-slate-400 print:hidden">Suma punktów</div>
                                 {sten > 0 && (
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider print:text-sm print:font-semibold print:text-slate-900 print:bg-transparent print:border print:normal-case print:border-slate-200 print:px-2 print:py-0.5 print:rounded print:scale-100">
                                        Perc: {percentile}
                                    </div>
                                 )}
                            </div>
                        </div>
                        
                        {/* Facet Breakdown in Hover or Small list */}
                        <div className="mt-4 space-y-1 print:grid print:grid-cols-2 print:gap-x-8 print:gap-y-1">
                            {facets.filter(f => f.trait === trait.id).map(f => {
                                const fRaw = facetScores[f.id] || 0;
                                const fStenData = calculateSten('facet', f.id, fRaw, patientSex, patientAge);
                                
                                return (
                                <div key={f.id} className="flex justify-between items-center text-xs py-0.5 border-b border-slate-50 last:border-0 print:border-slate-100">
                                    <span className="text-slate-600 font-medium w-1/3 truncate print:w-auto" title={f.name}>{f.name}</span>
                                    <div className="flex gap-2 text-slate-500 items-baseline">
                                        <span className="text-[10px] text-slate-400 print:hidden">Raw:{fRaw}</span>
                                        {fStenData.sten > 0 && <span className="font-bold text-slate-700">Sten:{fStenData.sten}</span>}
                                        {fStenData.percentile && <span className="text-[9px] text-emerald-600 font-medium print:text-slate-500 print:inline-block">Perc: {fStenData.percentile}</span>}
                                    </div>
                                </div>
                            )})}
                        </div>
                        
                        {/* Print Only: Trait Specific Gaussian */}
                        <div className="hidden print:block mt-4 pt-4 border-t border-slate-200">
                            <div className="w-[80%] mx-auto">
                                <GaussianChart items={facets.filter(f => f.trait === trait.id).map(f => {
                                    const fRaw = facetScores[f.id] || 0;
                                    const { sten } = calculateSten('facet', f.id, fRaw, patientSex, patientAge);
                                    return { score: sten || 0, label: f.id, color: trait.hex };
                                })} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )})}
        </div>

        {/* Gaussian Graph Section - Screen Only */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 print:hidden" onMouseEnter={() => setActiveGraphTrait(null)}>
             <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-900">
                    Rozkład Gaussa (Steny) - {activeGraphTrait ? `Podskale dla: ${traits.find(t => t.id === activeGraphTrait)?.name}` : 'Główne skale (Big 5)'}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 flex justify-center bg-slate-50/50 print:bg-white">
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

        {/* Raw Responses Grid - Hide in Print if too long, or maybe show? Usually raw response grid is too big. Let's hide it. */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
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
