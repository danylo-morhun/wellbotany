#!/usr/bin/env bash
# Rebuild the local dev DB from a prod dump with personal data stripped.
#   scripts/dev-db/refresh.sh [dump]   (default: newest ~/Backups/wellbotany/vps/*.dump)
# Needs a local Postgres 18 (brew services start postgresql@18).
# Admins get the password from DEV_ADMIN_PASSWORD (default "wellbotany-dev"), no TOTP.
set -euo pipefail
cd "$(dirname "$0")/../.."

DB=${DEV_DB_NAME:-wellbotany_dev}
DUMP=${1:-$(ls -t ~/Backups/wellbotany/vps/wellbotany-*.dump | head -1)}
PASSWORD=${DEV_ADMIN_PASSWORD:-wellbotany-dev}

echo "restoring $DUMP → $DB"
dropdb --if-exists "$DB"
createdb "$DB"
pg_restore --no-owner --no-acl --exit-on-error -d "$DB" "$DUMP"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f scripts/dev-db/anonymize.sql

HASH=$(node -e 'console.log(require("bcryptjs").hashSync(process.argv[1], 12))' "$PASSWORD")
echo "UPDATE \"Customer\" SET \"passwordHash\" = :'hash' WHERE \"isAdmin\";" |
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -v hash="$HASH"

psql -At -d "$DB" -c "SELECT 'customers ' || count(*) || ', admins ' || count(*) FILTER (WHERE \"isAdmin\") FROM \"Customer\""
psql -At -d "$DB" -c "SELECT 'orders ' || count(*) FROM \"Order\""
echo "done — DATABASE_URL=postgresql://$(whoami)@localhost:5432/$DB"
