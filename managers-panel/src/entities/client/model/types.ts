export interface Client {
    id: number;
    created_at: string;
    user_telegram_id: string;
    first_name: string | null;
    last_name: string | null;
    last_message_at: string;
}

// Тип для создания клиента (если понадобится позже)
export type ClientCreate = Omit<Client, 'id' | 'created_at'>;