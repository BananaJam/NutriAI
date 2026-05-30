#import "../template.typ": (
  city, department-head, department-name, faculty-name, form-row, hint, line-field, normal-table, numbered-line,
  person-academic-mention, person-full-name, person-initials, person-short-mention, specialty-code, specialty-name,
  student, supervisor, topic, university-name,
)

#set text(
  font: "Times New Roman",
  size: 13pt,
  lang: "uk",
)

#set page(
  paper: "a4",
  margin: (top: 15mm, bottom: 15mm, left: 18mm, right: 12mm),
  numbering: none,
)

#set par(
  justify: true,
  first-line-indent: 0pt,
  leading: 0.28em,
)

#align(center)[
  #text(weight: "bold", style: "italic", size: 13pt)[#upper(university-name)]
]

#v(0.45em)

#form-row([Факультет], [електроніки та комп'ютерних технологій])
#form-row([Кафедра], [системного проектування])
#form-row([Освітній ступінь], [бакалавр], width: 8.4cm)
#form-row([Галузь знань], [І Інформаційні технології], note: [(шифр і назва)])
#form-row([Спеціальність], [#specialty-code #specialty-name], note: [(шифр і назва)])

#v(0.35em)

#align(right)[
  “ЗАТВЕРДЖУЮ” #linebreak()
  Завідувач кафедри #line-field(width: 4.4cm) #linebreak()
  #person-short-mention(department-head) #linebreak()
  “#line-field(width: 0.8cm)” #line-field(width: 2.4cm) 2026 р.
]

#v(0.8em)

#align(center)[
  #text(weight: "bold", tracking: 1.8pt)[ЗАВДАННЯ] #linebreak()
  #text(weight: "bold")[НА КВАЛІФІКАЦІЙНУ (БАКАЛАВРСЬКУ) РОБОТУ СТУДЕНТУ]
]

#v(0.4em)

#align(center)[
  #line-field(body: [Вибираному Владиславу, студенту групи #student.group], width: 13cm)
  #linebreak()
  #hint[(прізвище, ім'я, група)]
]

#v(0.6em)

#numbered-line(
  1,
  [Тема роботи],
  [“#topic”],
)

#grid(
  columns: (auto, 1fr),
  gutter: 0.35em,
  [керівник роботи],
  align(center)[
    #line-field(body: [#person-academic-mention(supervisor)], align-body: center)
    #linebreak()
    #hint[(прізвище, ім'я, по батькові, науковий ступінь, вчене звання)]
  ],
)

#grid(
  columns: (auto, 1fr, auto, 2.2cm),
  gutter: 0.3em,
  [затверджені вченою радою факультету від “#line-field(body: [27], width: 0.8cm)”],
  line-field(body: [жовтня], width: 1fr),
  [2026 року №],
  line-field(body: [66/25], width: 2.2cm),
)

#numbered-line(2, [Строк подання студентом роботи], [01.06.2026 р.])

#numbered-line(
  3,
  [Вихідні дані до роботи],
  [
    TypeScript, Next.js 16, Bun, PostgreSQL, Prisma, Elysia, Better Auth, React Query,
    Vercel AI SDK, OpenAI/Anthropic API; теоретичні матеріали з моніторингу харчування,
    персоналізованих ШІ-асистентів, виклику інструментів, агентних SDK, моделювання даних і
    повностекової архітектури веб-застосунків.
  ],
)

#v(0.3em)

#[
  4. Зміст розрахунково-пояснювальної записки (перелік питань, які потрібно розробити)
]

#v(0.15em)

