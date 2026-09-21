// supabase/functions/telegram-bot/currency.ts

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'KZT', 'UAH', 'RUB', 'PLN', 'USDT'];

export const currencyMap: Record<string, string> = {
    // USD
    'usd': 'USD',
    'доллар': 'USD',
    'доллары': 'USD',
    'доллар сша': 'USD',

    // EUR
    'eur': 'EUR',
    'евро': 'EUR',

    // GBP
    'gbp': 'GBP',
    'фунт': 'GBP',
    'фунты': 'GBP',
    'фунт стерлингов': 'GBP',

    // CNY
    'cny': 'CNY',
    'юань': 'CNY',
    'юани': 'CNY',
    'китайский юань': 'CNY',

    // KZT
    'kzt': 'KZT',
    'тенге': 'KZT',

    // UAH
    'uah': 'UAH',
    'гривна': 'UAH',
    'гривны': 'UAH',
    'украинская гривна': 'UAH',

    // RUB
    'rub': 'RUB',
    'рубль': 'RUB',
    'рубли': 'RUB',
    'российский рубль': 'RUB',

    // PLN
    'pln': 'PLN',
    'злоты': 'PLN',
    'злотый': 'PLN',
    'польский злотый': 'PLN',

    // USDT
    'usdt': 'USDT',
    'тетер': 'USDT',
    'usd tether': 'USDT'
};

// ============================================
// ОПРЕДЕЛЕНИЕ КОДА ВАЛЮТЫ ПО ТЕКСТУ
// ============================================
export function detectCurrency(text: string): string | null {
    const lowerText = text.toLowerCase().trim();

    // Ищем точное совпадение
    if (currencyMap[lowerText]) {
        return currencyMap[lowerText];
    }

    // Ищем частичное совпадение
    for (const [key, value] of Object.entries(currencyMap)) {
        if (lowerText.includes(key)) {
            return value;
        }
    }

    return null;
}

// ============================================
// ПОЛУЧЕНИЕ КУРСА ВАЛЮТЫ ОТ НБРБ
// ============================================
export async function getExchangeRate(currency: string): Promise<{ code: string; message: string } | null> {
    try {
        console.log(`🔍 Запрос курса для: ${currency}`);

        // Для USDT используем Binance + курс USD к BYN
        if (currency === 'USDT') {
            const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTUSD');
            if (!binanceResponse.ok) {
                console.error('❌ Ошибка API Binance:', binanceResponse.status);
                return null;
            }
            const binanceData = await binanceResponse.json();
            const usdtToUsd = parseFloat(binanceData.price);

            const nbrbResponse = await fetch('https://api.nbrb.by/exrates/rates/USD?parammode=2');
            if (!nbrbResponse.ok) {
                console.error('❌ Ошибка API НБРБ:', nbrbResponse.status);
                return null;
            }
            const nbrbData = await nbrbResponse.json();
            const usdToByn = nbrbData.Cur_OfficialRate / nbrbData.Cur_Scale;

            const usdtToByn = usdtToUsd * usdToByn;

            return {
                code: 'USDT',
                message: `💰 USDT (Tether USD): ${usdtToByn.toFixed(4)} BYN за 1 USDT\n📊 1 USDT ≈ ${usdtToUsd.toFixed(4)} USD`
            };
        }

        // Для фиатных валют используем API НБРБ
        const response = await fetch(`https://api.nbrb.by/exrates/rates/${currency}?parammode=2`);

        if (!response.ok) {
            console.error('❌ Ошибка API НБРБ:', response.status);
            return null;
        }

        const data = await response.json();
        console.log('✅ API ответ получен');

        const currencyCode = currency.toUpperCase();

        // Если BYN (базовая валюта)
        if (currencyCode === 'BYN') {
            return {
                code: 'BYN',
                message: `🇧🇾 BYN (Белорусский рубль) - 1 BYN`
            };
        }

        // Проверяем, есть ли валюта в ответе
        if (data && data.Cur_ID) {
            const rate = data.Cur_OfficialRate / data.Cur_Scale;
            return {
                code: currencyCode,
                message: `💰 ${data.Cur_Abbreviation} (${data.Cur_Name}): ${rate.toFixed(4)} BYN за 1 ${data.Cur_Abbreviation}`
            };
        }

        console.log(`❌ Валюта ${currencyCode} не найдена в НБРБ`);
        return null;
    } catch (error) {
        console.error('❌ Ошибка получения курса:', error instanceof Error ? error.message : String(error));
        return null;
    }
}