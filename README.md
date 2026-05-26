# 📘 NutriAI

> Персоналізований AI-асистент для планування харчування та моніторингу споживання калорій.

---

## 👤 Автор

- **ПІБ**: Вибираний Владислав
- **Група**: ФЕІ-42
- **Керівник**: доц. Стахіра Р. Й.
- **Дата виконання**: 20.05.2026

---

## 📌 Загальна інформація

- **Тип проєкту**: Веб-застосунок (Full-stack)
- **Мова програмування**: TypeScript (Node.js/Bun + Next.js)
- **Фреймворки / Бібліотеки**: Next.js 16, Prisma, PostgreSQL, Better Auth, Elysia, React Query, Bun, Tailwind CSS

---

## 🧠 Опис функціоналу

- 📊 **Панель приладів**: Візуалізація трендів, виконання цілей та останньої активності.
- 🥗 **Журнал харчування**: Зручне логування прийомів їжі з групуванням та розрахунком макронутрієнтів.
- 📅 **Плани харчування**: Створення тижневих планів та швидке перенесення страв у щоденний журнал.
- 🎯 **Система цілей**: Відстеження калорій, білків та ваги з динамічним розрахунком прогресу.
- 🤖 **AI-асистент**: Розумний помічник, що вміє шукати продукти, аналізувати статистику та допомагати з логуванням через Tool Calling.
- 👤 **Профіль та налаштування**: Гнучке налаштування антропометричних даних, цілей та інтерфейсу.

---

## 🧱 Структура репозиторію

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
| `scripts/` | Допоміжні сценарії: demo seed, screenshots для звіту, agent benchmark |
| `report/content/` | Typst-джерела завдання, звіту, додатків і bibliography |
| `report/template.typ` | Спільний шаблон оформлення Typst-документів |
| `report/assets/` | Скріншоти, benchmark-дані та демонстраційні матеріали |
| `report/build/` | Згенеровані PDF-файли завдання, звіту та додатків |
| `report/assets/screenshots/` | Скріншоти інтерфейсу для пояснювальної записки |
| `public/` | Статичні assets Next.js |

Основні файли входу: `app/page.tsx` для Dashboard, `server/index.ts` для Elysia API, `prisma/schema.prisma` для моделі даних, `lib/api.ts` для типізованого клієнта та `server/routes/chat.ts` для AI-асистента.

---

## ▶️ Як запустити проєкт "з нуля"

### 1. Встановлення інструментів

- **Bun** (рекомендовано) або Node.js v20+
- **PostgreSQL** (локально або хмарний сервіс)

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

Відкрийте [http://localhost:3000](http://localhost:3000)

---

## 🔌 API приклади

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

### 📊 Статистика профілю

**GET /api/profile/stats**

Отримати дані для графіків, дотримання плану та активних стріків.

---

### 🥗 Журнал харчування

**POST /api/food-logs/:date/items**

```json
{
  "foodId": "uuid",
  "mealType": "BREAKFAST",
  "servings": 1,
  "notes": "Logged from README example"
}
```

---

### 🤖 AI Асистент

**POST /api/chat/conversations/:id/messages**

Надсилання повідомлення до AI-агента з доступом до інструментів.

---

## 🖱️ Інструкція для користувача

1. **Початок роботи** — Зареєструйтесь та заповніть дані профілю (вага, зріст, активність) для розрахунку норм.
2. **Dashboard** — Слідкуйте за залишком калорій на день та трендом макронутрієнтів.
3. **Журнал (Log)** — Додавайте страви, які ви спожили. Використовуйте пошук або додавайте свої продукти.
4. **Плани (Plans)** — Сплануйте свій раціон наперед та застосуйте план до конкретного дня в один клік.
5. **AI Асистент** — Запитуйте "Скільки білка я з'їв вчора?" або "Знайди продукти з низьким вмістом жиру".

---

## 📷 Приклади / скриншоти

- **Dashboard**: `report/assets/screenshots/dashboard.png`
- **Food Log**: `report/assets/screenshots/food-log.png`
- **AI Assistant**: `report/assets/screenshots/assistant.png`
- **Meal Plans**: `report/assets/screenshots/meal-plans.png`
- **Goals**: `report/assets/screenshots/goals.png`

(Більше скриншотів доступно у папці `report/assets/screenshots/`)

---

## 🧪 Проблеми і рішення

| Проблема              | Рішення                            |
|----------------------|------------------------------------|
| Database Connection Error | Перевірити правильність `DATABASE_URL` у `.env` |
| AI не відповідає     | Перевірити `OPENAI_API_KEY` та статус сервісу |
| Prisma Type Errors   | Виконати `bun run db:generate` для оновлення клієнта |
| Auth errors          | Переконайтесь, що `NEXT_PUBLIC_APP_URL` відповідає вашому домену |

---

## 🧾 Використані джерела / література

- [Next.js Documentation](https://nextjs.org/docs)
- [ElysiaJS - Fast Bun Web Framework](https://elysiajs.com/)
- [Prisma ORM Guide](https://www.prisma.io/docs)
- [Better Auth Documentation](https://www.better-auth.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [WHO: Healthy Diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)

---
