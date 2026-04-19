# Bachelor Report

Матеріали бакалаврської роботи для проєкту `NutriAI`.

## Зміст директорії

- [report.typ](/Users/vvybyranyi/Desktop/year4/kursach/bachelor-report/report.typ) — основний документ Typst
- [template.typ](/Users/vvybyranyi/Desktop/year4/kursach/bachelor-report/template.typ) — стилі, титульні сторінки та службові макроси
- [references.yml](/Users/vvybyranyi/Desktop/year4/kursach/bachelor-report/references.yml) — бібліографія
- `assets/screenshots/` — автогенеровані скріншоти інтерфейсу

## Команди

```bash
bun run report:seed
bun run report:screenshots
bun run report:build
```

## Demo credentials

- Email: `demo.report@example.com`
- Password: `ReportDemo123!`

## Примітка

`report:screenshots` у типовому сценарії:

1. Формує demo-дані.
2. За потреби запускає локальний dev server.
3. Виконує вхід під demo-користувачем.
4. Знімає ключові сторінки інтерфейсу в `assets/screenshots/`.
