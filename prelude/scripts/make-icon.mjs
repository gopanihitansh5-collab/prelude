// Generates the 24x24 store icon as a PNG, built from 2x2 blocks.
//
// The Even Hub store icon must be 1-bit monochrome and every lit pixel must be
// part of a 2x2 block, so the effective detail budget is 12x12. This draws a
// "P" for Prelude with 2px strokes on a white field, which is what the portal's
// pixel editor expects.
//
// Run: node scripts/make-icon.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const SIZE = 24

// 12x12 design grid. 1 = lit (black). A "P" with a 2-cell stem and bowl.
const DESIGN = [
  '111111111100',
  '111111111100',
  '110000000110',
  '110000000110',
  '110000000110',
  '110000000110',
  '111111111100',
  '111111111100',
  '110000000000',
  '110000000000',
  '110000000000',
  '110000000000',
]

const pixels = Buffer.alloc(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const lit = DESIGN[Math.floor(y / 2)]?.[Math.floor(x / 2)] === '1'
    const i = (y * SIZE + x) * 4
    // Lit = black, unlit = white. Fully opaque, so the icon reads on any field.
    const value = lit ? 0 : 255
    pixels[i] = value
    pixels[i + 1] = value
    pixels[i + 2] = value
    pixels[i + 3] = 255
  }
}

const CRC_TABLE = (() => {
  const table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  let crc = 0xffffffff
  for (const byte of body) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([len, body, crcBuf])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // colour type: RGBA

const stride = SIZE * 4 + 1
const raw = Buffer.alloc(SIZE * stride)
for (let y = 0; y < SIZE; y++) {
  raw[y * stride] = 0 // filter: none
  pixels.copy(raw, y * stride + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])

writeFileSync(new URL('../public/icon.png', import.meta.url), png)
console.log(`icon.png written: ${png.length} bytes, ${SIZE}x${SIZE}, 2x2 blocks`)
