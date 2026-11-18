import readline from 'node:readline';
import {ask} from './openai-adapter.js';
import  {messages, remember} from './memory.js';

// Настройка ввода/вывода
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
});

rl.prompt();
//'line' срабатывает когда пользователь нажал Enter
rl.on('line', async(line) => {
    rl.pause() //пока ждет ответ новый ввод не принемаем - prompt() снова включит его
    const question = {role:'user', content: line}
    try {
        // Модель не помнит прошлые запросы, поэтому каждый раз отправляет всю переписку.
        const answer = await ask([...messages, question])
        //В память пишем только удачный обмен: вопрос без ответа не засоряет историю.
        remember(question, {role: 'assistant', content: answer})
        console.log(`*${answer}\n`);
    } catch(error) {
        console.log(`Ошибка: ${error.message}\n`);
    }
    //Пока ждали ответ, пользователь мог закрыть (Ctrl+C) - тогда приглашение уже не нужно.
    if (!rl.closed) rl.prompt();
})

