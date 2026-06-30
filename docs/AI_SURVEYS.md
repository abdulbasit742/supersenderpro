# WhatsApp Survey & Poll Engine

Surveys, polls and quizzes run beautifully in chat — one question at a time, reply to answer. This defines a survey (multiple-choice / rating / open-text steps), runs it **conversationally per contact** (ask → validate → advance), stores responses, and rolls up results (answer distributions, average rating, NPS). The AI is used only to summarize open-text themes + an insight. Self-hosted Ollama; zero cloud cost.

## Why

Structured feedback is gold (CSAT, NPS, \"how did you hear about us\", product-interest polls), and WhatsApp gets far higher response rates than email forms. But you need clean, validated data, not free-form mush. This runs the survey step by step, validates each answer, and gives you a real rollup, NPS included.

## How it works

```
defineSurvey(steps=[{type:choice|rating|text, q, options?, min?max?, nps?}])
start(phone, surveyId)        -> first question
answer(phone, surveyId, text) -> validate -> advance -> next question | complete
   choice: reply a number (or the option text)
   rating: reply a number in [min,max]; mark nps:true for 0-10 NPS questions
   text:   free text
results(surveyId)  -> per-question distribution / average / NPS
insights(surveyId) -> results + an AI summary line  [deterministic fallback]
```

- **Deterministic flow + validation** (bad answers are re-asked, never stored); the model only summarizes.
- **NPS** computed correctly (promoters 9-10 minus detractors 0-6).
- **Zero new npm dependencies.**

## Files

- `lib/surveys/surveyEngine.js` — define / start / answer / results / insights.
- `routes/surveyRoutes.js` — self-mountable router.
- `tests/smoke/surveysSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/surveys', require('./routes/surveyRoutes'));
```

## Environment

```
SURVEY_MODEL=qwen2.5:32b   # only for the insight summary; defaults to SUPPORT_AGENT_MODEL
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/surveys/define` | Define a survey. Body: `{ id, steps:[{type,q,options?,min?,max?,nps?}] }` |
| GET | `/api/surveys/list` | List surveys |
| POST | `/api/surveys/start` | Start for a contact. Body: `{ phone, surveyId }` |
| POST | `/api/surveys/answer` | Submit an answer. Body: `{ phone, surveyId, text }` |
| GET | `/api/surveys/results?surveyId=` | Per-question rollup |
| GET | `/api/surveys/insights?surveyId=` | Rollup + AI summary |
| GET | `/api/surveys/health` | Brain status |

### Example

```bash
curl -X POST localhost:3000/api/surveys/define -H 'Content-Type: application/json' -d '{
  "id":"csat", "steps":[
    {"type":"rating","q":"How likely to recommend us? (0-10)","min":0,"max":10,"nps":true},
    {"type":"choice","q":"How did you hear about us?","options":["Friend","Instagram","Other"]},
    {"type":"text","q":"Any feedback?"}
  ]}'
curl 'localhost:3000/api/surveys/insights?surveyId=csat'
# -> { totalResponses: 42, perQuestion:[{avg:8.1,nps:46}, ...], insight:"..." }
```

## Wiring into live WhatsApp

1. Send `start({ phone, surveyId })` — e.g. after delivery (#70) or as a broadcast — and send the returned `question`.
2. On each inbound reply while a survey session is active, route the text to `answer({ phone, surveyId, text })` and send the next `question` (or the completion message).
3. Read `results` / `insights` for the rollup; pipe NPS/CSAT into the owner briefing (#29).
4. Gate broadcast-style survey sends through consent (#80), same as any outreach.

## Tests

```bash
node tests/smoke/surveysSmoke.js
```
