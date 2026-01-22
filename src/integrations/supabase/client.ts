import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ttywuskboaranphxxgtr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eXd1c2tib2FyYW5waHh4Z3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTg1MjAsImV4cCI6MjA4NDY3NDUyMH0.ef_-_Szo763nk6wrIBsLE3UlifQCeuoKSXlyo0sVKP0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
