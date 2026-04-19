#import "@preview/mmdr:0.2.1": mermaid

#let student-name = "Вибираний Владислав"
#let student-group = "ФЕІ-42"
#let supervisor-name = "доц. Стахіра Р. Й."
#let reviewer-name = "________________________"
#let specialty-code = "121"
#let specialty-name = "Інженерія програмного забезпечення"
#let university-name = "Львівський національний університет імені Івана Франка"
#let faculty-name = "Факультет електроніки та комп'ютерних технологій"
#let department-name = "Кафедра системного проектування"
#let topic = "Розробка моделі планування харчування та моніторингу споживання калорій для AI-асистента"
#let city = "Львів"
#let defense-year = "2026"
#let approval-order = "____________"
#let approval-date = "____________"
#let submission-date = "____________"

#set text(
  font: "Times New Roman",
  size: 14pt,
  lang: "uk",
)

#set page(
  paper: "a4",
  margin: (top: 20mm, bottom: 20mm, left: 20mm, right: 10mm),
)

#set par(
  justify: true,
  first-line-indent: 1.25cm,
  leading: 0.75em,
)

#set heading(numbering: "1.1")

#show heading.where(level: 1): it => [
  #pagebreak(weak: true)
  #set align(center)
  #set text(weight: "bold", size: 14pt)
  #upper(it.body)
  #v(1em)
]

#show heading.where(level: 2): it => [
  #set align(left)
  #set text(weight: "bold", size: 14pt)
  #counter(heading).display(it.numbering)
  #h(0.5em)
  #it.body
  #v(0.5em)
]

#show heading.where(level: 3): it => [
  #set align(left)
  #set text(weight: "bold", style: "italic", size: 14pt)
  #counter(heading).display(it.numbering)
  #h(0.5em)
  #it.body
  #v(0.35em)
]

#let center-title(body) = align(center)[#body]

#let block-title(body) = [
  #align(center)[
    #text(weight: "bold", body)
  ]
]

#let no-indent(body) = [
  #set par(first-line-indent: 0pt)
  #body
]

#let screenshot(path, caption) = figure(
  image(path, width: 100%),
  caption: [#caption],
)

#let mermaid-diagram(source, caption) = figure(
  mermaid(
    source,
    base-theme: "default",
    theme: (
      background: "transparent",
      primary_color: "#f5f5f5",
      primary_text_color: "#111111",
      primary_border_color: "#444444",
      line_color: "#444444",
      secondary_color: "#efefef",
      tertiary_color: "#ffffff",
    ),
  ),
  caption: [#caption],
)

#let simple-table(columns, rows, caption) = figure(
  table(
    columns: columns,
    inset: 6pt,
    stroke: 0.6pt + rgb("#777777"),
    align: left + horizon,
    ..rows,
  ),
  caption: [#caption],
)

#let underline(width) = box(
  width: width,
  height: 1.1em,
  inset: 0pt,
  stroke: (bottom: 0.7pt + black),
)[]

#let sign-row(role, name, width: 7.2cm) = [
  #align(right)[
    #role #linebreak()
    #underline(width) #linebreak()
    #text(size: 9pt)[(підпис)          (ПІБ)]
    #if name != none [
      #linebreak()
      #name
    ]
  ]
]

