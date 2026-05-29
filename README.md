# L'ura Trainer v5

## Änderungen

- Klar getrennte Auswahl zwischen:
  - Lura P3
  - Lura Intermission
- P3 hat nur noch die Phasen-Auswahl 1, 2 oder 3.
- Kein Player-Select und kein Ability-Keybind für P3.
- Spieler heißt in P3 einfach `Player`.
- Player spawnt in jeder P3-Phase direkt in einer Light-Zone.
- Light-Spieler heißen `Wuff`, `Wuff2`, `Wuff3`.
- Phase 2 Light Circles wurden enger gesetzt, damit der mittlere Soak erreichbar ist.
- Dark Constellations haben jetzt 17 bis 19 Startpunkte.
- Dark Constellations sind als zusammenhängendes Netzwerk gebaut, nicht mehr als lose Einzelverbindungen.

## Lokal starten

```bash
npm install
npm run dev
```

## Vercel

Build Command: `npm run build`  
Output Directory: `dist`  
Framework Preset: `Vite`
