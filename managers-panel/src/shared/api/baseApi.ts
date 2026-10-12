import axios from 'axios';
import { ENV } from '@/shared/config/env';

export const baseApi = axios.create({
    baseURL: `${ENV.SUPABASE_URL}/functions/v1`,
    headers: {
        Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    },
});