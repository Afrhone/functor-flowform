#!/usr/bin/env bash
set -euo pipefail
NAME=${NAME:-flowforms-ui}
IMAGE=${IMAGE:-images:ubuntu/24.04}
PROFILE=${PROFILE:-flowforms}
run(){ if [[ "${APPLY:-0}" == "1" ]]; then echo "+ $*"; eval "$@"; else echo "DRY_RUN + $*"; fi; }
run "lxc profile create $PROFILE || true"
run "lxc profile edit $PROFILE < $(dirname "$0")/profile-flowforms.yaml"
run "lxc launch $IMAGE $NAME -p default -p $PROFILE"
run "lxc exec $NAME -- bash -lc 'apt-get update && apt-get install -y docker.io git curl'"
