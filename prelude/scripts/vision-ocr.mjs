// Read the README screenshots with Google Cloud Vision.
//
// Why: a headless-browser screenshot can "succeed" and still be useless — a
// clipped headline, an empty panel, or a lens mirror showing "loading…" all
// produce a valid PNG. The local 2B VLM was uninformative on this hardware, so
// this asks Cloud Vision the only questions that matter here:
//
//   • DOCUMENT_TEXT_DETECTION — what text is actually legible in the image
//   • LABEL_DETECTION         — whether the image reads as the thing we claim
//
//   GOOGLE_VISION_KEY=... node scripts/vision-ocr.mjs prelude/docs/lens.png
//
// The key is read from the environment and never written to the repo.

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const KEY = process.env.GOOGLE_VISION_KEY
if (!KEY) {
  console.error('GOOGLE_VISION_KEY is not set')
  process.exit(2)
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: GOOGLE_VISION_KEY=... node scripts/vision-ocr.mjs <image> [image...]')
  process.exit(2)
}

for (const file of files) {
  const content = readFileSync(file).toString('base64')
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content },
          features: [
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            { type: 'LABEL_DETECTION', maxResults: 8 },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.log(`\n${basename(file)}: HTTP ${response.status} — ${text.slice(0, 300)}`)
    continue
  }

  const body = await response.json()
  const result = body.responses?.[0]
  if (result?.error) {
    console.log(`\n${basename(file)}: API error — ${result.error.message}`)
    continue
  }

  const full = result?.fullTextAnnotation?.text ?? ''
  const labels = (result?.labelAnnotations ?? []).map((l) => `${l.description} ${(l.score * 100).toFixed(0)}%`)

  console.log(`\n=== ${basename(file)}`)
  console.log(`labels: ${labels.join(', ') || '(none)'}`)
  console.log(`text (${full.trim().length} chars):`)
  const lines = full.split('\n').filter((l) => l.trim().length > 0)
  for (const line of lines.slice(0, 28)) console.log(`   | ${line.trim()}`)
  if (lines.length > 28) console.log(`   | … ${lines.length - 28} more lines`)

  // A screenshot of our own app should contain our own words. If it does not,
  // the image is telling the truth about a broken render.
  const expected = ['PRELUDE', 'Ada', 'pricing', 'tap', 'swipe']
  const missing = expected.filter((w) => !new RegExp(w, 'i').test(full))
  console.log(missing.length === 0 ? 'expected copy: present' : `expected copy: MISSING ${missing.join(', ')}`)
}
