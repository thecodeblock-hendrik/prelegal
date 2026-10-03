#!/usr/bin/env bash
# Stop and remove the Prelegal container; the prelegal-data volume keeps the database
set -euo pipefail
docker rm -f prelegal
