import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { chatApi } from '@/features/chat/api/chatApi';
import { MessageBubble } from '@/entities/message/ui/MessageBubble';
import type { Client } from '@/entities/client/model/types';
import type { MessagesResponse, Message } from '@/entities/message/model/types';

interface ChatWindowProps {
    client: Client | null;
}

export const ChatWindow = ({ client }: ChatWindowProps) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isInitialLoadRef = useRef(true);
    const previousScrollHeightRef = useRef(0);

    const {
        data,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery<MessagesResponse>({
        queryKey: ['messages', client?.id],
        queryFn: ({ pageParam }) =>
            chatApi.getMessages(client!.id, pageParam as string | null, 30),
        initialPageParam: null,
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.nextCursor : undefined,
        enabled: !!client,
        refetchInterval: 5_000,
    });

    // Собираем все сообщения из всех страниц
    // Сервер отдаёт их «свежие → старые», поэтому каждую страницу нужно реверснуть
    const allMessages: Message[] = data
        ? data.pages
            .flatMap((page) => page.messages)
            .slice()
            .reverse() // теперь старые → свежие (сверху вниз)
        : [];

    // Автоскролл вниз при первой загрузке
    useEffect(() => {
        if (isInitialLoadRef.current && allMessages.length > 0) {
            scrollContainerRef.current?.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'auto',
            });
            isInitialLoadRef.current = false;
        }
    }, [allMessages.length]);

    // Сохраняем позицию скролла ДО подгрузки старых сообщений
    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
            previousScrollHeightRef.current = el.scrollHeight;
            await fetchNextPage();
        }
    };

    // После подгрузки — восстанавливаем позицию скролла
    useEffect(() => {
        if (!isFetchingNextPage && previousScrollHeightRef.current > 0) {
            const el = scrollContainerRef.current;
            if (el) {
                const newScrollHeight = el.scrollHeight;
                el.scrollTop = newScrollHeight - previousScrollHeightRef.current;
            }
            previousScrollHeightRef.current = 0;
        }
    }, [isFetchingNextPage]);

    // Ничего не выбрано
    if (!client) {
        return (
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9e9e9e',
                    fontSize: 16,
                    background: '#fafafa',
                }}
            >
                Выберите диалог слева
            </div>
        );
    }

    const fullName = [client.first_name, client.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
    const displayName = fullName || client.user_telegram_id || 'Без имени';

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Шапка */}
            <header
                style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #e0e0e0',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#1976d2',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                    }}
                >
                    {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{displayName}</div>
                    <div style={{ fontSize: 12, color: '#9e9e9e' }}>
                        telegram: {client.user_telegram_id}
                    </div>
                </div>
            </header>

            {/* Сообщения */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#fafafa' }}
            >
                {/* Индикатор загрузки более старых сообщений */}
                {isFetchingNextPage && (
                    <div style={{ textAlign: 'center', color: '#9e9e9e', padding: '8px 0' }}>
                        Загрузка предыдущих сообщений…
                    </div>
                )}

                {isLoading && <div style={{ color: '#757575' }}>Загрузка…</div>}

                {isError && (
                    <div style={{ color: '#d32f2f' }}>
                        Ошибка: {(error as Error).message}
                    </div>
                )}

                {!isLoading && !isError && allMessages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#9e9e9e', marginTop: 40 }}>
                        Сообщений пока нет
                    </div>
                )}

                {allMessages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
            </div>
        </div>
    );
};