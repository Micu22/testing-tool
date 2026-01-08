'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// --- Authentication Helper ---
// ... (keep existing)

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

// --- Token Generation for Realtime ---
export async function generateSessionToken(sessionId: string) {
    if (!(await isAuthenticated())) {
        throw new Error('Unauthorized');
    }

    if (!JWT_SECRET) {
        throw new Error('Server misconfiguration: Missing JWT Secret');
    }

    const token = jwt.sign(
        { 
            role: 'anon', // Use 'anon' role so RLS policies for 'anon' apply (or authenticated if you prefer)
            session_id: sessionId 
        }, 
        JWT_SECRET, 
        { expiresIn: '1h' }
    );
    
    return token;
}

// --- Admin Actions ---
async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token');
  return token?.value === 'valid';
}

// --- Admin Actions ---

export async function getAdminSessions() {
  if (!(await isAuthenticated())) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getSessionDetails(sessionId: string) {
    if (!(await isAuthenticated())) {
      throw new Error('Unauthorized');
    }
  
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
  
    if (error) throw new Error(error.message);
    return data;
}

export async function getSessionResponses(sessionId: string) {
    // Used by Admin View
    if (!(await isAuthenticated())) {
        throw new Error('Unauthorized');
    }

    const { data, error } = await supabaseAdmin
        .from('responses')
        .select('*')
        .eq('session_id', sessionId);
    
    if (error) throw new Error(error.message);
    return data;
}

export async function deleteSessionWithPassword(sessionId: string, password: string) {
  if (!(await isAuthenticated())) {
     throw new Error('Unauthorized');
  }

  // Double check password (though auth token implies access, critical actions need re-auth)
  if (password !== ADMIN_PASSWORD) {
    throw new Error('Invalid password');
  }

  // Perform deletions with admin privileges
  const { error: rError } = await supabaseAdmin.from('responses').delete().eq('session_id', sessionId);
  if (rError) throw new Error(rError.message);

  const { error: lError } = await supabaseAdmin.from('security_logs').delete().eq('session_id', sessionId);
  if (lError) console.error("Log delete error (non-fatal):", lError);

  const { error: sError } = await supabaseAdmin.from('sessions').delete().eq('id', sessionId);
  if (sError) throw new Error(sError.message);

  return { success: true };
}

export async function updatePatientDetails(sessionId: string, details: { name?: string, sex?: string, age?: number }) {
    if (!(await isAuthenticated())) {
        throw new Error('Unauthorized');
    }
    
    const updates: any = {};
    if (details.name !== undefined) updates.patient_name = details.name;
    if (details.sex !== undefined) updates.patient_sex = details.sex;
    if (details.age !== undefined) updates.patient_age = details.age;

    const { error } = await supabaseAdmin
        .from('sessions')
        .update(updates)
        .eq('id', sessionId);

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function createSession(templateId: string) {
    if (!(await isAuthenticated())) {
        throw new Error('Unauthorized');
    }

    const { data, error } = await supabaseAdmin
        .from('sessions')
        .insert({ template_id: templateId })
        .select()
        .single();
    
    if (error) throw new Error(error.message);
    return data;
}


// --- Patient Actions ---
// These actions do NOT require the admin cookie, but rely on the Session Token (UUID) itself.

export async function getPatientSession(token: string) {
  // Public access, but only by ID.
  // Validation: UUID format? Supabase handles.
  
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', token)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getPatientResponses(token: string) {
    // Public access only by token owner (who has the token)
    const { data, error } = await supabaseAdmin
        .from('responses')
        .select('*')
        .eq('session_id', token);
    
    if (error) return [];
    return data;
}

export async function submitResponse(token: string, questionId: string, value: number) {
    // Verify session exists and is active?
    // Optimization: Just upsert. FK constraint will fail if session doesn't exist.
    // Check status?
    
    const { data: session } = await supabaseAdmin.from('sessions').select('status').eq('id', token).single();
    if (!session || session.status === 'completed') {
        throw new Error('Session closed or invalid');
    }

    const { error } = await supabaseAdmin
        .from('responses')
        .upsert({
            session_id: token,
            question_id: questionId,
            value: value
        }, { onConflict: 'session_id,question_id' });

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function completeSession(token: string) {
    const { error } = await supabaseAdmin
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', token);
    
    if (error) throw new Error(error.message);
    return { success: true };
}

export async function logSecurityEvent(token: string, type: string, details?: string) {
    await supabaseAdmin.from('security_logs').insert({
        session_id: token,
        event_type: type,
        details: details
    });
}
