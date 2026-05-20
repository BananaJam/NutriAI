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

## 🧱 Опис основних класів / файлів

| Клас / Файл     | Призначення |
|----------------|-------------|
| `server/index.ts` | Точка входу backend API (Elysia) |
| `prisma/schema.prisma` | Опис моделі даних та зв'язків у БД |
| `app/page.tsx` | Головна сторінка Dashboard (frontend) |
| `lib/api.ts` | Клієнт для типізованої взаємодії з API |
| `server/routes/chat.ts` | Логіка обробки AI-запитів та AI-агента |
| `components/features/food-log.tsx` | Компонент щоденного журналу харчування |

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

### 📊 Статистика профілю

**GET /api/profile/stats**

Отримати дані для графіків, дотримання плану та активних стріків.

---

### 🥗 Журнал харчування

**POST /api/food-logs**

```json
{
  "foodId": "uuid",
  "servingSize": 100,
  "mealType": "breakfast",
  "loggedAt": "2026-05-20T08:00:00Z"
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
## Screenshots
