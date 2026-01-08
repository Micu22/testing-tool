'use client';

import { useEffect, useState, use, useRef } from 'react';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { templates, Question } from '@/data/templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { reversedQuestions, calculateScore, optionToDisplay } from '@/lib/big5_scoring';

export default function PatientSession({ params }: { params: Promise<{ token: string }> }) {
  // Unwrap params using React.use()
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [template, setTemplate] = useState<any>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef<HTMLDivElement>(null);
  
  // Consent State
  const [hasConsented, setHasConsented] = useState(false);
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);

  // Security Logger
  const logSecurityEvent = async (type: string, details?: string) => {
    // Fire and forget
    supabase.from('security_logs').insert({
        session_id: token,
        event_type: type,
        details: details
    }).then(({ error }) => {
        if (error) console.error("Logged sec error:", error);
    });
  };

  // We need to calculate visible questions BEFORE the useEffect that depends on them.
  // Move helper up or duplicate logic.
  const getQuestionNumber = (id: string) => {
    const match = id.match(/q(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const sortedQuestions = template ? [...template.questions].sort((a: any, b: any) => {
      return getQuestionNumber(a.id) - getQuestionNumber(b.id);
  }) : [];

  let visibleCount = 0;
  if (template) {
    for (let i = 0; i < sortedQuestions.length; i++) {
        visibleCount = i + 1;
        const qId = sortedQuestions[i].id;
        if (responses[qId] === undefined) {
            break;
        }
    }
  }
  
  // Auto-scroll logic
  useEffect(() => {
    if (visibleCount > 0) {
        // Scroll
        if (lastQuestionRef.current) {
            lastQuestionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [visibleCount]);
  
  // High-Security: Anti-Screenshot & Proctoring Extensions
  useEffect(() => {
    if (!hasConsented) return;

    // 1. Prevent Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
    };

    // 2. Clear Clipboard on PrintScreen
    // While preventing the OS screenshot is impossible from the browser,
    // we can mess with the clipboard if the browser allows, or visually warn.
    const handleKeySecurity = (e: KeyboardEvent) => {
        const key = e.key;
        
        // Windows: PrintScreen, Win+Shift+S | Mac: Cmd+Shift+3/4/5
        const isPrintScreen = key === 'PrintScreen';
        const isWinSnip = (e.metaKey || e.ctrlKey) && e.shiftKey && key.toLowerCase() === 's';
        const isMacScreenshot = e.metaKey && e.shiftKey && (key === '3' || key === '4' || key === '5');
        
        if (isPrintScreen || isWinSnip || isMacScreenshot) {
             e.preventDefault();
             // Log the attempt
             logSecurityEvent('screenshot_attempt', `Key combination detected: ${key}`);
             
             // Visual Punishment/Warning
             document.body.style.filter = 'blur(20px) grayscale(100%)';
             alert('⚠️ OSTRZEŻENIE O BEZPIECZEŃSTWIE\n\nWykryto próbę rejestracji ekranu. \nTwoja aktywność została odnotowana. \nTest jest chroniony prawem autorskim.');
             
             // Try to clear clipboard
             if (navigator.clipboard && navigator.clipboard.writeText) {
                 navigator.clipboard.writeText('SCREENSHOT-BLOCKED-BY-SECURITY-POLICY').catch(() => {});
             }
             
             // Restore after distinct delay
             setTimeout(() => {
                 document.body.style.filter = 'none';
             }, 2000);
        }
    };

    // 3. Blur content when window loses focus (Anti-Snipping Tool / Alt-Tab)
    const handleBlur = () => {
        logSecurityEvent('window_blur', 'User switched window or tab');
        document.body.style.filter = 'blur(15px)';
        document.body.style.opacity = '0.5';
    };

    const handleFocus = () => {
        document.body.style.filter = 'none';
        document.body.style.opacity = '1';
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeySecurity);
    window.addEventListener('keyup', handleKeySecurity);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
        window.removeEventListener('contextmenu', handleContextMenu);
        window.removeEventListener('keydown', handleKeySecurity);
        window.removeEventListener('keyup', handleKeySecurity);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        // Ensure cleanup restores state
        document.body.style.filter = 'none';
        document.body.style.opacity = '1';
    };
  }, [hasConsented]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if modifier keys are pressed
        if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
        
        const key = e.key.toLowerCase();
        const keyMap: Record<string, number> = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 };
        
        if (key in keyMap) {
            // Answer the LAST visible question (the one currently active)
            const currentQIdx = visibleCount - 1;
            if (currentQIdx >= 0 && currentQIdx < sortedQuestions.length) {
                const q = sortedQuestions[currentQIdx];
                
                // Only allow if not already answered? Or allow overwriting?
                // Usually allow overwriting the current one.
                const num = getQuestionNumber(q.id);
                const isReversed = reversedQuestions.has(num);
                // Prevent default scrolling usually associated with keys if any (though letters don't scroll)
                // e.preventDefault(); 
                
                handleAnswer(q.id, keyMap[key], isReversed);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleCount, sortedQuestions, responses]); // Re-bind when questions/counts change so we have fresh state

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', token)
        .single();
      
      const { data: responsesData } = await supabase.from('responses').select('*').eq('session_id', token);

      if (error || !data) {
        setLoading(false);
        return; // Handle 404
      }

      setSession(data);
      const temp = templates.find(t => t.id === data.template_id);
      setTemplate(temp);
      
      const responseMap: Record<string, number> = {};
      responsesData?.forEach((r: any) => {
        // We'll store the RAW calculated value (0-4) in DB.
        // But for UI "selected button" state, we need to know which letter was chosen.
        // If it was reversed, current val in DB (0-4) was computed as (4 - selected).
        // So selected = (4 - val). If not reversed, selected = val.
        // Effectively, map back to 0-4 index of [A,B,C,D,E].
        
        // However, we just need to know which option index (0-4) corresponds to the stored value.
        // Wait, handleAnswer receives "val" which is 0-4 index from the button click?
        // No, in previous code it received "val" from button which was 1-5.
        // Now buttons will be A-E (indices 0-4).
        // Let's assume responseMap stores the DB value (0-4).
        responseMap[r.question_id] = r.value;
      });
      setResponses(responseMap);
      
      setLoading(false);
    };

    fetchSession();
  }, [token]);

  const handleAnswer = async (questionId: string, optionIndex: number, isReversed: boolean) => {
    const score = calculateScore(optionIndex, isReversed);
    
    // Optimistic update - store the score in responses to mark as answered
    setResponses(prev => ({ ...prev, [questionId]: score }));

    // Send to DB
    const { error } = await supabase
      .from('responses')
      .upsert({
        session_id: token,
        question_id: questionId,
        value: score
      }, { onConflict: 'session_id,question_id' }); 
      
      if (error) {
          console.error("Error saving response:", error);
      }
      
      // Auto-scroll logic could go here if we want to smooth scroll to bottom
      // window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };
    
  // Helpers to decode saved score back to option index for display highlights
  const getSelectedOptionIndex = (qId: string, savedScore: number, isReversed: boolean) => {
      // If score = calculateScore(idx, rev), then idx = ?
      // If rev: score = 4 - idx => idx = 4 - score
      // If not rev: score = idx => idx = score
      if (isReversed) return 4 - savedScore;
      return savedScore;
  };

  if (loading) return <div className="p-8 text-center">Ładowanie testu...</div>;
  if (!session || !template) return <div className="p-8 text-center">Sesja nie znaleziona lub wygasła.</div>;

  if (!hasConsented) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4">
        <Card className="max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-slate-800 bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-2xl text-center text-slate-900">Ważne informacje</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-100 transition-colors hover:bg-slate-100 cursor-pointer" onClick={() => setConsent1(!consent1)}>
                <input
                  type="checkbox"
                  id="consent1"
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  checked={consent1}
                  onChange={(e) => setConsent1(e.target.checked)}
                />
                <label htmlFor="consent1" className="text-sm font-medium leading-relaxed text-slate-700 cursor-pointer pointer-events-none">
                  Potwierdzam, że wykonuję ten test zgodnie z instrukcją od psychologa, jestem z nim w kontakcie lub otrzymałem/am wyraźne polecenie wykonania go samodzielnie.
                </label>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-100 transition-colors hover:bg-slate-100 cursor-pointer" onClick={() => setConsent2(!consent2)}>
                <input
                  type="checkbox"
                  id="consent2"
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  checked={consent2}
                  onChange={(e) => setConsent2(e.target.checked)}
                />
                <label htmlFor="consent2" className="text-sm font-medium leading-relaxed text-slate-700 cursor-pointer pointer-events-none">
                  Rozumiem, że treść kwestionariusza oraz całe narzędzie są chronione w celu zapewnienia rzetelności pomiaru. <span className="font-bold text-red-600">Zobowiązuję się pod żadnym pozorem nie robić zrzutów ekranu, nie kopiować ani nie nagrywać wyświetlanych pytań.</span>
                </label>
              </div>
            </div>

            <Button 
              className="w-full h-14 text-lg font-bold"
              disabled={!consent1 || !consent2}
              onClick={() => setHasConsented(true)}
            >
              Otwórz narzędzie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleQuestions = sortedQuestions.slice(0, visibleCount);

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <header className="flex-none bg-white border-b border-slate-200 shadow-sm z-10 px-4 py-6">
        <div className="max-w-70ch mx-auto text-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{template.title}</h1>
          <p className="mt-2 text-sm text-slate-500 mb-6">{template.description}</p>
          {template.scaleLegend && (
            <div className="inline-flex flex-wrap md:flex-nowrap md:justify-center gap-x-6 gap-y-2 font-medium text-slate-600 bg-slate-50 px-6 py-3 rounded-xl border border-slate-100">
              {template.scaleLegend.map((item: any, index: number) => (
                <span key={index}>{item.label}</span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-white select-none" ref={topRef}>
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 pb-64 space-y-32">
          {visibleQuestions.map((q: Question, index) => {
            const num = getQuestionNumber(q.id);
            const isReversed = reversedQuestions.has(num);
            const savedValue = responses[q.id];
            const hasAnswer = savedValue !== undefined;
            const selectedIdx = hasAnswer ? getSelectedOptionIndex(q.id, savedValue, isReversed) : -1;

            return (
            <div 
              key={q.id} 
              ref={index === visibleQuestions.length - 1 ? lastQuestionRef : null}
              className="py-4 border-b border-slate-100 last:border-0 fade-in-up"
            >
                <div className="flex gap-4 mb-4">
                    <span className="font-mono text-slate-400 font-bold pt-1 min-w-[1.5rem] text-right">{num}.</span>
                    <h3 className="text-lg font-medium text-slate-900 leading-relaxed pt-0.5">{q.text}</h3>
                </div>
                
                {q.type === 'scale' ? (
                  <div className="pl-10">
                    <div className="flex justify-between max-w-md gap-2">
                       {/* A to E options using simple buttons */}
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2">
                             <button
                                type="button"
                                onClick={() => handleAnswer(q.id, idx, isReversed)}
                                className={cn(
                                    "w-12 h-12 rounded-full border-2 cursor-pointer text-lg font-bold transition-all flex items-center justify-center hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                                    selectedIdx === idx 
                                        ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" 
                                        : "bg-white text-slate-900 border-slate-200"
                                )}
                                aria-label={`${optionToDisplay(idx)}`}
                                aria-pressed={selectedIdx === idx}
                             >
                                {optionToDisplay(idx)}
                             </button>
                             <span className="text-xl font-bold text-slate-500">
                                {optionToDisplay(idx)}
                             </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                    // Fallback for non-scale questions if any (though Big5 is all scale)
                   <div className="pl-10 text-red-500">Typ pytania nieobsługiwany w tym widoku</div>
                )}
            </div>
          )})}

          <div className="pt-8 text-center text-slate-400 text-sm">
             {Object.keys(responses).length < template.questions.length ? (
                 <p>Odpowiedz na pytania, aby wyświetlić kolejne.</p>
             ) : (
                 <Button className="w-full text-lg h-14 mt-4" disabled={false}>
                    Prześlij odpowiedzi
                 </Button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
