import type { Client } from '@/entities/client/model/types';

interface ClientListItemProps {
    client: Client;
    isActive: boolean;
    onClick: (clientId: number) => void;
}

export const ClientListItem = ({ client, isActive, onClick }: ClientListItemProps) => {
    const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ').trim();
    const displayName = fullName || client.user_telegram_id || 'Без имени';
    const initial = displayName.charAt(0).toUpperCase();
    const formattedDate = new Date(client.last_message_at).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });

    return (
        <div
            onClick={() => onClick(client.id)}
            style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                cursor: 'pointer', background: isActive ? '#e3f2fd' : 'transparent',
                borderBottom: '1px solid #f0f0f0',
            }}
        >
            <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: isActive ? '#1976d2' : '#90a4ae', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, flexShrink: 0,
            }}>
                {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayName}
                </div>
                <div style={{ fontSize: 12, color: '#757575', marginTop: 2 }}>{formattedDate}</div>
            </div>
        </div>
    );
};