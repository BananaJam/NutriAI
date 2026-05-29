# NutriAI

Персоналізований AI-асистент для планування харчування та моніторингу споживання калорій.

---

## Автор

- **ПІБ**: Вибираний Владислав
- **Група**: ФЕІ-42
- **Керівник**: доц. Стахіра Р. Й.
- **Дата виконання**: 20.05.2026

---

## Загальна інформація

- **Тип проєкту**: Веб-застосунок (Full-stack)
- **Мова програмування**: TypeScript (Node.js/Bun + Next.js)
- **Фреймворки / бібліотеки**: Next.js 16, Prisma, PostgreSQL, Better Auth, Elysia, React Query, Bun, Tailwind CSS

---

## Демонстрація

Короткий відеозапис показує основні сценарії роботи застосунку: вхід у систему, додавання їжі в журнал, роботу з планом харчування, пошук продуктів, створення цілі та запит до AI-асистента.

[![Демонстрація роботи застосунку](https://github.com/BananaJam/NutriAI/raw/refs/heads/main/report/assets/videos/nutriai-showcase.mp4)](https://github.com/BananaJam/NutriAI/raw/refs/heads/main/report/assets/videos/nutriai-showcase.mp4)

---

## Опис функціоналу

- **Панель приладів**: візуалізація трендів, виконання цілей та останньої активності.
- **Журнал харчування**: логування прийомів їжі з групуванням та розрахунком макронутрієнтів.
- **Плани харчування**: створення тижневих планів та перенесення страв у щоденний журнал.
- **Система цілей**: відстеження калорій, білків, води та ваги з розрахунком прогресу.
- **AI-асистент**: помічник, що шукає продукти, аналізує статистику та допомагає з логуванням через tool calling.
- **Профіль та налаштування**: керування антропометричними даними, цілями та параметрами інтерфейсу.

---

## Структура репозиторію

| Каталог / файл | Призначення |
|----------------|-------------|
| `app/` | Маршрути Next.js App Router: Dashboard, Food Log, Plans, Goals, Profile, Assistant, Settings та auth-сторінки |
| `app/api/[[...slugs]]/route.ts` | Вхідна точка Next.js API route, яка прокидує запити до Elysia API |
| `components/ui/` | Базові UI-примітиви: кнопки, діалоги, картки, tabs, sidebar, tooltip тощо |
| `components/features/` | Функціональні компоненти продукту: форми, журнал харчування, meal plans, assistant lab, auth UI |
| `lib/` | Клієнтські helper-модулі, типізований API-клієнт, аналітика харчування, логіка цілей, meal plans і settings |
| `server/` | Серверна частина застосунку на Elysia |
| `server/routes/` | API-маршрути для foods, food logs, meal plans, goals, profile, settings, chat і assistant lab |
| `server/lib/` | Серверні інтеграції: auth, session, Prisma client, agent lab execution |
| `prisma/` | Основна Prisma-схема та seed-скрипт |
| `generated/prisma/` | Згенерований Prisma Client; не редагується вручну |
| `scripts/` | Допоміжні сценарії: demo seed, screenshots для звіту, agent benchmark, запис showcase-відео |
| `report/content/` | Typst-джерела завдання, звіту, додатків і bibliography |
| `report/template.typ` | Спільний шаблон оформлення Typst-документів |
| `report/assets/` | Скріншоти, benchmark-дані та демонстраційні матеріали |
| `report/build/` | Згенеровані PDF-файли завдання, звіту та додатків |
| `report/assets/screenshots/` | Скріншоти інтерфейсу для пояснювальної записки |
| `report/assets/videos/` | Демонстраційні відео застосунку |
| `public/` | Статичні assets Next.js |

Основні файли входу: `app/page.tsx` для Dashboard, `server/index.ts` для Elysia API, `prisma/schema.prisma` для моделі даних, `lib/api.ts` для типізованого клієнта та `server/routes/chat.ts` для AI-асистента.

---

## Як запустити проєкт з нуля

### 1. Встановлення інструментів

- **Bun** (рекомендовано) або Node.js v20+
- **PostgreSQL** локально або у хмарному сервісі

### 2. Клонування репозиторію

```bash
git clone https://github.com/vvybyranyi/nutri-ai.git
cd nutri-ai
```

### 3. Встановлення залежностей

```bash
bun install
```

### 4. Створення `.env` файлу

Створіть файл `.env` у корені проєкту:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nutriai"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AI_PROVIDER="openai" # або "anthropic"
OPENAI_API_KEY="your_api_key"
```

### 5. Налаштування бази даних

```bash
bun run db:push
bun run db:generate
bun run db:seed
```

### 6. Запуск

```bash
bun dev
```

Відкрийте [http://localhost:3000](http://localhost:3000).

---

## Корисні команди

```bash
bun run lint
bun run build
bun run report:seed
bun run report:screenshots
bun run showcase:video
```

Команда `bun run showcase:video` створює демонстраційний запис у форматах WebM та MP4 у папці `report/assets/videos/`.

---

## API приклади

Документація API доступна після запуску застосунку за адресою:

- Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- Health check: `GET /api/health`

Основні групи API-маршрутів:

- `GET/POST /api/foods`, `PUT/DELETE /api/foods/:id` — каталог продуктів;
- `GET /api/food-logs`, `GET /api/food-logs/:date`, `POST /api/food-logs/:date/items`, `PATCH/DELETE /api/food-logs/items/:itemId` — журнал харчування;
- `GET/POST /api/meal-plans`, `PUT/DELETE /api/meal-plans/:id` — плани харчування;
- `GET/POST /api/goals`, `PUT/DELETE /api/goals/:id` — цілі користувача;
- `GET/PUT /api/profile`, `GET /api/profile/stats` — профіль і статистика;
- `GET/PUT /api/settings` — налаштування;
- `GET/POST /api/chat/conversations` і `POST /api/chat/conversations/:id/messages` — AI-чат;
- `GET/POST /api/chat-lab/runs` — лабораторія агентних SDK.

### Статистика профілю

**GET /api/profile/stats**

Отримати дані для графіків, дотримання плану та активних стріків.

### Журнал харчування

**POST /api/food-logs/:date/items**

```json
{
  "foodId": "uuid",
  "mealType": "BREAKFAST",
  "servings": 1,
  "notes": "Logged from README example"
}
```

### AI-асистент

**POST /api/chat/conversations/:id/messages**

Надсилання повідомлення до AI-агента з доступом до інструментів.

---

## Інструкція для користувача

1. **Початок роботи** — зареєструйтесь та заповніть дані профілю: вага, зріст, активність і цільові показники.
2. **Dashboard** — переглядайте залишок калорій на день, тренди макронутрієнтів та активні цілі.
3. **Журнал (Log)** — додавайте спожиті страви через пошук або власний каталог продуктів.
4. **Плани (Plans)** — плануйте раціон наперед та застосовуйте план до конкретного дня.
5. **AI-асистент** — ставте питання на кшталт "Скільки білка я з'їв вчора?" або "Знайди продукти з низьким вмістом жиру".

---

## Скриншоти

- **Dashboard**: `report/assets/screenshots/dashboard.png`
- **Food Log**: `report/assets/screenshots/food-log.png`
- **AI Assistant**: `report/assets/screenshots/assistant.png`
- **Meal Plans**: `report/assets/screenshots/meal-plans.png`
- **Goals**: `report/assets/screenshots/goals.png`

Більше скриншотів доступно у папці `report/assets/screenshots/`.

---

## Проблеми і рішення

| Проблема | Рішення |
|----------|---------|
| Database Connection Error | Перевірити правильність `DATABASE_URL` у `.env` |
| AI не відповідає | Перевірити `OPENAI_API_KEY` та статус сервісу |
| Prisma Type Errors | Виконати `bun run db:generate` для оновлення клієнта |
| Auth errors | Переконатись, що `NEXT_PUBLIC_APP_URL` відповідає вашому домену |

---

## Використані джерела / література

- [Next.js Documentation](https://nextjs.org/docs)
- [ElysiaJS - Fast Bun Web Framework](https://elysiajs.com/)
- [Prisma ORM Guide](https://www.prisma.io/docs)
- [Better Auth Documentation](https://www.better-auth.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [WHO: Healthy Diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)

---
