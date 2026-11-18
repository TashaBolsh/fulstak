// supabase/functions/telegram-bot/index.ts

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { getExchangeRate, detectCurrency, SUPPORTED_CURRENCIES } from "./currency.ts";

// ============================================
// КОНФИГУРАЦИЯ
// ============================================
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

const MESSENGER_TYPE = "telegram";
const REPLY_DELAY_MS = 2000;
const AUTO_REPLY_TEXT = "Мы получили ваш запрос и уже обрабатываем его. Пожалуйста, подождите.";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

// ============================================
// ОТПРАВКА СООБЩЕНИЯ В TELEGRAM
// ============================================
async function sendMessage(chatId: number, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN не задан");
    return false;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    });
    const data = await response.json();
    if (!data.ok) {
      console.error("❌ Ошибка отправки в Telegram:", data.description);
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ Ошибка сети:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

// ============================================
// ОСНОВНОЙ ОБРАБОТЧИК
// ============================================
export default {
  fetch: withSupabase({ auth: ["none"] }, async (req: Request, ctx: any): Promise<Response> => {
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    // ----------------------------------------
    // Проверка secret_token от Telegram
    // ----------------------------------------
    if (WEBHOOK_SECRET) {
      const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (incomingSecret !== WEBHOOK_SECRET) {
        console.warn("🚫 Неверный webhook secret");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    }

    try {
      const update = await req.json();
      console.log("=".repeat(60));
      console.log("📨 Апдейт от Telegram:", JSON.stringify(update, null, 2));
      console.log("=".repeat(60));

      // Игнорируем нетекстовые апдейты
      if (!update.message || !update.message.text) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const message = update.message;
      const chatId: number = message.chat.id;
      const text: string = message.text.trim();
      const firstName: string = message.from.first_name || "Клиент";
      const lastName: string | null = message.from.last_name || null;
      const telegramUserId: number = message.from.id;

      console.log(`👤 ${firstName}: ${text}`);

      // ============================================
      // 1. СОХРАНЯЕМ СООБЩЕНИЕ В БД (всегда, до проверки команд)
      // ============================================
      let clientId: number | null = null;

      const { data: existingClient } = await ctx.supabaseAdmin
          .from("clients")
          .select("id")
          .eq("user_telegram_id", String(telegramUserId))
          .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        console.log(`✅ Клиент найден: ID ${clientId}`);
      } else {
        const { data: newClient, error: createError } = await ctx.supabaseAdmin
            .from("clients")
            .insert({
              first_name: firstName,
              last_name: lastName,
              user_telegram_id: String(telegramUserId),
            })
            .select("id")
            .single();

        if (createError) {
          console.error("❌ Ошибка создания клиента:", createError.message);
        } else {
          clientId = newClient.id;
          console.log(`✅ Создан клиент: ID ${clientId}`);
        }
      }

      if (clientId) {
        const { error: insertError } = await ctx.supabaseAdmin
            .from("messages")
            .insert({
              author: firstName + (lastName ? ` ${lastName}` : ""),
              body: text,
              messenger_user_id: String(telegramUserId),
              messenger_type: MESSENGER_TYPE,
              client_id: clientId,
            });

        if (insertError) {
          console.error("❌ Ошибка сохранения:", insertError.message);
        } else {
          console.log("✅ Сообщение сохранено в БД");
        }
      }

      // ============================================
      // 2. ЛОГИКА БОТА (курсы валют)
      // ============================================

      // Команда /start
      if (text === "/start") {
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
      if (text === "/help") {
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
      if (text === "/rates" || text === "все курсы" || text === "все валюты") {
        let messageText = "📊 <b>Курсы валют к белорусскому рублю:</b>\n\n";
        for (const currency of SUPPORTED_CURRENCIES) {
          const rate = await getExchangeRate(currency);
          if (rate) {
            messageText += `${rate.message}\n`;
          } else {
            messageText += `❌ ${currency}: не удалось получить курс\n`;
          }
        }
        messageText += `\n🔄 Актуально на ${new Date().toLocaleString("ru-RU")}`;
        messageText += `\n📊 Источник: Национальный банк Республики Беларусь`;
        await sendMessage(chatId, messageText);
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Обработка запроса курса валюты
      const currencyCode = detectCurrency(text);
      if (currencyCode) {
        console.log(`✅ Найдена валюта: ${currencyCode}`);
        const rate = await getExchangeRate(currencyCode);
        if (rate) {
          await sendMessage(chatId, rate.message);
        } else {
          await sendMessage(chatId, `❌ Не удалось получить курс для ${currencyCode}. Попробуйте позже.`);
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ============================================
      // 3. ЕСЛИ НЕ ВАЛЮТА И НЕ КОМАНДА → автоответ через 2 сек
      // ============================================
      console.log("📩 Обычное сообщение — отправляем автоответ через 2 сек");
      // @ts-ignore — EdgeRuntime доступен в Supabase Edge Functions
      EdgeRuntime.waitUntil(
          (async () => {
            await new Promise((resolve) => setTimeout(resolve, REPLY_DELAY_MS));
            await sendMessage(chatId, AUTO_REPLY_TEXT);
            console.log("✅ Автоответ отправлен");
          })(),
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (error) {
      console.error("❌ Ошибка обработки:", error);
      return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
      );
    }
  }),
};
//test