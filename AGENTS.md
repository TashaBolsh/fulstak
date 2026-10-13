# AGENTS.md — правила проекта Fulstak

Этот файл описывает архитектурные и технические правила, которые **обязательны**
к соблюдению при генерации любого кода (фронтенд, бэкенд, edge functions, скрипты).

---

## 🏗️ Архитектура фронтенда: FSD (Feature-Sliced Design)

Проект использует **Feature-Sliced Design** с **pages-first** подходом.

### Структура слоёв (сверху вниз)

### Pages-first подход

1. **Начинаем с `pages/`** — определяем маршруты и страницы.
2. Страница собирает **виджеты и фичи** сверху вниз.
3. Если для страницы не хватает фичи или сущности — **создаём её на нужном слое**,
   а не пихаем логику в страницу.
4. Компоненты **не импортируются через слои снизу вверх** (см. правила импортов).

### Правила импортов FSD

- `app` → может импортировать **всё**
- `pages` → может импортировать `widgets`, `features`, `entities`, `shared`
- `widgets` → может импортировать `features`, `entities`, `shared`
- `features` → может импортировать `entities`, `shared`
- `entities` → может импортировать **только** `shared`
- `shared` → **не импортирует ничего** выше себя

**Запрещено:** импортировать из слоя выше себя (например, `entities → features`).

### Публичный API слайса

Каждый слайс (`pages/Home`, `features/Login`, `entities/Client`) обязан иметь
файл `index.ts`, который экспортирует **только** публичный API:

```ts
// src/entities/client/index.ts
export { ClientCard } from "./ui/ClientCard";
export type { Client } from "./model/types";
export { useClientStore } from "./model/store";
import { ClientCard, useClientStore } from "@/entities/client";
import { ClientCard } from "@/entities/client/ui/ClientCard"; // ❌

src/entities/client/model/store.ts       ← стор сущности Client
src/features/select-client/model/store.ts ← стор фичи выбора клиента
src/app/store/                           ← глобальные сторы (тема, роутер)

import { useClientStore } from "@/entities/client";

export function ClientCard({ client }: { client: Client }) {
  const selectClient = useClientStore((s) => s.selectClient);
  return <div onClick={() => selectClient(client.id)}>{client.first_name}</div>;
}
useQuery({ queryKey: ["clients"], queryFn: fetchClients });
useInfiniteQuery({ queryKey: ["messages", clientId], ... });
---
description: FSD pages-first + Zustand для шаринга данных
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: true
---

# FSD pages-first + Zustand

- Структура: app / pages / widgets / features / entities / shared
- Импорты только сверху вниз
- Публичный API слайса — через index.ts
- Для шаринга данных — Zustand (не props drilling)
- Серверные данные — TanStack Query
- UI — shadcn/ui + Tailwind