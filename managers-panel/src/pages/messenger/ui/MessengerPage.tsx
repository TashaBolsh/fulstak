import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/features/chat/api/chatApi';
import { ClientListItem } from '@/entities/client/ui/ClientListItem';
import { ChatWindow } from '@/features/chat/ui/ChatWindow';

export const MessengerPage = () => {
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

    const { data: clients, isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: chatApi.getClients,
        refetchInterval: 10_000,
    });

    if (isLoading) return <div style={{ padding: 20 }}>Загрузка клиентов…</div>;

    // ⬇️ ВОТ ЭТА СТРОКА БЫЛА ПРОПУЩЕНА
    const selectedClient =
        clients?.find((c) => c.id === selectedClientId) ?? null;

    return (
        <main style={{ display: 'flex', height: '100vh' }}>
            <aside
                style={{
                    width: 320,
                    flexShrink: 0,
                    borderRight: '1px solid #e0e0e0',
                    overflowY: 'auto',
                    background: '#fafafa',
                }}
            >
                <h3 style={{ padding: '12px 16px', margin: 0 }}>Диалоги</h3>
                {clients?.map((client) => (
                    <ClientListItem
                        key={client.id}
                        client={client}
                        isActive={client.id === selectedClientId}
                        onClick={setSelectedClientId}
                    />
                ))}
            </aside>

            <section
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                }}
            >
                {/* ⬇️ Передаём объект client, а не clientId */}
                <ChatWindow client={selectedClient} />
            </section>
        </main>
    );
};