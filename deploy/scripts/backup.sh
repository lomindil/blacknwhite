#!/usr/bin/env bash
# Nightly: dump Postgres, keep 14 days on the server, and copy the dump plus uploaded photos
# to the Lightsail bucket. Bucket settings live in /srv/redreader/backup.env:
#   BACKUP_BUCKET=redreader-backups   AWS_ACCESS_KEY_ID=…   AWS_SECRET_ACCESS_KEY=…   AWS_DEFAULT_REGION=ap-southeast-2
set -euo pipefail
cd /srv/redreader
STAMP=$(date -u +%Y%m%d-%H%M)
FILE="backups/db-$STAMP.sql.gz"

docker compose exec -T postgres pg_dump -U redreader --no-owner redreader | gzip -9 > "$FILE"
find backups -name 'db-*.sql.gz' -mtime +14 -delete
echo "$(date -u) dumped $FILE ($(du -h "$FILE" | cut -f1))"

if [ -f backup.env ]; then
  set -a; . ./backup.env; set +a
  aws s3 cp "$FILE" "s3://$BACKUP_BUCKET/db/$(basename "$FILE")" --only-show-errors
  # Photos: copy new files only. The volume path is Docker's, so read it from the API container.
  UPLOADS=$(docker volume inspect redreader_uploads --format '{{ .Mountpoint }}')
  sudo -E aws s3 sync "$UPLOADS" "s3://$BACKUP_BUCKET/uploads/" --only-show-errors
  # Remove bucket dumps older than 30 days (Lightsail buckets have no lifecycle rules).
  CUTOFF=$(date -u -d '30 days ago' +%Y%m%d)
  aws s3 ls "s3://$BACKUP_BUCKET/db/" | awk '{print $4}' | while read -r f; do
    d=$(echo "$f" | sed -E 's/db-([0-9]{8}).*/\1/')
    if [[ "$d" < "$CUTOFF" ]]; then aws s3 rm "s3://$BACKUP_BUCKET/db/$f" --only-show-errors; fi
  done
  echo "$(date -u) uploaded to s3://$BACKUP_BUCKET"
fi
