export type MessageAuthor = 'client' | 'manager' | 'bot' | string;

export interface Message {
    id: number;
    created_at: string;
    author: MessageAuthor;
    body: string;
    messenger_user_id: string;
    messenger_type: string;
    client_id: number;
}

// Ответ Edge Function
export interface MessagesResponse {
    messages: Message[];
    nextCursor: string | null;
    hasMore: boolean;
}