import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gakymbxizzsihugtbgfo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3ltYnhpenpzaWh1Z3RiZ2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjYwMjcsImV4cCI6MjA3Njc0MjAyN30.rl4E5jwhKkKt-YlgQZ5BJf4vpf4z6Bk7KsvyI5MTXQw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);