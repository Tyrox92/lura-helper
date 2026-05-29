# L'ura Trainer v8

## Änderungen gegenüber v7

- Dark-Consteallation-Pfade vermeiden jetzt unrealistisch lange Verbindungslinien.
- Der Pfad wählt lokale Nachbarpunkte mit Maximaldistanz.
- Längere Verbindungen werden nur noch als Notfall erlaubt, damit das Pattern verbunden bleibt.
- Punktverteilung wurde dichter in den realistischen P3-Bereich gelegt, damit natürlichere Ketten entstehen.
- Player-Hitbox gegen Constellation-Laser bleibt center-point-nah.

## Lokal starten

```bash
npm install
npm run dev
```

## Vercel

Build Command: `npm run build`  
Output Directory: `dist`  
Framework Preset: `Vite`
