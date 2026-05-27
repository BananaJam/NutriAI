#import "@preview/codly:1.3.0": *
#import "@preview/codly-languages:0.1.10": *
#import "../template.typ": no-indent, simple-table

#set text(
  font: "Times New Roman",
  size: 14pt,
  lang: "uk",
)

#show raw.where(block: true): set text(size: 8pt)
#show raw.where(block: false): set text(font: "Times New Roman", size: 14pt)
#show: codly-init.with()

#codly(
  languages: codly-languages,
)

#set page(
  paper: "a4",
  margin: (top: 20mm, bottom: 20mm, left: 20mm, right: 10mm),
  numbering: "1",
  number-align: top + right,
)

#set par(
  justify: true,
  first-line-indent: 1.25cm,
  leading: 0.84em,
  spacing: 0.84em,
)

#set figure.caption(separator: [ – ])
#set heading(numbering: none)

#show heading.where(level: 1): it => [
  #pagebreak(weak: true)
  #align(center)[
    #set text(weight: "bold", size: 14pt)
    #upper(it.body)
  ]
]

#show heading.where(level: 2): it => [
  #set text(weight: "bold", size: 14pt)
  #it.body
]

= Додаток А. README.md програми

#no-indent[
  Нижче наведено повний вміст файлу `README.md`, який входить до репозиторію програмного проєкту NutriAI.
]

#raw(read("/README.md"), lang: "md", block: true)

= Додаток Б. Структура проєкту та модулів

#no-indent[
  Основні каталоги репозиторію та їх призначення:
]

+ `app/` — маршрути Next.js App Router і сторінки застосунку;
+ `app/api/[[...slugs]]/route.ts` — прокидання HTTP-запитів до Elysia API;
+ `components/ui/` — базові UI-примітиви;
+ `components/features/` — функціональні компоненти NutriAI;
+ `lib/` — клієнтські helper-модулі, API-клієнт, аналітика, логіка цілей і планів;
+ `server/index.ts` — композиція серверного API;
+ `server/routes/` — групи API-маршрутів;
+ `server/lib/` — серверні інтеграції для auth, session, Prisma та agent lab;
+ `prisma/` — Prisma-схема і seed-логіка;
+ `generated/prisma/` — згенерований Prisma Client;
+ `scripts/` — сценарії для demo-даних, скріншотів і benchmark-перевірок;
+ `report/content/` — Typst-джерела звіту, додатків і бібліографії;
+ `report/assets/` — скріншоти, benchmark-дані та інші демонстраційні матеріали;
+ `report/template.typ` — спільний шаблон оформлення Typst-документів;
+ `report/build/` — згенеровані PDF-файли завдання, звіту та додатків;
+ `public/` — статичні файли.

#simple-table(
  3,
  (
    [*Модуль*],
    [*Ключові файли*],
    [*Відповідальність*],
    [Інтерфейс],
    [`app/`, `components/features/`, `components/ui/`],
    [Сторінки, форми, таблиці, діалоги, dashboard і чат],
    [API],
    [`server/index.ts`, `server/routes/*`],
    [Маршрути Elysia, авторизація, валідація, CRUD-операції],
    [Дані],
    [`prisma/schema.prisma`, `server/lib/prisma.ts`],
    [Опис доменної моделі та доступ до PostgreSQL],
    [Аналітика],
    [`lib/nutrition-analytics.ts`, `lib/goals.ts`, `lib/meal-plan.ts`],
    [Підсумки калорій, статистика, прогрес цілей, планування],
    [AI],
    [`server/routes/chat.ts`, `server/lib/agent-lab.ts`],
    [Tool calling, AI-чат, порівняння агентних SDK],
    [Документація],
    [`README.md`, `report/content/task.typ`, `report/content/report.typ`, `report/content/references.yml`, `report/content/appendices.typ`, `report/template.typ`],
    [README, завдання, джерела пояснювальної записки, додатки та бібліографія],
  ),
  [Структура основних модулів проєкту NutriAI.],
  ref-label: "tab-appendix-modules",
)

= Додаток В. Фрагменти програмного коду

#no-indent[
  У додатку наведено скорочені фрагменти коду, які демонструють ключові технічні рішення. Повні файли доступні у репозиторії.
]

*Фрагмент В.1 — підсумовування харчових показників у `lib/nutrition-analytics.ts`:*

```ts
export function sumNutritionTotals(items: NutritionItem[]) {
  return items.reduce(
    (totals, item) => {
      const servings = item.servings ?? 1;
      totals.calories += item.food.calories * servings;
      totals.protein += item.food.protein * servings;
      totals.carbs += item.food.carbs * servings;
      totals.fat += item.food.fat * servings;
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
```

*Фрагмент В.2 — захист API-маршруту через сесію в `server/routes/food-logs.ts`:*

```ts
.post("/:date/items", async ({ params, request, body, set }) => {
  const session = await requireRequestSession(request, set);
  if (!session) return { message: "Unauthorized" };

  const log = await prisma.foodLog.upsert({
    where: { userId_date: { userId: session.user.id, date: new Date(params.date) } },
    create: { userId: session.user.id, date: new Date(params.date) },
    update: {},
  });

  const item = await prisma.foodLogItem.create({
    data: { foodLogId: log.id, foodId: body.foodId, mealType: body.mealType },
  });
  return { item };
})
```

*Фрагмент В.3 — опис інструменту AI-асистента у `server/routes/chat.ts`:*

```ts
searchFoods: tool({
  description: "Search foods in the user's catalog",
  parameters: jsonSchema(searchFoodsSchema),
  execute: async ({ query, limit }) => {
    const foods = await prisma.food.findMany({
      where: buildFoodCatalogWhere({ search: query }),
      take: limit ?? 5,
    });
    return { foods };
  },
})
```

*Фрагмент В.4 — API-композиція у `server/index.ts`:*

```ts
export const api = new Elysia({ prefix: "/api" })
  .use(swagger({ path: "/docs" }))
  .get("/health", () => ({ status: "healthy" }))
  .all("/auth/*", async ({ request }) => auth.handler(request))
  .use(foodsRoutes)
  .use(foodLogsRoutes)
  .use(mealPlansRoutes)
  .use(goalsRoutes)
  .use(chatRoutes);
```
