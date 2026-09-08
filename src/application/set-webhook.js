// set-webhook.js - автоматическое определение и обновление URL

import { exec } from 'child_process';
import readline from 'readline';
import fs from 'fs/promises';

// Загружаем .env
process.loadEnvFile(new URL('../../.env', import.meta.url));

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не задан в .env');
    process.exit(1);
}

// ============================================
// ФУНКЦИЯ ДЛЯ ВВОДА URL ВРУЧНУЮ
// ============================================
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// ============================================
// ФУНКЦИЯ ДЛЯ ЧТЕНИЯ URL ИЗ .env
// ============================================
async function getTunnelUrlFromEnv() {
    try {
        const envContent = await fs.readFile('.env', 'utf-8');
        const match = envContent.match(/TUNNEL_URL=(.+)/);
        if (match) {
            const url = match[1].trim();
            console.log(`📖 Текущий URL из .env: ${url}`);
            return url;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// ============================================
// ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ URL В .env
// ============================================
async function saveTunnelUrlToEnv(url) {
    try {
        let envContent = '';
        try {
            envContent = await fs.readFile('.env', 'utf-8');
        } catch (error) {
            // Файла нет - создадим новый
        }

        const lines = envContent.split('\n');
        let found = false;
        const updatedLines = lines.map(line => {
            if (line.startsWith('TUNNEL_URL=')) {
                found = true;
                return `TUNNEL_URL=${url}`;
            }
            return line;
        });

        if (!found) {
            updatedLines.push(`TUNNEL_URL=${url}`);
        }

        await fs.writeFile('.env', updatedLines.join('\n'));
        console.log(`✅ URL сохранён в .env: ${url}`);
        return true;
    } catch (error) {
        console.log('⚠️ Не удалось сохранить URL в .env');
        return false;
    }
}

// ============================================
// ФУНКЦИЯ ДЛЯ ЗАПУСКА ТУННЕЛЯ И ПЕРЕХВАТА URL
// ============================================
function runTunnelAndCaptureUrl() {
    return new Promise((resolve, reject) => {
        console.log('\n🚀 Запускаем туннель и ждём URL...');
        console.log('⏳ Это может занять несколько секунд...\n');

        const tunnel = exec('npm run tunnel', { shell: true });
        let url = null;

        tunnel.stdout.on('data', (data) => {
            console.log(data);
            const match = data.match(/https:\/\/[a-f0-9]+\.lhr\.life/);
            if (match && !url) {
                url = match[0];
                console.log(`\n✅ Новый URL из туннеля: ${url}`);
                resolve(url);
                tunnel.kill();
            }
        });

        tunnel.stderr.on('data', (data) => {
            console.error(data);
        });

        tunnel.on('close', (code) => {
            if (!url) {
                reject(new Error('Туннель завершился без URL'));
            }
        });

        setTimeout(() => {
            if (!url) {
                tunnel.kill();
                reject(new Error('Не удалось определить URL туннеля за 30 секунд'));
            }
        }, 30000);
    });
}

// ============================================
// ОСНОВНАЯ ФУНКЦИЯ УСТАНОВКИ ВЕБХУКА
// ============================================
async function setWebhook() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🔧 НАСТРОЙКА ВЕБХУКА ДЛЯ TELEGRAM');
        console.log('='.repeat(60));

        // 1. Читаем старый URL из .env
        let oldUrl = await getTunnelUrlFromEnv();

        // 2. Запускаем туннель и получаем новый URL
        let newUrl = null;
        try {
            newUrl = await runTunnelAndCaptureUrl();
        } catch (error) {
            console.log(`\n⚠️ Не удалось автоматически получить URL: ${error.message}`);
        }

        // 3. Определяем, какой URL использовать
        let baseUrl = null;

        if (newUrl) {
            // Если URL изменился — обновляем .env
            if (oldUrl && oldUrl !== newUrl) {
                console.log(`\n🔄 URL изменился:`);
                console.log(`   Старый: ${oldUrl}`);
                console.log(`   Новый:  ${newUrl}`);
                await saveTunnelUrlToEnv(newUrl);
                baseUrl = newUrl;
            } else if (!oldUrl) {
                // Если в .env нет URL — сохраняем новый
                await saveTunnelUrlToEnv(newUrl);
                baseUrl = newUrl;
            } else {
                // URL не изменился — используем существующий
                console.log(`\n✅ URL не изменился, используем существующий`);
                baseUrl = oldUrl;
            }
        } else {
            // Не удалось получить URL автоматически
            console.log('\n⚠️ Не удалось получить URL автоматически.');

            if (oldUrl) {
                console.log(`📖 Использую существующий URL из .env: ${oldUrl}`);
                baseUrl = oldUrl;
            } else {
                console.log('📋 Пожалуйста, введите URL туннеля вручную:');
                baseUrl = await askQuestion('\n🔗 URL туннеля: ');
                if (baseUrl) {
                    await saveTunnelUrlToEnv(baseUrl);
                }
            }
        }

        if (!baseUrl) {
            console.error('❌ URL не может быть пустым');
            return;
        }

        // Формируем URL вебхука
        const webhookURL = `${baseUrl.replace(/\/$/, "")}/webhook/telegram`;

        console.log(`\n📋 Устанавливаем вебхук на: ${webhookURL}`);
        console.log(`🤖 Токен бота: ${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 5)}`);

        // Отправляем запрос на установку вебхука
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookURL,
                max_connections: 10
            })
        });

        const data = await response.json();

        console.log('\n📊 РЕЗУЛЬТАТ:');
        console.log(`   ✅ Успешно: ${data.ok}`);
        console.log(`   📝 Описание: ${data.description || 'нет'}`);
        console.log('='.repeat(60) + '\n');

        if (data.ok) {
            console.log('✅ Вебхук успешно установлен!');
            console.log(`🔗 Telegram отправляет апдейты на: ${webhookURL}`);
        } else {
            console.error('❌ Ошибка:', data.description);
        }
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

// ============================================
// ПРОВЕРКА ВЕБХУКА
// ============================================
async function getWebhookInfo() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
        const data = await response.json();

        console.log('\n📊 ТЕКУЩИЙ ВЕБХУК:');
        console.log(`   ✅ Успешно: ${data.ok}`);
        if (data.result) {
            console.log(`   🔗 URL: ${data.result.url || 'не установлен'}`);
            console.log(`   📦 Ожидающих апдейтов: ${data.result.pending_update_count || 0}`);
            console.log(`   🔌 Макс. соединений: ${data.result.max_connections || 40}`);
        }
        console.log('='.repeat(60) + '\n');
    } catch (error) {
        console.error('❌ Ошибка при проверке:', error.message);
    }
}

// ============================================
// УДАЛЕНИЕ ВЕБХУКА
// ============================================
async function deleteWebhook() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
        const data = await response.json();
        console.log(`\n✅ Вебхук удален: ${data.ok}`);
        console.log('='.repeat(60) + '\n');
    } catch (error) {
        console.error('❌ Ошибка при удалении:', error.message);
    }
}

// ============================================
// ЗАПУСК
// ============================================
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'set';

    console.log(`\n🔧 Команда: ${command}`);

    switch (command) {
        case 'set':
            await setWebhook();
            break;
        case 'info':
            await getWebhookInfo();
            break;
        case 'delete':
            await deleteWebhook();
            break;
        default:
            console.log(`
  npm run webhook              - установить вебхук (автоматически)
            `);
    }
    process.exit(0);
}

main();