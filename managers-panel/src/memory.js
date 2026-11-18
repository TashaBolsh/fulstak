import {mkdirSync, writeFileSync} from 'node:fs'
import { join } from 'node:path'

// Память чата: переписка текущей сессии в оперативной памяти (массив messages) т ее копия на диске.
//Каждый запуск - новая сессия со своим файлом memory/<время запуска>.json.
const DIR = join(import.meta.dirname, '..','memory')
const FILE = join(DIR, `${new Date().toISOString().slice(0,19).replaceAll(':','-')}.json`)

export const messages = []

export function remember(...newMessages){
    messages.push(...newMessages)
mkdirSync(DIR, {recursive: true})
writeFileSync(FILE, JSON.stringify(messages, null, 2))
}