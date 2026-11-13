# VPS deploy (cyber_Folks, Ubuntu 24.04)

What runs on the production server, kept here so it can be rebuilt.

- `wb-deploy` → `/usr/local/bin/wb-deploy` (run as `deploy`). Releases live in
  `/srv/wellbotany/releases/<sha>` (git worktrees of `/srv/wellbotany/repo`),
  `current` / `previous` are symlinks, env is `/srv/wellbotany/shared/.env.production.local`,
  hashed assets accumulate in `/srv/wellbotany/shared/static` (served by nginx).
- `wb-deploy-ssh` → `/usr/local/bin/wb-deploy-ssh`, forced command of the GitHub
  Actions key in `~deploy/.ssh/authorized_keys` (`command="…",restrict`).
- systemd: `wellbotany.service` (`next start` from `current` on 127.0.0.1:3000),
  `wb-pg-backup.timer` (nightly pg_dump), `wb-merchant-sync.timer` (daily Merchant resync).
- nginx: TLS + proxy, `/_next/static/` from disk, gzip, `admin.wellbotany.pl` vhost.

Deploys: `.github/workflows/deploy.yml` (nightly / by hand) or `scripts/deploy-prod.sh`.
Rollback: `ssh wb-vps wb-deploy rollback`.
