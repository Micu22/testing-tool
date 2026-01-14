-- Create a table for sessions
create table sessions (
  id uuid default gen_random_uuid() primary key,
  template_id text not null,
  status text default 'active', -- active, completed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for responses
create table responses (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) not null,
  question_id text not null,
  value integer, -- Using integer to store the score/choice index. You might want text or jsonb for more complex answers.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ADD UNIQUE CONSTRAINT FOR UPSERT
alter table responses add constraint responses_session_id_question_id_key unique (session_id, question_id);

-- Enable Realtime for responses
alter publication supabase_realtime add table responses;
alter publication supabase_realtime add table sessions;

-- Enable Row Level Security (RLS)
alter table sessions enable row level security;
alter table responses enable row level security;

-- Policy: Allow public read access to responses if the JWT has the matching session_id
-- This allows the Admin Dashboard to subscribe to changes using a scoped token.
create policy "Allow read access via session token"
on responses
for select
to public
using (
  session_id::text = (auth.jwt() ->> 'session_id')
);
