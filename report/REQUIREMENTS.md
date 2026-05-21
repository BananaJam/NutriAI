# Bachelor Report Requirements

Use this checklist for every change to `report/report.typ` and related report assets.

## Required Structure

- Title page, following the faculty example for the correct specialty.
- Ukrainian annotation.
- English abstract.
- Keywords after the annotations.
- Table of contents.
- List of abbreviations, symbols, and terms.
- Introduction with: relevance, goal, tasks, object and subject, methods, practical value/results, and structure of the work.
- Main chapters covering domain analysis, models/algorithms or mathematical support, architecture/design, implementation, testing/evaluation, conclusions, repository, references, and appendices.
- References should generally contain 35-50 sources: scientific papers, books, technology documentation, standards/RFCs, and open-source references.
- Appendices should contain practical supporting material: run instructions, project/module structure, code fragments, diagrams, and test cases/results.

## Page And Text Formatting

- A4 paper.
- Times New Roman.
- 14 pt body text.
- 1.5 line spacing.
- Margins: top 20 mm, bottom 20 mm, left 20 mm, right 10 mm.
- Paragraph first-line indent: 1.25 cm.
- Page numbers use Arabic numerals in the upper-right corner without a trailing dot.
- The title page is counted but does not display a page number.
- Chapter headings use uppercase letters and no final period.
- Subsection headings start from the paragraph position and have no final period.

## Figures And Tables

- Every figure must have a numbered caption.
- Every table must have a numbered caption and title.
- Refer to each figure/table in the text before placing it.
- Place each figure/table after its first reference.
- Use Typst labels and cross-references instead of hard-coded numbers:
  - Attach labels to figures/tables, for example `ref-label: "fig-system-architecture"` in the local helpers or `<label>` after a raw `#figure(...)`.
  - Reference them with `@label`, for example `@fig-system-architecture[рисунку]` or `@tab-test-cases[таблиці]`.
- Use Ukrainian caption supplements:
  - `Рисунок ...` for diagrams and screenshots.
  - `Таблиця ...` for tables.

## Content Expectations

- Keep theory tied directly to the NutriAI project.
- Explain architectural decisions, data model choices, algorithms, and engineering tradeoffs.
- Include testing results and quality checks, not only feature descriptions.
- Include UI screenshots or demo evidence for implemented functionality.
- Avoid long raw code listings in the main body; move longer fragments to appendices.
- For AI-related parts, describe model/tool boundaries, risks, limitations, and safety controls.
- For work involving personal data, cover ethical and legal aspects such as data minimization, consent, and privacy risks.

## Repository And Demo Requirements

- The repository should include README instructions, launch commands, screenshots/demo material, API documentation, commit history, and releases/tags where possible.
- The demo video should be up to 2 minutes and show launch, core functionality, UI, results, and examples of testing.
- The presentation should be 8-12 slides for a 7-10 minute talk and include relevance, goal, analog analysis, architecture, diagrams, technologies, testing results, demo, and repository link.

## Verification Before Submission

- Rebuild the report with `bun run report:build`.
- Check page count against the recommended 50-80 pages without appendices when content is final.
- Run project verification: `bun run lint` and `bun run build`.
- For schema changes, run the relevant Prisma command.
- Check that all external sources, generated content, open-source code, and AI assistance are cited or disclosed where required.
