#let benchmark-rows = csv(
  "agent-sdk-results.csv",
  row-type: dictionary,
)
#let benchmark-sdks = (
  (id: "vercel-ai", label: "Vercel AI SDK"),
  (id: "openai-agents", label: "OpenAI Agents SDK"),
  (id: "langgraph", label: "LangGraph"),
)
#let benchmark-scenarios = (
  (id: "high-protein-breakfast"),
  (id: "log-recent-lunch"),
  (id: "weekly-nutrition-review"),
  (id: "calculate-macros"),
)

#let completed-benchmark-rows(sdk: none, scenario: none) = benchmark-rows.filter(row => (
  row.status == "completed"
    and row.latencyMs != ""
    and (sdk == none or row.sdk == sdk)
    and (scenario == none or row.scenarioId == scenario)
))
#let latency-values(rows) = rows.map(row => int(row.latencyMs))
#let sum-values(values) = values.fold(0, (total, value) => total + value)
#let average-ms(rows) = {
  let values = latency-values(rows)
  if values.len() == 0 {
    none
  } else {
    calc.round(sum-values(values) / values.len())
  }
}
#let min-value(values) = if values.len() == 0 {
  none
} else {
  values.fold(values.first(), (current, value) => if value < current { value } else { current })
}
#let max-value(values) = if values.len() == 0 {
  none
} else {
  values.fold(values.first(), (current, value) => if value > current { value } else { current })
}

#let text-cell(value) = [#value]
#let ms-cell(value) = if value == none { [n/a] } else { [#value ms] }
#let percent-cell(value) = [#calc.round(value)%]

#let benchmark-latency-rows = benchmark-sdks.fold((), (cells, sdk) => {
  let sdk-completed = completed-benchmark-rows(sdk: sdk.id)
  let scenario-cells = benchmark-scenarios.map(scenario => ms-cell(average-ms(completed-benchmark-rows(
    sdk: sdk.id,
    scenario: scenario.id,
  ))))

  (
    cells
      + (
        text-cell(sdk.label),
        ..scenario-cells,
        ms-cell(average-ms(sdk-completed)),
      )
  )
})

#let benchmark-summary-rows = benchmark-sdks.fold((), (cells, sdk) => {
  let sdk-rows = benchmark-rows.filter(row => row.sdk == sdk.id)
  let completed = completed-benchmark-rows(sdk: sdk.id)
  let values = latency-values(completed)
  let success-rate = if sdk-rows.len() == 0 { 0 } else { completed.len() / sdk-rows.len() * 100 }
  let tool-events = sdk-rows.map(row => int(row.toolEventCount)).fold(0, (total, value) => total + value)

  (
    cells
      + (
        text-cell(sdk.label),
        text-cell(str(completed.len()) + "/" + str(sdk-rows.len())),
        percent-cell(success-rate),
        ms-cell(average-ms(completed)),
        ms-cell(min-value(values)),
        ms-cell(max-value(values)),
        text-cell(str(tool-events)),
      )
  )
})
