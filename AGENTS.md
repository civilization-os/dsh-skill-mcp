# Plugin repository

This repository has independent Git history and configuration. Do not edit the adjacent Harness checkout as part of an ordinary plugin change.

Use public Harness package exports. Local `link:` dependencies target the adjacent built checkout during development. Launch applications through `dsh` profiles and overlays.

Run `pnpm test` for manager changes. Use `pnpm run setup` to create local overlays; `pnpm setup` is a different, built-in pnpm command.

Preserve existing extension records. Configured enabled state is not proof of runtime readiness. Keep credentials out of model arguments, results and committed files. Resource registrations must be disposed through Cordis effects.

Document current behavior and verification limits in README.md.