#enum(
  [Проаналізувати предметну область систем моніторингу харчування, планування раціону та прикладних ШІ-асистентів.],
  [Спроєктувати доменну модель користувача, профілю, каталогу продуктів, журналу харчування, планів, цілей і повідомлень ШІ-чату.],
  [Розробити математичне забезпечення для розрахунку добових норм, макронутрієнтів, статистики прогресу та прогнозу зміни маси тіла.],
  [Обґрунтувати повностекову архітектуру веб-застосунку на основі Next.js, Bun, Prisma, PostgreSQL та Elysia.],
  [Реалізувати модулі профілю, каталогу продуктів, журналу харчування, планів, цілей, аналітики та налаштувань користувача.],
  [Реалізувати ШІ-асистента з контрольованим викликом інструментів і доступом до даних застосунку.],
  [Провести тестування, підготувати демонстраційні дані, скріншоти інтерфейсу та порівняльний аналіз агентних SDK.],
)

#v(0.3em)

#numbered-line(
  5,
  [Перелік графічного матеріалу],
  [
    ER-діаграма доменної моделі; схема архітектури системи; схема роботи ШІ-асистента
    з викликом інструментів; скріншоти панелі показників, журналу харчування, планів, цілей,
    профілю, ШІ-чату та лабораторії агентних SDK; таблиці результатів бенчмарк-порівняння.
  ],
)

#v(0.5em)

6. Консультанти розділів роботи

#v(0.2em)

#normal-table(
  (3.2cm, 6.1cm, 2.8cm, 2.8cm),
  (
    [*Розділ*],
    [*Прізвище, ініціали та посада консультанта*],
    [*Підпис, дата* #linebreak() *завдання видав*],
    [*Підпис, дата* #linebreak() *завдання прийняв*],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
  ),
)

#v(0.8em)

#grid(
  columns: (auto, 1fr),
  gutter: 0.4em,
  [7. Дата видачі завдання], line-field(body: [02.02.2026 р.], align-body: center),
)

#align(center)[
  #text(weight: "bold", tracking: 2pt)[КАЛЕНДАРНИЙ ПЛАН]
]

#v(0.4em)

#normal-table(
  (1.1cm, 8.3cm, 3.2cm, 2.4cm),
  (
    [*№ з/п*],
    [*Назва етапів кваліфікаційної роботи*],
    [*Строк виконання етапів роботи*],
    [*Примітка*],
    [1],
    [Отримання завдання. Ознайомлення з темою, уточнення мети, завдань, об'єкта і предмета дослідження.],
    [02.02.2026],
    [Виконано],
    [2],
    [Аналіз предметної області, існуючих систем моніторингу харчування та підходів до побудови ШІ-асистентів.],
    [15.03.2026],
    [Виконано],
    [3],
    [Проєктування доменної моделі, структури бази даних, алгоритмів розрахунку харчових показників і архітектури застосунку.],
    [10.04.2026],
    [Виконано],
    [4],
    [Реалізація веб-застосунку: профіль, каталог продуктів, журнал, плани, цілі, аналітика та налаштування.],
    [05.05.2026],
    [Виконано],
    [5],
    [Реалізація ШІ-асистента, інтеграція виклику інструментів, підготовка лабораторії агентних SDK і бенчмарк-сценаріїв.],
    [18.05.2026],
    [Виконано],
    [6],
    [Тестування, формування демонстраційних даних, знімання скріншотів, оформлення пояснювальної записки, README та додатків.],
    [01.06.2026],
    [Виконано],
  ),
)

#v(1.4em)

#grid(
  columns: (3.5cm, 4.5cm, 1fr),
  gutter: 0.7em,
  align: (left, center, center),
  [Студент],
  [
    #line-field(width: 4.5cm)
    #linebreak()
    #hint[(підпис)]
  ],
  [
    #line-field(body: [#person-initials(student, separator: " ")], width: 5.5cm)
    #linebreak()
    #hint[(прізвище та ініціали)]
  ],

  [Керівник роботи],
  [
    #line-field(width: 4.5cm)
    #linebreak()
    #hint[(підпис)]
  ],
  [
    #line-field(body: [#person-initials(supervisor, separator: " ")], width: 5.5cm)
    #linebreak()
    #hint[(прізвище та ініціали)]
  ],
)

#v(2em)

#align(right)[#city — 2026]
