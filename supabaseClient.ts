import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxwjxgxyvtcoipztaltb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4d2p4Z3h5dnRjb2lwenRhbHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMDM3MjEsImV4cCI6MjA4Mjc3OTcyMX0.MoF0Nuh2SOX9-uUKl2aTA1T2vymbmGiNfM_y7SutI6I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);