#let title-page() = [
  #align(center)[
    *МІНІСТЕРСТВО ОСВІТИ І НАУКИ УКРАЇНИ* #linebreak()
    *#university-name* #linebreak()
    *#faculty-name* #linebreak()
    #department-name
  ]

  #v(34pt)

  #align(right)[
    Допустити до захисту #linebreak()
    Завідувач кафедри #linebreak()
    #underline(5.2cm) . #linebreak()
    #text(size: 9pt)[(підпис)          (ПІБ)] #linebreak()
    «...» ............ 20.. р.
  ]

  #v(82pt)

  #align(center)[
    *Кваліфікаційна робота* #linebreak()
    *Бакалавр* #linebreak()
    #text(size: 10pt)[(освітній ступінь)]
  ]

  #v(26pt)

  #align(center)[
    #underline(13cm) #linebreak()
    #topic #linebreak()
    #underline(13cm)
  ]

  #v(38pt)

  #align(right)[
    *Виконав:* #linebreak()
    студент групи #student-group #linebreak()
    спеціальності: #linebreak()
    #specialty-code #specialty-name #linebreak()
    #student-name #linebreak()
    #v(0.8em)
    *Науковий керівник:* #linebreak()
    #underline(5.2cm) . #linebreak()
    #text(size: 9pt)[(підпис)          (ПІБ)] #linebreak()
    #supervisor-name #linebreak()
    «...» ............  р. #linebreak()
    #v(0.8em)
    *Рецензент:* #linebreak()
    #underline(5.2cm) . #linebreak()
    #text(size: 9pt)[(підпис)          (ПІБ)] #linebreak()
    #reviewer-name
  ]

  #v(64pt)

  #align(center)[
    #city 20..
  ]
]

#let assignment-page() = [
  #align(center)[
    *#university-name* #linebreak()
    #faculty-name #linebreak()
    #department-name
  ]

  #v(1em)

  #align(right)[
    *«ЗАТВЕРДЖУЮ»* #linebreak()
    Завідувач кафедри #underline(5.2cm) #linebreak()
    «...» ............ 20.. року
  ]

  #v(1.5em)

  #block-title([ЗАВДАННЯ])
  #v(0.3em)
  #block-title([НА КВАЛІФІКАЦІЙНУ (БАКАЛАВРСЬКУ) РОБОТУ СТУДЕНТУ])
  #v(0.8em)
  #align(center)[#student-name]
  #align(center)[#text(size: 9pt)[(прізвище, ім'я, по батькові)]]

  #v(1em)

  #no-indent[
    1. Тема роботи #topic, #linebreak()
    керівник роботи #supervisor-name, #linebreak()
    затверджена Вченою радою факультету від «...» ............ 20.. року № #approval-order. #linebreak()
    2. Строк подання студентом роботи #submission-date. #linebreak()
    3. Вихідні дані до роботи: репозиторій NutriAI, вимоги до кваліфікаційних робіт спеціальності 121 «Інженерія програмного забезпечення», сучасні підходи до побудови AI-асистентів, фреймворки для веб-розробки та доменна модель систем планування харчування. #linebreak()
    4. Зміст розрахунково-пояснювальної записки: аналіз предметної області персоналізованого харчування; моделювання структури даних для профілю, продуктів, планів харчування, журналу споживання та цілей; опис математичного забезпечення обчислення калорійності, макронутрієнтів та аналітики; розробка архітектури веб-застосунку NutriAI; реалізація AI-модуля з tool calling; підготовка сценарію відтворюваних скріншотів і документування результатів. #linebreak()
    5. Перелік графічного матеріалу: архітектурна схема застосунку; схема обробки AI-запиту; схема моделі даних; скріншоти ключових сторінок інтерфейсу; таблиці порівняння агентних підходів.
  ]

  #v(1em)
  #no-indent[#text(
    size: 10pt,
  )[Календарний план і підписи на звороті аркуша заповнюються відповідно до кафедрального бланка перед поданням роботи.]]
]

#let annotation-page(title, body, keywords) = [
  #block-title([#title])
  #v(1em)
  #no-indent[#body]
  #v(1em)
  #no-indent[*Ключові слова:* #keywords.]
]

#let abbreviations-page() = [
  #block-title([ПЕРЕЛІК УМОВНИХ ПОЗНАЧЕНЬ, СИМВОЛІВ, СКОРОЧЕНЬ І ТЕРМІНІВ])
  #v(1em)
  #no-indent[
    *AI* — штучний інтелект. #linebreak()
    *API* — програмний інтерфейс застосунку. #linebreak()
    *CRUD* — операції створення, читання, оновлення та видалення даних. #linebreak()
    *LLM* — велика мовна модель. #linebreak()
    *MCP* — Model Context Protocol. #linebreak()
    *ORM* — засіб об'єктно-реляційного відображення. #linebreak()
    *UI* — користувацький інтерфейс. #linebreak()
    *UX* — користувацький досвід.
  ]
]
