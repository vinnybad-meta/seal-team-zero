# Setup — Seal Team Zero

## Play locally

No build, no dependencies. Serve the repo root with any static file
server and open it:

```bash
python3 -m http.server 8123
# open http://127.0.0.1:8123/
```

Routes: `/` landing page with both arms, `/arm-a/` Arm A build,
`/arm-b/` Arm B build. Append `?seed=7` to either game for a fixed
compound layout. Pointer lock requires a real (non-headless) browser;
touch fallback (left stick, right-drag look, FIRE button) works on
mobile viewports.

## Deploy

Webcraft AWS deployment (see `site.toml`):

```bash
codimango webcraft validate --path .
codimango webcraft deploy --target docker   # local check first
codimango webcraft deploy --target aws --wait
```
