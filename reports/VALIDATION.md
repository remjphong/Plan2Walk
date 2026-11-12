# Validation — 2026-11-12

Source: uploaded `plan2walk-rush(1).zip` (latest located snapshot). Archive included a stale nested starter and Windows node_modules; active root contains Groq edits. No Git history existed; initialized a local baseline, preserved it, then created feature branch. Original archive untouched. No remote was changed.

| Check | Result |
|---|---|
| Original npm run check / build | Initially permission denied from Windows node_modules |
| npm ci --ignore-scripts --no-audit --no-fund | Passed; rebuilt dependencies for Linux |
| Baseline npm run check | Passed |
| Baseline npm run build | Passed; bundle-size warning |
| Original test suite | None defined |
| V1 TypeScript / tests / build | Passed; 27/27 tests. See final-checks.txt |
| Dataset decoding and hashes | 17/17 decoded; zero identical SHA256 |
| Ground truth | 0 human-verified; 17 empty templates + 1 separate candidate |
| Actual vision benchmark | 19 not_run; no accuracy established |
| Docker | Binary unavailable, not run |
| Browser visual QA | Blocked: Chromium process singleton socket EPERM |
| Actual WASD / pointer lock | Not verified in browser; pure collision unit tests passed |
| GLB | 12 magic/hash/license checks; actual GLTFLoader bunk decode passed |
| API | Local HTTP integration with mocked provider; no live Groq calls |

Regression cases cover bunk bedroom, ensuite, concave L floor, multiple doors/window, unknown objects, missing bbox, 404 fallback helper, malformed JSON, 401/429/400/timeout, one retry on 5xx, MIME mismatch/oversize, multi-level warning, self-intersection, duplicate walls, room overlap, missing wall hosts and blocked door center. Few-shot tests exclude holdout/unreviewed/same-family examples. Metrics tested against known synthetic values, never against fabricated dataset labels.

Limits: 404 test validates fallback orchestration, not a browser network request. Shader/texture appearance and orientation need visual review. GLB dimensions are native metadata; furniture size comes from footprint, with illustrative height when unknown. Endpoint wall metric is not full wall topology quality. Room raster IoU approximate. No confidence intervals are meaningful while N scored = 0.
