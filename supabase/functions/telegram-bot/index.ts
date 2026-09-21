// supabase/functions/telegram-bot/index.ts

import { getExchangeRate, detectCurrency, SUPPORTED_CURRENCIES } from "./currency.ts";

// Получаем токен из переменных окружения Supabase
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЯ В TELEGRAM
// ============================================
async function sendMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN не задан в переменных окружения!");
    return;
  }
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
    console.error('❌ Ошибка при отправке:', error instanceof Error ? error.message : String(error));
  }
}

// ============================================
// ОСНОВНОЙ СЕРВЕР (Аналог fastify.post("/webhook/telegram"))
// ============================================
Deno.serve(async (req: Request): Promise<Response> => {
  // 1. Обработка CORS preflight запросов (как в примере hello-world)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Проверяем, что это POST запрос
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const update = await req.json();

    // Логируем апдейт
    console.log('='.repeat(60));
    console.log('📨 ПОЛУЧЕН АПДЕЙТ ОТ TELEGRAM');
    console.log(`🆔 Update ID: ${update.update_id || 'неизвестен'}`);
    console.log(JSON.stringify(update, null, 2));
    console.log('='.repeat(60));

    // 3. Обработка сообщения
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
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // 4. Возвращаем успешный ответ
    return new Response(
        JSON.stringify({ ok: true, message: "Update processed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
    );

  } catch (error) {
    console.error("❌ Ошибка обработки запроса:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
        }
    );
  }
});