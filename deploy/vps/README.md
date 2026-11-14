# VPS deploy (cyber_Folks, Ubuntu 24.04)

What runs on the production server, kept here so it can be rebuilt.

- `wb-deploy` → `/usr/local/bin/wb-deploy` (run as `deploy`). Releases live in
  `/srv/wellbotany/releases/<sha>` (git worktrees of `/srv/wellbotany/repo`),
  `current` / `previous` are symlinks, env is `/srv/wellbotany/shared/.env.production.local`,
  hashed assets accumulate in `/srv/wellbotany/shared/static` (served by nginx).
- `wb-deploy-ssh` → `/usr/local/bin/wb-deploy-ssh`, forced command of the GitHub
  Actions key in `~deploy/.ssh/authorized_keys` (`command="…",restrict`).
- systemd: `wellbotany.service` (`next start` from `current` on 127.0.0.1:3000),
  `wb-pg-backup.timer` (nightly pg_dump), `wb-merchant-sync.timer` (daily Merchant resync),
  `wb-warm-cache.service` (renders every sitemap URL after each deploy; started by `wb-deploy`).
- `wb-pg-backup` → `/usr/local/bin/wb-pg-backup`: dump → `/var/backups/wellbotany` (14 days)
  → B2 via rclone crypt; touches `.backup-ok` / `.offsite-ok`, which `/api/health` checks
  (`BACKUP_DIR` in the env file, Uptime alerts after 27 h).
- `wb-warm-cache` + `wb-warm-cache.service` → `/usr/local/bin/`, `/etc/systemd/system/`.
- Redis 7 (`redis-server`): localhost only, password, 128 MB, `volatile-lru`; settings in
  `/etc/redis/conf.d-wellbotany.conf` (included from `redis.conf`), URL = `REDIS_URL`.
- Kernel updates: unattended-upgrades reboots at 04:30 when needed (`52wellbotany-reboot`).
- nginx: TLS + proxy, `/_next/static/` from disk, gzip, `admin.wellbotany.pl` vhost.

Deploys: `.github/workflows/deploy.yml` (nightly / by hand) or `scripts/deploy-prod.sh`.
Rollback: `ssh wb-vps wb-deploy rollback`.
