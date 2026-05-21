#import "@preview/pintorita:0.1.4"

#let student-name = "Вибираний Владислав"
#let student-group = "ФеІ – 42"
#let supervisor-name = "доц. Стахіра Р. Й."
#let reviewer-name = ""
#let department-head-name = "доц. Шувар Р. Я."
#let specialty-code = "F3"
#let specialty-name = "Комп’ютерні науки"
#let university-name = "Львівський національний університет імені Івана Франка"
#let faculty-name = "Факультет електроніки та комп'ютерних технологій"
#let department-name = "Кафедра системного проектування"
#let topic = "Розробка моделі планування харчування та моніторингу споживання калорій для AI-асистента"
#let city = "Львів"
#let defense-year = "2026"

#let report-template(body) = {
  set text(
    font: "Times New Roman",
    size: 14pt,
    lang: "uk",
  )

  show raw: set text(font: "Times New Roman", size: 14pt)

  set page(
    paper: "a4",
    margin: (top: 20mm, bottom: 20mm, left: 20mm, right: 10mm),
    numbering: none,
  )

  set par(
    justify: true,
    first-line-indent: 1.25cm,
    leading: 0.75em,
  )

  set heading(numbering: "1.1.")

  show heading.where(level: 1): it => [
    #pagebreak(weak: true)
    #align(center)[
      #set text(weight: "bold", size: 14pt)
      #counter(heading).display("1.")
      #h(0.5em)
      #upper(it.body)
    ]
    #v(1em)
  ]

  show heading.where(level: 2): it => [
    #set text(weight: "bold", size: 14pt)
    #counter(heading).display("1.1.")
    #h(0.5em)
    #it.body
    #v(0.5em)
  ]

  show heading.where(level: 3): it => [
    #set text(weight: "bold", style: "italic", size: 14pt)
    #counter(heading).display("1.1.1.")
    #h(0.5em)
    #it.body
    #v(0.35em)
  ]

  body
}

#let center-title(body) = align(center)[#body]

#let block-title(body) = [
  #align(center)[
    #text(weight: "bold", upper(body))
  ]
]

#let no-indent(body) = [
  #set par(first-line-indent: 0pt)
  #body
]

#let with-label(element, ref-label) = {
  if ref-label == none {
    element
  } else {
    [#element #label(ref-label)]
  }
}

#let screenshot(path, caption, ref-label: none) = with-label(
  figure(
    image(path, width: 100%),
    caption: [#caption],
    supplement: [Рисунок],
  ),
  ref-label,
)

#let to-string(it) = {
  if type(it) == str {
    it
  } else if type(it) != content {
    str(it)
  } else if it.has("text") {
    it.text
  } else if it.has("children") {
    it.children.map(to-string).join()
  } else if it.has("body") {
    to-string(it.body)
  } else if it == [ ] {
    " "
  }
}

#let diagram(source, caption, ref-label: none) = with-label(
  figure(
    pintorita.render(
      to-string(source),
      style: "default",
      font: "Times New Roman",
      width: 100%,
    ),
    caption: [#caption],
    supplement: [Рисунок],
  ),
  ref-label,
)

#let simple-table(columns, rows, caption, ref-label: none) = with-label(
  figure(
    table(
      columns: columns,
      inset: 6pt,
      stroke: 0.6pt + rgb("#777777"),
      align: left + horizon,
      ..rows,
    ),
    caption: [#caption],
    supplement: [Таблиця],
  ),
  ref-label,
)

#let underline(width) = box(
  width: width,
  height: 0.5em,
  inset: 0pt,
  stroke: (bottom: 0.7pt + black),
)[]

#let sign-row(width: 2cm) = [
  #box(baseline: 0.8em)[
    #stack(
      underline(width),
      v(2pt),
      align(center)[#text(size: 9pt)[(підпис)]],
    )
  ]
]

#let title-page() = [
  #set par(first-line-indent: 0pt, justify: false)

  #align(center)[
    Міністерство освіти і науки України #linebreak()
    #university-name #linebreak()
    #faculty-name #linebreak()
    #department-name
  ]

  #v(200pt)

  #align(center)[
    #text(weight: "bold")[Бакалаврська робота] #linebreak()
    «#topic»
  ]

  #v(72pt)

  #align(right)[
    Виконав: #linebreak()
    студент групи #student-group #linebreak()
    спеціальності #specialty-code #specialty-name #linebreak()
    #underline(2cm) #student-name #linebreak()
    Науковий керівник: #linebreak()
    #underline(2cm) #supervisor-name #linebreak()
    «#underline(1cm)» #underline(3.2cm) #defense-year р.
  ]

  #align(center + bottom)[
    #text(weight: "bold")[#city #defense-year]
  ]
]

#let annotation-page(title, body) = [
  #block-title([#title])
  #v(1em)
  #no-indent[#body]
  #v(1em)
]

#let abbreviations-page() = [
  #block-title("Перелік умовних позначень, символів, скорочень і термінів")
  #v(1em)
  #no-indent[
    *AI* (Artificial Intelligence) — штучний інтелект; сукупність методів, моделей і програмних засобів, що забезпечують імітацію окремих інтелектуальних функцій людини, зокрема аналіз вхідних даних, побудову висновків, генерацію відповідей і підтримку прийняття рішень у межах інформаційної системи. #linebreak()
    *API* (Application Programming Interface) — прикладний програмний інтерфейс; формалізований набір правил, структур даних і викликів, за допомогою яких окремі програмні модулі або зовнішні системи взаємодіють між собою та обмінюються даними. #linebreak()
    *BMR* (Basal Metabolic Rate) — базальний обмін речовин; мінімальний рівень добових енерговитрат організму, необхідний для підтримання життєво важливих функцій у стані фізіологічного спокою. #linebreak()
    *BMI* (Body Mass Index) — індекс маси тіла; розрахунковий антропометричний показник, що визначається як відношення маси тіла до квадрату зросту та використовується для попередньої оцінки відповідності маси тіла зросту людини. #linebreak()
    *CRUD* (Create, Read, Update, Delete) — базові операції роботи з даними, що охоплюють створення нових записів, читання наявної інформації, оновлення збережених значень і видалення об'єктів із системи. #linebreak()
    *ER-діаграма* (Entity-Relationship diagram) — діаграма «сутність-зв'язок»; графічна модель предметної області, яка відображає основні сутності системи, їх атрибути та логічні зв'язки між ними. #linebreak()
    *LLM* (Large Language Model) — велика мовна модель; різновид моделі штучного інтелекту, навчений на значних обсягах текстових даних і призначений для розуміння природної мови, генерації тексту, узагальнення інформації та підтримки діалогової взаємодії. #linebreak()
    *MCP* (Model Context Protocol) — протокол передавання контексту моделі; підхід до стандартизованої взаємодії мовної моделі із зовнішніми інструментами, джерелами даних і службами, що дає змогу керовано передавати контекст і отримувати результати виконання дій. #linebreak()
    *ORM* (Object-Relational Mapping) — об'єктно-реляційне відображення; підхід до роботи з базою даних, за якого записи реляційних таблиць подаються у вигляді програмних об'єктів, а операції над даними виконуються через абстракції прикладного коду. #linebreak()
    *TDEE* (Total Daily Energy Expenditure) — загальні добові енерговитрати; сумарна кількість енергії, яку організм витрачає протягом доби з урахуванням базального обміну речовин, рівня фізичної активності та інших енергетичних витрат. #linebreak()
  ]
]
