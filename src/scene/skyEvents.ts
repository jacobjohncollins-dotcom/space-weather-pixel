// Rare background sky flourishes: shooting stars, a Starlink-style satellite
// train, and an occasional UFO drifting through. Pure canvas shapes (no
// sprites) on independent random timers, layered over the sky/wind so idle
// viewing of the scene turns up small surprises rather than a static loop.

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

interface SatelliteTrain {
  x: number
  y: number
  speed: number
  count: number
  spacing: number
}

interface Ufo {
  x: number
  baseY: number
  y: number
  speed: number
  t: number
}

export interface SkyEventsState {
  shootingStar: ShootingStar | null
  nextShootingStarAt: number
  satelliteTrain: SatelliteTrain | null
  nextSatelliteTrainAt: number
  ufo: Ufo | null
  nextUfoAt: number
}

export function createSkyEventsState(elapsedMs = 0): SkyEventsState {
  return {
    shootingStar: null,
    nextShootingStarAt: elapsedMs + randRange(4000, 11000),
    satelliteTrain: null,
    nextSatelliteTrainAt: elapsedMs + randRange(25000, 55000),
    ufo: null,
    nextUfoAt: elapsedMs + randRange(75000, 170000),
  }
}

export function stepSkyEvents(
  state: SkyEventsState,
  elapsedMs: number,
  dtSeconds: number,
  width: number,
  height: number,
): void {
  if (!state.shootingStar && elapsedMs >= state.nextShootingStarAt) {
    const angle = randRange(0.35, 0.65)
    const speed = randRange(width * 0.9, width * 1.5)
    state.shootingStar = {
      x: randRange(width * 0.1, width * 0.75),
      y: randRange(height * 0.04, height * 0.22),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: randRange(0.4, 0.7),
    }
  }
  if (state.shootingStar) {
    const s = state.shootingStar
    s.x += s.vx * dtSeconds
    s.y += s.vy * dtSeconds
    s.life += dtSeconds
    if (s.life >= s.maxLife || s.x > width + 20 || s.y > height * 0.6) {
      state.shootingStar = null
      state.nextShootingStarAt = elapsedMs + randRange(4000, 11000)
    }
  }

  if (!state.satelliteTrain && elapsedMs >= state.nextSatelliteTrainAt) {
    const count = 6 + Math.floor(Math.random() * 4)
    state.satelliteTrain = {
      x: -width * 0.2,
      y: randRange(height * 0.08, height * 0.28),
      speed: randRange(width * 0.09, width * 0.14),
      count,
      spacing: width * 0.028,
    }
  }
  if (state.satelliteTrain) {
    const t = state.satelliteTrain
    t.x += t.speed * dtSeconds
    if (t.x - t.count * t.spacing > width + 20) {
      state.satelliteTrain = null
      state.nextSatelliteTrainAt = elapsedMs + randRange(25000, 55000)
    }
  }

  if (!state.ufo && elapsedMs >= state.nextUfoAt) {
    state.ufo = {
      x: -width * 0.12,
      baseY: randRange(height * 0.16, height * 0.36),
      y: 0,
      speed: randRange(width * 0.11, width * 0.17),
      t: 0,
    }
  }
  if (state.ufo) {
    const u = state.ufo
    u.t += dtSeconds
    u.x += u.speed * dtSeconds
    u.y = u.baseY + Math.sin(u.t * 3) * height * 0.02
    if (u.x > width * 1.15) {
      state.ufo = null
      state.nextUfoAt = elapsedMs + randRange(75000, 170000)
    }
  }
}

export function drawSkyEvents(
  ctx: CanvasRenderingContext2D,
  state: SkyEventsState,
  width: number,
): void {
  const unit = width / 200

  if (state.shootingStar) {
    const s = state.shootingStar
    const alpha = 1 - s.life / s.maxLife
    const mag = Math.hypot(s.vx, s.vy) || 1
    const dx = s.vx / mag
    const dy = s.vy / mag
    const trailLen = unit * 16

    ctx.save()
    const grad = ctx.createLinearGradient(
      s.x,
      s.y,
      s.x - dx * trailLen,
      s.y - dy * trailLen,
    )
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.strokeStyle = grad
    ctx.lineWidth = Math.max(1, unit * 0.8)
    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(s.x - dx * trailLen, s.y - dy * trailLen)
    ctx.stroke()
    ctx.restore()
  }

  if (state.satelliteTrain) {
    const t = state.satelliteTrain
    const size = Math.max(1, unit * 0.9)
    ctx.save()
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)'
    for (let i = 0; i < t.count; i++) {
      const dotX = t.x - i * t.spacing
      if (dotX < -size || dotX > width + size) continue
      ctx.fillRect(dotX, t.y, size, size)
    }
    ctx.restore()
  }

  if (state.ufo) {
    const u = state.ufo
    const w = unit * 12
    const h = unit * 3
    ctx.save()
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(u.x - w / 2, u.y, w, h)
    ctx.fillStyle = '#cbd5e1'
    ctx.fillRect(u.x - w / 4, u.y - h, w / 2, h)
    const blink = Math.sin(u.t * 10) > 0
    ctx.fillStyle = blink ? '#4ade80' : '#f87171'
    ctx.fillRect(u.x - w / 2, u.y + h, unit, unit)
    ctx.fillRect(u.x + w / 2 - unit, u.y + h, unit, unit)
    ctx.restore()
  }
}
