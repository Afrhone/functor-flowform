SHELL := /usr/bin/env bash
.PHONY: serve compose-up compose-sso swarm-dry swarm-apply test zip
serve:
	cd web && python3 -m http.server 8080
compose-up:
	docker compose up --build
compose-sso:
	COMPOSE_PROFILES=sso,mcp docker compose up --build
swarm-dry:
	DRY_RUN=1 ./deploy/swarm/deploy-stack.sh
swarm-apply:
	APPLY=1 ./deploy/swarm/deploy-stack.sh
test:
	python3 tests/validate_bundle.py
zip:
	cd .. && zip -r flowforms_axiom_playground_bundle.zip flowforms_axiom_playground_bundle -x '*/node_modules/*' '*.DS_Store'
