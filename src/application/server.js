import Fastify from 'fastify';
// Импортируем модуль валют
import {
    getExchangeRate,
    detectCurrency,
    SUPPORTED_CURRENCIES
} from './currency.js';
// ============================================
// ЗАГРУЗКА КОНФИГУРАЦИИ
// ============================================
process.loadEnvFile(new URL('../../.env', import.meta.url));
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не задан в .env');
    process.exit(1);
}
const PORT = process.env.PORT || 3001;
const fastify = Fastify({ logger: true });
// ============================================
// ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЯ
// ============================================
async function sendMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        console.log(`📤 Отправка сообщения в чат ${chatId}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        const data = await response.json();
        if (!data.ok) {
            console.error('❌ Ошибка отправки:', data.description);
        } else {
            console.log('✅ Сообщение отправлено');
        }
        return data;
    } catch (error) {
        console.error('❌ Ошибка при отправке:', error.message);
    }
}
// ============================================
// ВЕБХУК ДЛЯ TELEGRAM - ЛОГИРУЕТ И ОТВЕЧАЕТ НА ВАЛЮТЫ
// ============================================
fastify.post("/webhook/telegram", async (request, reply) => {
    const update = request.body;

    // Логируем апдейт
    console.log('\n' + '='.repeat(60));
    console.log('📨 ПОЛУЧЕН АПДЕЙТ ОТ TELEGRAM');
    console.log('='.repeat(60));
    console.log(`🕐 Время: ${new Date().toLocaleString('ru-RU')}`);
    console.log(`🆔 Update ID: ${update.update_id || 'неизвестен'}`);
    console.log(`📦 Тип апдейта: ${Object.keys(update).filter(k => k !== 'update_id').join(', ') || 'неизвестный'}`);
    console.log('\n📄 ПОЛНЫЙ JSON АПДЕЙТА:');
    console.log(JSON.stringify(update, null, 2));
    console.log('='.repeat(60));
    console.log('✅ Апдейт залогирован\n');

    // ============================================
    // ОБРАБОТКА СООБЩЕНИЯ
    // ============================================
    if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.trim();
        const firstName = update.message.from.first_name || 'Друг';

        console.log(`👤 ${firstName}: ${text}`);

        // Команда /start
        if (text === '/start') {
            await sendMessage(chatId,
                `👋 Привет, ${firstName}!\n\n` +
                `Я бот для проверки курсов валют в белорусских рублях (BYN).\n\n` +
                `💰 <b>Как пользоваться:</b>\n` +
                `Просто напиши код или название валюты:\n` +
                `• <code>usd</code> или <code>доллар</code>\n` +
                `• <code>eur</code> или <code>евро</code>\n` +
                `• <code>gbp</code> или <code>фунт</code>\n` +
                `• <code>cny</code> или <code>юань</code>\n` +
                `• <code>kzt</code> или <code>тенге</code>\n` +
                `• <code>uah</code> или <code>гривна</code>\n` +
                `• <code>rub</code> или <code>рубль</code>\n` +
                `• <code>pln</code> или <code>злоты</code>\n` +
                `• <code>usdt</code> или <code>тетер</code> - курс USDT\n\n` +
                `📊 <b>Команды:</b>\n` +
                `/start - Это сообщение\n` +
                `/help - Список команд\n` +
                `/rates - Все курсы валют`
            );
            return { ok: true };
        }

        // Команда /help
        if (text === '/help') {
            await sendMessage(chatId,
                `📚 <b>Список команд:</b>\n\n` +
                `🔹 <b>Узнать курс валюты</b>\n` +
                `Напишите код или название валюты:\n` +
                `<code>usd</code>, <code>eur</code>, <code>gbp</code>, <code>cny</code>, <code>kzt</code>, <code>uah</code>, <code>rub</code>, <code>pln</code>, <code>usdt</code>\n\n` +
                `🔹 <b>Примеры:</b>\n` +
                `<code>usd</code> - курс доллара\n` +
                `<code>доллар</code> - тоже курс доллара\n` +
                `<code>евро</code> - курс евро\n` +
                `<code>usdt</code> - курс Tether\n\n` +
                `🔹 <b>Команды:</b>\n` +
                `/start - Приветствие\n` +
                `/help - Эта справка\n` +
                `/rates - Все курсы валют`
            );
            return { ok: true };
        }

        // Команда /rates
        if (text === '/rates' || text === 'все курсы' || text === 'все валюты') {
            let message = '📊 <b>Курсы валют к белорусскому рублю:</b>\n\n';

            for (const currency of SUPPORTED_CURRENCIES) {
                const rate = await getExchangeRate(currency);
                if (rate) {
                    message += `${rate.message}\n`;
                } else {
                    message += `❌ ${currency}: не удалось получить курс\n`;
                }
            }

            message += `\n🔄 Актуально на ${new Date().toLocaleString('ru-RU')}`;
            message += `\n📊 Источник: Национальный банк Республики Беларусь`;
            await sendMessage(chatId, message);
            return { ok: true };
        }

        // Обработка запроса курса валюты
        console.log(`🔍 Проверка: "${text}" на предмет валюты`);

        const currencyCode = detectCurrency(text);

        if (currencyCode) {
            console.log(`✅ Найдена валюта: ${currencyCode}`);
            const rate = await getExchangeRate(currencyCode);

            if (rate) {
                await sendMessage(chatId, rate.message);
            } else {
                await sendMessage(chatId,
                    `❌ Не удалось получить курс для ${currencyCode}. Попробуйте позже.`
                );
            }
        } else {
            // Если не валюта и не команда
            console.log(`❌ Неизвестная команда: "${text}"`);
            await sendMessage(chatId,
                `❓ Я не понял команду.\n` +
                `Напиши <code>usd</code>, <code>eur</code> или другую валюту.\n` +
                `Или <code>/help</code> для списка команд.`
            );
        }
    } else {
        console.log('📨 Получен апдейт другого типа');
    }

    return { ok: true };
});
// ============================================
// ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ (для проверки)
// ============================================
// GET / - проверка работы сервера
fastify.get("/", async (request, reply) => {
    return {
        message: "🚀 Сервер запущен!",
        endpoints: {
            "POST /webhook/telegram": "Вебхук для Telegram (логирует апдейты и отвечает на валюты)",
            "GET /": "Эта страница"
        },
        status: "active",
        timestamp: new Date().toISOString(),
        currency: "BYN (Белорусский рубль)"
    };
});

// GET /webhook/telegram - проверка эндпоинта
fastify.get("/webhook/telegram", async (request, reply) => {
    return {
        message: "Webhook endpoint is active",
        method: "POST",
        note: "Telegram sends POST requests here with updates"
    };
});

// Обработчик 404
fastify.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
        message: `Маршрут ${request.method}: ${request.url} не найден`,
        error: "Не найдено",
        statusCode: 404
    });
});
// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================
try {
    await fastify.listen({ port: PORT });
    console.log(`\n🚀 Сервер запущен на http://localhost:${PORT}/`);
    console.log(`📋 Webhook endpoint: http://localhost:${PORT}/webhook/telegram`);
    console.log(`✅ Бот готов принимать апдейты!`);
    console.log(`📝 Все апдейты будут логироваться в консоль`);
    console.log(`💰 Бот курсов валют (BYN) запущен!`);
    console.log(`🇧🇾 Источник: Национальный банк Республики Беларусь\n`);
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}