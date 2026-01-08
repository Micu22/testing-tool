# Real-Time Psychological Assessment Tool

This is a **Next.js 16** application with **Supabase Realtime** designed for conducting psychological assessments (like Big 5, Beck Depression Inventory) during online calls.

## Features
- **Instant Deployment**: Uses a simple JSON template system for scales.
- **Real-Time Monitoring**: See patient answers instantly as they select them (powered by Supabase Realtime).
- **Patient UX**: Clean, distraction-free interface.
- **Diagnostic UX**: Data-dense dashboard for the clinician.

## Getting Started

### 1. Setup Supabase
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in Supabase and run the content of `supabase_schema.sql` included in this reference.
   - This creates `sessions` and `responses` tables.
   - It enables Realtime replication for these tables.
3. Get your **Project URL** and **anon public key** from Project Settings > API.

### 2. Configure Environment
1. Copy `.env.local.example` to `.env.local`.
2. Fill in your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUB_KEY=...
   ```

### 3. Run the App
```bash
npm install
npm run dev
```

### 4. Usage
1. Open `http://localhost:3000` (Admin Console).
2. Click "Start Session" on a test (e.g., Big 5).
3. Copy the **Patient Link** and open it in an incognito window (simulating the patient).
4. Click **Open Admin View** in the original window.
5. Watch the admin view update instantly as you fill out the form in the patient window.

## Adding Scales
Edit `data/templates.ts` to add new questionnaires. The system supports `scale` (1-N) and `choice` (radio) types.
