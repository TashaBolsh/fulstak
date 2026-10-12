import type { Message } from '@/entities/message/model/types';

export const MessageBubble = ({ message }: { message: Message }) => {
    const isOutgoing = message.author === 'manager' || message.author === 'bot';
    const time = new Date(message.created_at).toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit',
    });

    return (
        <div style={{ display: 'flex', justifyContent: isOutgoing ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            <div style={{
                maxWidth: '70%', padding: '8px 12px', borderRadius: 12,
                background: isOutgoing ? '#dcf8c6' : '#ffffff',
                border: isOutgoing ? 'none' : '1px solid #e0e0e0',
                wordBreak: 'break-word',
            }}>
                <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{message.body}</div>
                <div style={{ fontSize: 11, color: '#9e9e9e', textAlign: 'right', marginTop: 4 }}>{time}</div>
            </div>
        </div>
    );
};