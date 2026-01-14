create table security_logs (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) not null,
  event_type text not null, -- 'screenshot_attempt', 'blur', 'context_menu'
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter publication supabase_realtime add table security_logs;

-- Enable Row Level Security (RLS)
alter table security_logs enable row level security;
