
import React, { useEffect, useRef, useState } from 'react';

const ARENA = 720;
const CENTER = ARENA / 2;
const RADIUS = 350;
const PLAYER_R = 10;
const PLAYER_SPEED = 215;

const LIGHT_R = 120;
const SOAK_R = 52;
const SOAK_REQUIRED = 5;
const SOAK_TIMER = 20;
const OUTSIDE_LIGHT_GRACE = 1.35;

const DC_WAVES = 5;
const DC_SPAWN = 2;
const DC_ACTIVE = 2;
const DC_GAP = 4;
const DC_LINE_WIDTH = 22;
const DC_POINT_R = 17;

const CRYSTAL_R = 13;
const BEAM_INTERVAL = 5;
const BEAM_WARNING = 3;
const BEAM_ACTIVE = 2;
const BEAM_WIDTH = 48;
const INTERMISSION_SECONDS = 30;

const STARTS = {
  p3: { x: CENTER - 95, y: CENTER + 80 },
  intermission: { x: 510, y: 570 }
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function inArena(p, pad = 0) {
  return Math.hypot(p.x - CENTER, p.y - CENTER) <= RADIUS - pad;
}

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function randomInt(a, b) {
  return Math.floor(randomBetween(a, b + 1));
}

function pointLineDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = clamp((apx * abx + apy * aby) / ab2, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function edgeKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function makeMstEdges(points) {
  const used = new Set([0]);
  const edges = [];

  while (used.size < points.length) {
    let best = null;
    let bestD = Infinity;

    for (const a of used) {
      for (let b = 0; b < points.length; b++) {
        if (used.has(b)) continue;
        const d = dist(points[a], points[b]);
        if (d < bestD) {
          bestD = d;
          best = { a, b };
        }
      }
    }

    if (!best) break;
    edges.push(best);
    used.add(best.b);
  }

  return edges;
}

function makePathEdges(points) {
  if (points.length < 2) return [];

  const MAX_LINK = 155;
  const HARD_MAX_LINK = 185;
  const remaining = new Set(points.map((_, i) => i));
  const edges = [];

  // Start around the left/lower side and then continue locally.
  // This keeps the pattern as a realistic chain instead of creating huge cross-room jumps.
  let current = points
    .map((p, i) => ({
      i,
      score: p.x + Math.abs(p.y - (CENTER + 115)) * 0.55
    }))
    .sort((a, b) => a.score - b.score)[0].i;

  remaining.delete(current);

  while (remaining.size) {
    const candidates = [...remaining]
      .map((j) => {
        const d = dist(points[current], points[j]);
        const yPenalty = Math.abs(points[current].y - points[j].y) * 0.10;
        const reversePenalty = points[j].x < points[current].x - 45 ? 16 : 0;
        const longPenalty = d > MAX_LINK ? (d - MAX_LINK) * 4 : 0;

        return {
          j,
          d,
          score: d + yPenalty + reversePenalty + longPenalty
        };
      })
      .sort((a, b) => a.score - b.score);

    let pick = candidates.find((c) => c.d <= MAX_LINK);

    // Only allow a longer link if the path would otherwise stop completely.
    if (!pick) pick = candidates.find((c) => c.d <= HARD_MAX_LINK);
    if (!pick) break;

    edges.push({ a: current, b: pick.j });
    remaining.delete(pick.j);
    current = pick.j;
  }

  return edges;
}

function makeConstellation(id) {
  const count = randomInt(17, 19);
  const points = [];
  const offset = Math.random() * Math.PI * 2;

  // P3 Constellations mostly happen around L'ura and the playable soak/light area.
  // Keep them out of the unrealistic far upper arena.
  const zones = [
    { x: CENTER - 185, y: CENTER + 70, rx: 95, ry: 120, weight: 3 },
    { x: CENTER - 80, y: CENTER + 105, rx: 110, ry: 115, weight: 3 },
    { x: CENTER + 25, y: CENTER + 105, rx: 120, ry: 115, weight: 3 },
    { x: CENTER + 135, y: CENTER + 85, rx: 105, ry: 125, weight: 3 },
    { x: CENTER + 210, y: CENTER + 50, rx: 80, ry: 110, weight: 2 },
    { x: CENTER, y: CENTER + 205, rx: 135, ry: 80, weight: 2 }
  ];

  const weightedZones = zones.flatMap((z) => Array.from({ length: z.weight }, () => z));

  let attempts = 0;

  while (points.length < count && attempts < 2500) {
    attempts++;

    const zone = weightedZones[Math.floor(Math.random() * weightedZones.length)];
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());

    const p = {
      id: `${id}-${points.length}`,
      x: zone.x + Math.cos(angle) * zone.rx * r + randomBetween(-12, 12),
      y: zone.y + Math.sin(angle) * zone.ry * r + randomBetween(-12, 12)
    };

    // Avoid the far upper half. A little above boss is okay, top wall is not.
    if (p.y < CENTER - 115) continue;
    if (!inArena(p, 32)) continue;
    if (dist(p, { x: CENTER, y: CENTER }) < 58) continue;
    if (points.some((other) => dist(p, other) < 34)) continue;

    points.push(p);
  }

  while (points.length < count) {
    const angle = offset + (points.length / count) * Math.PI * 2 + randomBetween(-0.35, 0.35);
    const radius = randomBetween(90, 260);
    const p = {
      id: `${id}-${points.length}`,
      x: CENTER + Math.cos(angle) * radius,
      y: CENTER + 80 + Math.sin(angle) * radius * 0.75
    };

    if (p.y < CENTER - 115) p.y = CENTER - 105 + randomBetween(0, 30);
    if (!inArena(p, 32)) {
      const dx = p.x - CENTER;
      const dy = p.y - CENTER;
      const len = Math.hypot(dx, dy);
      p.x = CENTER + (dx / len) * (RADIUS - 42);
      p.y = CENTER + (dy / len) * (RADIUS - 42);
    }

    points.push(p);
  }

  // Realistic training approximation:
  // Dark Constellation mostly behaves like one continuous path through the points.
  // So each point gets at most two connections. No spiderweb / multi-edge clusters.
  const edges = makePathEdges(points);

  return { id, points, edges, startedAt: 0 };
}

function dcState(wave, now) {
  if (!wave) return 'none';
  const age = now - wave.startedAt;
  if (age < DC_SPAWN) return 'spawn';
  if (age < DC_SPAWN + DC_ACTIVE) return 'active';
  return 'done';
}

function lightSetup(phase) {
  if (phase === 1) {
    return [
      { id: 1, name: 'Wuff', x: CENTER - 135, y: CENTER + 70 },
      { id: 2, name: 'Wuff2', x: CENTER + 120, y: CENTER + 70 },
      { id: 3, name: 'Wuff3', x: CENTER, y: CENTER + 185 }
    ];
  }

  if (phase === 2) {
    return [
      { id: 1, name: 'Wuff', x: CENTER - 72, y: CENTER + 120 },
      { id: 2, name: 'Wuff2', x: CENTER + 72, y: CENTER + 120 }
    ];
  }

  return [
    { id: 1, name: 'Wuff', x: CENTER - 85, y: CENTER + 90 }
  ];
}

function soaks() {
  return [
    { id: 1, x: CENTER - 160, y: CENTER + 95, progress: 0 },
    { id: 2, x: CENTER + 160, y: CENTER + 95, progress: 0 },
    { id: 3, x: CENTER, y: CENTER + 215, progress: 0 }
  ];
}

function initialP3(phase = 1) {
  const lights = lightSetup(phase);
  return {
    mode: 'p3',
    phase,
    running: true,
    failed: null,
    time: 0,
    player: { x: lights[0].x - 25, y: lights[0].y },
    lights,
    soaks: soaks(),
    soaksStartedAt: 1.2,
    outsideLightTime: 0,
    currentWave: null,
    waveId: 0,
    nextWaveAt: 3
  };
}

function initialIntermission() {
  return {
    mode: 'intermission',
    running: true,
    failed: null,
    time: 0,
    player: { ...STARTS.intermission },
    hasCrystal: true,
    crystal: null,
    beams: [],
    nextBeam: BEAM_INTERVAL,
    beamId: 1,
    drops: 0
  };
}

function makeBeam(now, id) {
  return {
    id,
    angle: Math.random() * Math.PI * 2,
    warnUntil: now + BEAM_WARNING,
    activeUntil: now + BEAM_WARNING + BEAM_ACTIVE
  };
}

function beamHitsCircle(beam, p, radius) {
  const len = RADIUS + 20;
  const bx = CENTER + Math.cos(beam.angle) * len;
  const by = CENTER + Math.sin(beam.angle) * len;
  return pointLineDistance(p.x, p.y, CENTER, CENTER, bx, by) <= BEAM_WIDTH / 2 + radius;
}

export default function App() {
  const [selectedMode, setSelectedMode] = useState('p3');
  const [phase, setPhase] = useState(1);
  const [game, setGame] = useState(() => initialP3(1));
  const keys = useRef({});
  const last = useRef(performance.now());

  function restart(nextMode = selectedMode, nextPhase = phase) {
    last.current = performance.now();
    setGame(nextMode === 'p3' ? initialP3(Number(nextPhase)) : initialIntermission());
  }

  function changeMode(value) {
    setSelectedMode(value);
    restart(value, phase);
  }

  function changePhase(value) {
    const nextPhase = Number(value);
    setPhase(nextPhase);
    restart('p3', nextPhase);
  }

  useEffect(() => {
    const down = (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        e.preventDefault();
      }
      keys.current[e.code] = true;
    };

    const up = (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        e.preventDefault();
      }
      keys.current[e.code] = false;
    };

    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up, { passive: false });

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  function movePlayer(g, dt) {
    let vx = 0;
    let vy = 0;

    if (keys.current.KeyW) vy -= 1;
    if (keys.current.KeyS) vy += 1;
    if (keys.current.KeyA) vx -= 1;
    if (keys.current.KeyD) vx += 1;

    if (!vx && !vy) return g.player;

    const l = Math.hypot(vx, vy);
    vx /= l;
    vy /= l;

    const p = {
      x: g.player.x + vx * PLAYER_SPEED * dt,
      y: g.player.y + vy * PLAYER_SPEED * dt
    };

    return inArena(p, PLAYER_R) ? p : g.player;
  }

  function movePhase3Light(lights, soaks, now) {
    if (lights.length !== 1) return lights;

    const route = [
      { x: CENTER - 85, y: CENTER + 90 },
      { x: soaks[0].x, y: soaks[0].y },
      { x: soaks[1].x, y: soaks[1].y },
      { x: soaks[2].x, y: soaks[2].y }
    ];

    let t = now - 1.3;
    const travel = 1.0;
    const hold = 5.1;
    let pos = route[0];

    for (let i = 1; i < route.length; i++) {
      if (t <= 0) break;

      if (t < travel) {
        const f = t / travel;
        pos = {
          x: route[i - 1].x + (route[i].x - route[i - 1].x) * f,
          y: route[i - 1].y + (route[i].y - route[i - 1].y) * f
        };
        break;
      }

      t -= travel;

      if (t < hold) {
        pos = route[i];
        break;
      }

      t -= hold;
      pos = route[i];
    }

    return [{ ...lights[0], x: pos.x, y: pos.y }];
  }

  function tickP3(g, dt) {
    let ng = { ...g, time: g.time + dt };
    const now = ng.time;

    ng.player = movePlayer(ng, dt);
    ng.lights = ng.phase === 3 ? movePhase3Light(ng.lights, ng.soaks, now) : ng.lights;

    let nextSoaks = ng.soaks.map((s) => ({ ...s }));

    if (now >= ng.soaksStartedAt) {
      nextSoaks = nextSoaks.map((s) => {
        let progress = s.progress;

        if (dist(ng.player, s) <= SOAK_R) progress += dt;

        if (ng.phase === 3) {
          if (ng.lights.some((l) => dist(l, s) <= SOAK_R + 4)) progress += dt;
        } else {
          if (s.id !== 3 && now > 2.0 + s.id * 0.6) progress += dt;
        }

        return { ...s, progress: Math.min(SOAK_REQUIRED, progress) };
      });
    }

    ng.soaks = nextSoaks;

    if (
      now >= ng.soaksStartedAt &&
      now - ng.soaksStartedAt >= SOAK_TIMER &&
      nextSoaks.some((s) => s.progress < SOAK_REQUIRED)
    ) {
      return { ...ng, running: false, failed: 'Soaks wurden nicht innerhalb von 20 Sekunden geleert.' };
    }

    const insideLight = ng.lights.some((l) => dist(ng.player, l) <= LIGHT_R);
    ng.outsideLightTime = insideLight ? 0 : ng.outsideLightTime + dt;

    if (ng.outsideLightTime > OUTSIDE_LIGHT_GRACE) {
      return { ...ng, running: false, failed: 'Du warst zu lange außerhalb einer Light-Zone.' };
    }

    if (!ng.currentWave && ng.waveId < DC_WAVES && now >= ng.nextWaveAt) {
      const waveId = ng.waveId + 1;
      ng.currentWave = { ...makeConstellation(waveId), startedAt: now };
      ng.waveId = waveId;
    }

    if (ng.currentWave) {
      const state = dcState(ng.currentWave, now);

      if (state === 'active') {
        for (const edge of ng.currentWave.edges) {
          const a = ng.currentWave.points[edge.a];
          const b = ng.currentWave.points[edge.b];
          if (pointLineDistance(ng.player.x, ng.player.y, a.x, a.y, b.x, b.y) <= DC_LINE_WIDTH / 2 + 2) {
            return { ...ng, running: false, failed: `Dark Constellation ${ng.currentWave.id}: Verbindung berührt.` };
          }
        }

        for (const p of ng.currentWave.points) {
          if (dist(ng.player, p) <= DC_POINT_R + 2) {
            return { ...ng, running: false, failed: `Dark Constellation ${ng.currentWave.id}: Punkt berührt.` };
          }
        }
      }

      if (state === 'done') {
        ng.currentWave = null;
        ng.nextWaveAt = now + DC_GAP;
      }
    }

    const allSoaked = ng.soaks.every((s) => s.progress >= SOAK_REQUIRED);
    if (ng.waveId >= DC_WAVES && !ng.currentWave && allSoaked && now > ng.nextWaveAt - 0.5) {
      return { ...ng, running: false, failed: 'Clear. P3 Pattern sauber überlebt.' };
    }

    return ng;
  }

  function tickIntermission(g, dt) {
    let ng = { ...g, time: g.time + dt };
    const now = ng.time;

    ng.player = movePlayer(ng, dt);

    const dropPressed = keys.current.KeyQ && (keys.current.ShiftLeft || keys.current.ShiftRight);

    if (dropPressed && ng.hasCrystal) {
      ng.hasCrystal = false;
      ng.crystal = { x: ng.player.x, y: ng.player.y, droppedAt: now, pickupArmed: false };
      ng.drops += 1;
    }

    if (!ng.hasCrystal && ng.crystal) {
      const d = dist(ng.player, ng.crystal);

      if (!ng.crystal.pickupArmed && d >= PLAYER_R + CRYSTAL_R + 18) {
        ng.crystal = { ...ng.crystal, pickupArmed: true };
      }

      if (ng.crystal.pickupArmed && d <= PLAYER_R + CRYSTAL_R + 5) {
        ng.hasCrystal = true;
        ng.crystal = null;
      }
    }

    if (!ng.hasCrystal && ng.crystal && now - ng.crystal.droppedAt > 5) {
      return { ...ng, running: false, failed: 'Crystal lag länger als 5 Sekunden auf dem Boden.' };
    }

    if (now >= ng.nextBeam) {
      const beams = Array.from({ length: 4 }, (_, i) => makeBeam(now, ng.beamId + i));
      ng.beams = [...ng.beams, ...beams];
      ng.beamId += 4;
      ng.nextBeam += BEAM_INTERVAL;
    }

    ng.beams = ng.beams.filter((b) => now <= b.activeUntil);

    const crystalPos = ng.hasCrystal ? ng.player : ng.crystal;
    if (crystalPos) {
      for (const b of ng.beams) {
        if (now > b.warnUntil && beamHitsCircle(b, crystalPos, CRYSTAL_R)) {
          return { ...ng, running: false, failed: 'Crystal wurde von einem Beam getroffen.' };
        }
      }
    }

    if (now > INTERMISSION_SECONDS) {
      return { ...ng, running: false, failed: 'Clear. Intermission überlebt.' };
    }

    return ng;
  }

  useEffect(() => {
    let raf;

    const loop = (nowMs) => {
      const dt = Math.min(0.033, (nowMs - last.current) / 1000);
      last.current = nowMs;

      setGame((g) => {
        if (!g.running) return g;
        return g.mode === 'p3' ? tickP3(g, dt) : tickIntermission(g, dt);
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const dcCurrentState = game.mode === 'p3' ? dcState(game.currentWave, game.time) : 'none';
  const success = game.failed?.startsWith('Clear');

  return (
    <main className="app">
      <section className="layout">
        <div className="panel arenaPanel">
          <div className="arena" style={{ width: ARENA, height: ARENA }}>
            <div className="arenaBg">
              <div className="ringOuter" />
              <div className="ringInner" />
            </div>

            <div className="boss">L'ura</div>

            {game.mode === 'p3' && (
              <>
                {game.lights.map((l) => (
                  <div key={l.id} className="lightCircle" style={{ left: l.x, top: l.y, width: LIGHT_R * 2, height: LIGHT_R * 2 }}>
                    <span>{l.name}</span>
                  </div>
                ))}

                {game.soaks.map((s) => (
                  <div
                    key={s.id}
                    className={s.progress >= SOAK_REQUIRED ? 'soak done' : s.id === 3 ? 'soak playerSoak' : 'soak'}
                    style={{ left: s.x, top: s.y, width: SOAK_R * 2, height: SOAK_R * 2 }}
                  >
                    <div className="soakLabel">{s.progress >= SOAK_REQUIRED ? 'done' : `${Math.ceil(SOAK_REQUIRED - s.progress)}s`}</div>
                    <div className="soakFill" style={{ height: `${(s.progress / SOAK_REQUIRED) * 100}%` }} />
                  </div>
                ))}

                {game.currentWave && <Constellation wave={game.currentWave} state={dcCurrentState} />}

                <div className="p3Hud">
                  {game.currentWave
                    ? dcCurrentState === 'spawn'
                      ? `Dark Constellation ${game.currentWave.id}/5: ${(DC_SPAWN - (game.time - game.currentWave.startedAt)).toFixed(1)}`
                      : dcCurrentState === 'active'
                        ? `DODGE ${game.currentWave.id}/5`
                        : 'Reset'
                    : game.waveId < DC_WAVES
                      ? `Next Constellation: ${Math.max(0, game.nextWaveAt - game.time).toFixed(1)}`
                      : 'Last pattern done'}
                </div>

                {game.time >= game.soaksStartedAt && game.soaks.some((s) => s.progress < SOAK_REQUIRED) && (
                  <div className="soakBar">
                    <span>Soaks</span>
                    <b>{Math.max(0, SOAK_TIMER - (game.time - game.soaksStartedAt)).toFixed(1)}</b>
                    <div style={{ width: `${clamp((SOAK_TIMER - (game.time - game.soaksStartedAt)) / SOAK_TIMER, 0, 1) * 100}%` }} />
                  </div>
                )}

                {!game.lights.some((l) => dist(game.player, l) <= LIGHT_R) && (
                  <div className="lightWarning">
                    OUTSIDE LIGHT ({Math.max(0, OUTSIDE_LIGHT_GRACE - game.outsideLightTime).toFixed(1)})
                  </div>
                )}
              </>
            )}

            {game.mode === 'intermission' && (
              <>
                {game.beams.map((b) => {
                  const active = game.time > b.warnUntil;
                  return (
                    <div
                      key={b.id}
                      className={active ? 'beam active' : 'beam warning'}
                      style={{
                        width: RADIUS + 20,
                        height: BEAM_WIDTH,
                        marginTop: -BEAM_WIDTH / 2,
                        transform: `rotate(${b.angle}rad)`
                      }}
                    />
                  );
                })}

                {game.crystal && (
                  <div
                    className={game.crystal.pickupArmed ? 'crystal pickupReady' : 'crystal'}
                    style={{ left: game.crystal.x, top: game.crystal.y, width: CRYSTAL_R * 2, height: CRYSTAL_R * 2 }}
                  />
                )}

                {game.nextBeam - game.time <= BEAM_WARNING && (
                  <div className="raidWarning">Beams ({Math.max(0, game.nextBeam - game.time).toFixed(1)})</div>
                )}
              </>
            )}

            <div className="player" style={{ left: game.player.x, top: game.player.y }}>
              <div className={game.mode === 'intermission' && game.hasCrystal ? 'playerIcon hasCrystal' : 'playerIcon'}>
                {game.mode === 'intermission' && game.hasCrystal && <div className="innerCrystal" />}
              </div>
              <div className="playerName">Player</div>
            </div>

            {!game.running && game.failed && (
              <div className="wipeOverlay">
                <div className={success ? 'resultBox success' : 'resultBox fail'}>
                  <h2>{success ? 'Clear' : 'Wipe'}</h2>
                  <p>{game.failed}</p>
                  <button onClick={() => restart()}>Retry</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="panel sidebar">
          <h1>L'ura Trainer</h1>
          <p>WASD bewegen. Wähle links nur den Trainingsmodus. P3 ist jetzt bewusst separat und ohne Player- oder Keybind-Setup.</p>

          <div className="settingsBox">
            <label>
              Training
              <select value={selectedMode} onChange={(e) => changeMode(e.target.value)}>
                <option value="p3">Lura P3</option>
                <option value="intermission">Lura Intermission</option>
              </select>
            </label>

            {selectedMode === 'p3' && (
              <label>
                P3 Phase
                <select value={phase} onChange={(e) => changePhase(e.target.value)}>
                  <option value="1">Phase 1: 3 Light Circles</option>
                  <option value="2">Phase 2: 2 Light Circles</option>
                  <option value="3">Phase 3: 1 moving Light Circle</option>
                </select>
              </label>
            )}
          </div>

          {game.mode === 'p3' ? <P3Stats game={game} /> : <IntermissionStats game={game} />}

          <button className="restart" onClick={() => restart()}>Restart Run</button>
        </aside>
      </section>
    </main>
  );
}

function P3Stats({ game }) {
  const remainingSoak = game.time >= game.soaksStartedAt
    ? Math.max(0, SOAK_TIMER - (game.time - game.soaksStartedAt))
    : SOAK_TIMER;
  const soaked = game.soaks.filter((s) => s.progress >= SOAK_REQUIRED).length;

  return (
    <>
      <div className="stats">
        <Stat label="Timer" value={`${game.time.toFixed(1)}s`} />
        <Stat label="Soaks" value={`${soaked}/3`} danger={remainingSoak < 5 && soaked < 3} />
        <Stat label="Soak Time" value={`${remainingSoak.toFixed(1)}s`} danger={remainingSoak < 5 && soaked < 3} />
        <Stat label="Constellations" value={`${game.waveId}/5`} />
      </div>

      <div className="infoBox">
        <strong>P3</strong>
        <p>Du spawnst als Player in einer Light-Zone.</p>
        <p>Wuff, Wuff2 und Wuff3 sind die Light-Spieler.</p>
        <p>Dark Constellations haben jetzt 17 bis 19 Punkte und sind als zusammenhängendes Netzwerk verbunden.</p>
      </div>
    </>
  );
}

function IntermissionStats({ game }) {
  const crystalAge = game.crystal ? game.time - game.crystal.droppedAt : 0;

  return (
    <>
      <div className="stats">
        <Stat label="Timer" value={`${game.time.toFixed(1)}s / ${INTERMISSION_SECONDS}s`} />
        <Stat label="Crystal" value={game.hasCrystal ? 'getragen' : `boden ${Math.max(0, 5 - crystalAge).toFixed(1)}s`} danger={!game.hasCrystal && 5 - crystalAge < 1.5} />
        <Stat label="Nächste Beams" value={`${Math.max(0, game.nextBeam - game.time).toFixed(1)}s`} />
        <Stat label="Drops" value={game.drops} />
      </div>

      <div className="infoBox">
        <strong>Intermission</strong>
        <p>Shift + Q legt den Crystal ab. Kurz rauslaufen, danach wieder drüberlaufen zum Aufheben.</p>
      </div>
    </>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div className={danger ? 'stat danger' : 'stat'}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function Constellation({ wave, state }) {
  const active = state === 'active';

  return (
    <svg className="constellation" width={ARENA} height={ARENA}>
      {active && wave.edges.map((edge, index) => {
        const a = wave.points[edge.a];
        const b = wave.points[edge.b];
        return (
          <line
            key={index}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="rgb(125 211 252)"
            strokeWidth="18"
            strokeLinecap="round"
            opacity="0.88"
          />
        );
      })}

      {wave.points.map((p) => (
        <g key={p.id}>
          {!active && <circle cx={p.x} cy={p.y} r="28" fill="rgb(59 130 246)" opacity="0.16" />}
          <circle
            cx={p.x}
            cy={p.y}
            r={active ? DC_POINT_R : 14}
            fill="rgb(2 6 23)"
            stroke={active ? 'rgb(125 211 252)' : 'rgb(59 130 246)'}
            strokeWidth={active ? 4 : 3}
          />
        </g>
      ))}
    </svg>
  );
}
