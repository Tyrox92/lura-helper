# L'ura Trainer v9

## Änderungen gegenüber v8

- Dark Constellations werden jetzt direkt als Pfad generiert, nicht erst als Punktwolke.
- Keine isolierten Punkte mehr.
- Keine langen Skip-Linien über mehrere Sterne hinweg.
- Jede Verbindung geht nur zum nächsten Punkt in der Kette.
- Segmente haben eine Maximaldistanz, damit keine unrealistischen Querlinien entstehen.
- 17 bis 19 Punkte bleiben erhalten.
- Spawn-Bereich bleibt weiterhin hauptsächlich im realistischen P3-Bereich.

## Lokal starten

```bash
npm install
npm run dev
```

## Vercel

Build Command: `npm run build`  
Output Directory: `dist`  
Framework Preset: `Vite`
