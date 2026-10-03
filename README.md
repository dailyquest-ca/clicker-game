# Serf: The Goat Debt (Era 1 prototype)

A small incremental game about a family of serfs paying off a century-old debt for a borrowed goat, one generation at a time.

You are Hob. You have three pips of stamina, a field of hay, and your late father's debt. Each life you build up a little farm, then decide:

- what to buy;
- what to pay;
- what to keep for the Steward;
- what to hand down to your heir.

The family gets a little better at everything each generation.

```bash
npm install
npm run dev        # play it in the browser (add ?debug=1 and use __advance(60) to skip time)
npm test           # unit tests
npm run sim        # pacing simulator: bots play the real rules and check the pacing targets
npm run e2e        # browser smoke test with screenshots in artifacts/
npm run build      # static build in dist/
```

- **Design, simulator results and playtest questions:** [docs/prototype-v1.md](docs/prototype-v1.md)
- **The first prototype (NGU-style bosses and adventure) and what we learned from it:** [docs/prototype-v0.md](docs/prototype-v0.md)
