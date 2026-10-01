# Serf — Era 1 prototype

A tiny NGU-style incremental, built to test one thing: does a small loop of **smart choices** feel satisfying?

The choices are:

- how to split your stamina between Power and Guard;
- which boss to prepare for;
- which zone to farm;
- what to wear and merge;
- when to rebirth.

You are Hob, a serf. A rooster has opinions about you. It goes downhill (uphill?) from there.

```bash
npm install
npm run dev        # play it in the browser
npm test           # unit tests
npm run sim        # pacing simulator: bots play the real rules and report timings
npm run e2e        # browser smoke test with screenshots in artifacts/
npm run build      # static build in dist/
```

Design notes, simulator findings and playtest questions: [docs/prototype-v0.md](docs/prototype-v0.md).
