# Plan2Walk V1 handoff

## Delivered
- Updated original MVP source, baseline preserved in local Git history. Branch `feature/plan2walk-v1`; no remote push/deploy.
- V1 pixel-coordinate schema and legacy adapter; separated perception / deterministic geometry / Three rendering / asset resolution.
- Multi-room polygons and walls, hosted doors/windows, fallback reporting, 12 pinned CC0 GLBs.
- Review overlay, manual polygon/wall creation, two-point calibration, object fields and JSON editing, annotation export/import with image hash.
- Dataset inventory for 17 + 2 reference images; 17 unreviewed templates, one manually drafted unverified candidate. Provisional family split; no fine-tuning.
- Offline unit/integration/regression suite, production build, safe API errors and upload limits.

## Not accepted yet
1. No live Groq predictions in this execution. Existing uploaded `.env` was not used for API calls: quota/free-tier state and rotation of previously exposed key are unverified. Do not interpret mocks as vision accuracy.
2. No human-verified ground truth. All 19 benchmark rows `not_run`, accuracy null. Need annotations and live/saved predictions to evaluate accuracy or compare few-shot.
3. No browser screenshot or end-to-end WASD verification. Chromium failed with socket EPERM; attempted Playwright browser download returned a truncated archive. Unit tests exercise geometry and GLTF decoding only.
4. Docker binary absent; Docker build not run. Production HTTP smoke passes locally.
5. Full multi-level, stairs navigation, polygon holes, robust automatic wall union, per-feature OCR evidence and advanced CAD editing remain V1.1 work.
6. Split/family assignments require human review. Dataset licenses are unknown; do not publish raw images.

## Resume
Run npm ci, npm run check, npm test, npm run build. Start with GROQ_API_KEY empty and smoke-test sample / JSON edits / overlay / actual 404 fallback / WASD in a real browser. Then configure a current key with known free quota, run a small sample before all 19. Review annotations and split families, run zero-shot and few-shot separately, preserve both reports. Docker build last. No paid service or public deployment was performed.

## Git recovery
`git-history.bundle` contains baseline and feature branch. To inspect history in a separate directory:
`git clone git-history.bundle plan2walk-history`
`git switch feature/plan2walk-v1`
The delivery ZIP also contains the current source ready for npm ci. Raw dataset is included only in this private handoff ZIP and intentionally excluded from Git/Docker.
