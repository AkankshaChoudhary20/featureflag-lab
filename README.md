# FeatureFlag Lab

A local feature-flag and experimentation platform with deterministic percentage rollouts, exact attribute targeting, weighted variants, persistent exposure/conversion tracking, and a TypeScript SDK.

## Run

Requires Node.js 22+.

```sh
npm ci
npm start
```

Open http://127.0.0.1:3100. Save the prefilled flag, evaluate a user, and record a conversion. Evaluate the same user repeatedly to see a stable assignment and deduplicated counts. Save a new configuration to start a separate version of the experiment. Set `PORT` or `FLAGS_DB` to override defaults.

## SDK

```sh
npm run build:sdk
```

```ts
import { FeatureFlagClient } from './dist/sdk/client.js';
const client = new FeatureFlagClient('http://127.0.0.1:3100');
const assignment = await client.evaluate('checkout-layout', 'user-42', {plan: 'pro'});
if (assignment.eligible) {
  console.log(assignment.variant);
  await client.trackConversion(assignment);
}
```

The SDK is intended for server-side use or same-origin browser requests. Errors are explicit; your application should select its own fallback behavior.

## Semantics

SHA-256 maps `(flag key, user ID, salt)` into a stable bucket. Increasing rollout preserves eligibility for users already included. Variant selection uses a separate salt. Changing weights can change variants, and each save increments the experiment version. Evaluate once at the point the feature is actually displayed: evaluations count as exposures.

Each `(flag, version, user, variant)` is counted once; repeated conversions are ignored. Results are isolated by version. The UI shows the current version; `/api/summary?key=checkout-layout&version=1` retrieves historical results. Wilson 95% intervals describe binomial uncertainty; the app does not perform sequential significance testing or declare a winning variant.

## API

- `GET/POST /api/flags`: list or save configurations.
- `POST /api/evaluate`: `{key,userId,attributes}` → assignment and exposure ID.
- `POST /api/conversions`: `{exposure_id}` → deduplicated conversion.
- `GET /api/summary?key=...&version=...`: experiment results.

## Tests and limits

`npm test` covers stable rollout membership, weighted distribution, targeting, invalid configurations, persistence, conversion deduplication, version isolation, and interval bounds. Five tests passed; the SDK compiled successfully. Browser interaction and socket-level testing are not verified in the managed sandbox.

State is atomically saved to `data/flags.json`. This is a single-process, single-user MVP, with up to 100,000 exposures and 32 KB request bodies. Raw user IDs are stored locally. Keep the default loopback binding; authentication, multi-process persistence, Redis caching, and PostgreSQL are future extensions. Back up state before experimentation with real users.

MIT licensed.
