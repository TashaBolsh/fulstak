export const ENV = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string,
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
} as const;

// Проверка, что переменные заданы
if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
    throw new Error(
        'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file'
    );
}