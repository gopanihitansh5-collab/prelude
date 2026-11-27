// Look at the README screenshots with Gemini.
//
// A screenshot can be a perfect PNG and still be unusable: a headline clipped at
// the viewport edge, a lens mirror frozen on "loading…", an empty table. The
// point of this script is to have something actually *look* at the committed
// images and answer the questions a judge would answer in two seconds.
//
//   GEMINI_API_KEY=... node scripts/vision-check.mjs prelude/docs/lens.png
//
// The key is read from the environment; never commit it.

const KEY = process.env.GEMINI_API_KEY
if (!KEY) {
  console.error('GEMINI_API_KEY is not set')
  process.exit(2)
}

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-latest'

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: GEMINI_API_KEY=... node scripts/vision-check.mjs <image> [image...]')
  process.exit(2)
}

const QUESTIONS = `You are reviewing a screenshot for a software project README. Answer in at most 120 words, as plain sentences:
1. What page or app is shown, and what is the single most prominent text?
2. Is any text, button or panel cut off at an edge, overlapping, or unreadable?
3. Does it look like a finished product (dark theme, legible type, coherent layout) or like a broken render?
Be concrete about what you can actually see. If something is illegible or empty, say so plainly.`

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

for (const file of files) {
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  const mime = MIME[ext] ?? 'image/png'
  const data = readFileSync(file).toString('base64')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ inline_data: { mime_type: mime, data } }, { text: QUESTIONS }],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
      }),
    },
  )

  console.log(`\n=== ${basename(file)}`)
  if (!response.ok) {
    const text = await response.text()
    console.log(`HTTP ${response.status}: ${text.replace(/\s+/g, ' ').slice(0, 300)}`)
    continue
  }

  const body = await response.json()
  const parts = body.candidates?.[0]?.content?.parts ?? []
  const text = parts.map((p) => p.text ?? '').join('').trim()
  console.log(text || '(no text returned)')
}
