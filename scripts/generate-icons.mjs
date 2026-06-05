// Dependency-free PNG icon generator for the PWA.
// Draws a Splitwise-style teal tile with two white rounded "split" bars.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

const BRAND = [0xf4, 0x3f, 0x5e]
const WHITE = [0xff, 0xff, 0xff]

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// rounded-rect membership test
function inRoundRect(x, y, rx0, ry0, rx1, ry1, r) {
  if (x < rx0 || x > rx1 || y < ry0 || y > ry1) return false
  const cx = Math.min(Math.max(x, rx0 + r), rx1 - r)
  const cy = Math.min(Math.max(y, ry0 + r), ry1 - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

function makePng(size) {
  const px = new Uint8Array(size * size * 4)
  const tileR = size * 0.22
  const barH = size * 0.10
  const barW = size * 0.55
  const barR = barH / 2
  const barX0 = (size - barW) / 2
  const barX1 = barX0 + barW
  const gap = size * 0.075
  const bar1Y0 = size / 2 - barH - gap / 2
  const bar2Y0 = size / 2 + gap / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const onTile = inRoundRect(x, y, 0, 0, size - 1, size - 1, tileR)
      if (!onTile) {
        px[i + 3] = 0 // transparent outside tile
        continue
      }
      let col = BRAND
      const b1 = inRoundRect(x, y, barX0, bar1Y0, barX1, bar1Y0 + barH, barR)
      const b2 = inRoundRect(x, y, barX0, bar2Y0, barX1, bar2Y0 + barH, barR)
      if (b1 || b2) col = WHITE
      px[i] = col[0]
      px[i + 1] = col[1]
      px[i + 2] = col[2]
      px[i + 3] = 255
    }
  }
  // raw image data: each row prefixed with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.subarray(y * size * 4, (y + 1) * size * 4).forEach((v, k) => {
      raw[y * (size * 4 + 1) + 1 + k] = v
    })
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180]
]
for (const [name, size] of targets) {
  writeFileSync(join(outDir, name), makePng(size))
  console.log('wrote', name, size + 'x' + size)
}
