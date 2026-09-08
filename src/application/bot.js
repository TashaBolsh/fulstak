process.loadEnvFile(new URL('../../.env', import.meta.url));

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('BOT_TOKEN не задан в .env');
    process.exit(1);
}

const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
let offset = 0;

async function poll() {
    try {
        const res = await fetch(`${url}?offset=${offset}`);
        const data = await res.json();

        if (data.result && data.result.length > 0) {
            for (const update of data.result) {
                console.log(JSON.stringify(update, null, 2));
                offset = update.update_id + 1;
            }
        }
       // else {
       //     console.log('Новых апдейтов нет');
       // }
    } catch (err) {
        console.error('Ошибка при запросе обновлений:', err.message); // исправлено consol → console
    }
}
// Запускаем первый раз
poll();
// Запускаем интервал каждые 5 секунд
setInterval(poll, 5000);