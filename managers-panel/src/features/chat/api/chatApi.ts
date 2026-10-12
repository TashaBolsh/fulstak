import { baseApi } from '@/shared/api/baseApi';
import type { Client } from '@/entities/client/model/types';
import type { MessagesResponse } from '@/entities/message/model/types';

export const chatApi = {
    getClients: async (): Promise<Client[]> => {
        const { data } = await baseApi.get<Client[]>('/clients');
        return data;
    },

    getMessages: async (
        clientId: number,
        cursor: string | null,
        limit = 30
    ): Promise<MessagesResponse> => {
        const { data } = await baseApi.get<MessagesResponse>('/messages', {
            params: {
                client_id: clientId,
                limit,
                ...(cursor ? { before: cursor } : {}),
            },
        });
        return data;
    },
};