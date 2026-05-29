# L'ura Trainer v6

## Änderungen gegenüber v5

- P3 Player-Hitbox für Dark Constellation ist jetzt näher am echten Verhalten:
  - Es zählt praktisch der Center-Point des Spielers, nicht mehr der volle Player-Kreis.
- Dark Constellation Punkte werden nicht mehr so stark im ganzen Raum verteilt.
- Patterns spawnen jetzt primär um L'ura und im Bereich der Light-/Soak-Zonen.
- Unrealistische Punkte weit oberhalb von L'ura werden vermieden.
- Dark Constellations bleiben bei 17 bis 19 Startpunkten und werden als verbundenes Netzwerk gebaut.

## Lokal starten

```bash
npm install
npm run dev
```

## Vercel

Build Command: `npm run build`  
Output Directory: `dist`  
Framework Preset: `Vite`
