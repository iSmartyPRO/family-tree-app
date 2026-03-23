# ============================================================
#  Rodolog — Makefile CLI
# ============================================================

IMAGE_NAME  := rodolog
CONTAINER   := rodolog-app
PORT        := 3000
CONFIG_FILE := ./config.json
NODE_IMAGE  := node:20-alpine
MONGO_IMAGE := mongo:7
UID         := $(shell id -u)
GID         := $(shell id -g)
MONGO_URL   := $(shell python3 -c "import json; print(json.load(open('config.json'))['mongo_url'])")
USER_FILES_DIRS := uploads src/backend/uploads src/frontend/public/uploads
# npm в контейнере с UID хоста, чтобы node_modules не были root-only
DOCKER_NPM  := docker run --rm \
	-e npm_config_cache=/tmp/npm-cache \
	-e HOME=/tmp \
	--user $(UID):$(GID) \
	-v "$(CURDIR):/app"

.PHONY: build run stop restart rebuild backup restore restrore logs create-admin test clean \
        dev dev-backend dev-frontend install

# ── Build ────────────────────────────────────────────────────
build:
	@echo "🔨 Building Docker image $(IMAGE_NAME)..."
	docker build -t $(IMAGE_NAME) .
	@echo "✅ Build complete."

# ── Run ─────────────────────────────────────────────────────
run:
	@echo "🚀 Starting $(CONTAINER) on port $(PORT)..."
	docker run -d \
		--name $(CONTAINER) \
		--restart unless-stopped \
		-p $(PORT):$(PORT) \
		-v $(shell pwd)/$(CONFIG_FILE):/app/config.json:ro \
		$(IMAGE_NAME)
	@echo "✅ Application running at http://localhost:$(PORT)"

# ── Stop ────────────────────────────────────────────────────
stop:
	@echo "🛑 Stopping $(CONTAINER)..."
	docker stop $(CONTAINER) 2>/dev/null || true
	docker rm   $(CONTAINER) 2>/dev/null || true
	@echo "✅ Stopped."

# ── Restart ─────────────────────────────────────────────────
restart: stop run

# ── Rebuild ─────────────────────────────────────────────────
rebuild: stop build run

# ── Backup / Restore ────────────────────────────────────────
backup:
	@echo "💾 Creating data backup (MongoDB + user files) into ./backups ..."
	@mkdir -p backups
	@TS=$$(date +%Y%m%d_%H%M%S); \
		TMP_DIR=".backup_tmp_$${TS}"; \
		FILE="backups/ftree_$${TS}.tar.gz"; \
		mkdir -p "$$TMP_DIR/files"; \
		echo "📦 Writing backup to $$FILE"; \
		docker run --rm \
			-e MONGO_URL="$(MONGO_URL)" \
			-v "$(CURDIR):/work" \
			$(MONGO_IMAGE) sh -lc 'mongodump --uri "$$MONGO_URL" --archive="/work/'"$$TMP_DIR"'/db.archive.gz" --gzip'; \
		for D in $(USER_FILES_DIRS); do \
			if [ -d "$$D" ]; then \
				echo "📁 Including files from $$D"; \
				mkdir -p "$$TMP_DIR/files/$$D"; \
				cp -a "$$D"/. "$$TMP_DIR/files/$$D"/; \
			fi; \
		done; \
		tar -czf "$$FILE" -C "$$TMP_DIR" .; \
		rm -rf "$$TMP_DIR"
	@echo "✅ Backup complete (single tar.gz archive)."

## Usage:
##   make restore                      # restore latest file from ./backups
##   make restore FILE=backups/name.tar.gz
restore:
	@echo "♻️ Restoring data backup (MongoDB + user files) ..."
	@FILE_PATH="$(FILE)"; \
		if [ -z "$$FILE_PATH" ]; then \
			FILE_PATH=$$(python3 -c "import glob; files=sorted(glob.glob('backups/ftree_*.tar.gz')); print(files[-1] if files else '')"); \
		fi; \
		if [ -z "$$FILE_PATH" ]; then \
			echo "❌ No backup files found in ./backups"; \
			exit 1; \
		fi; \
		if [ ! -f "$$FILE_PATH" ]; then \
			echo "❌ Backup file not found: $$FILE_PATH"; \
			exit 1; \
		fi; \
		TMP_DIR=".restore_tmp_$$(date +%Y%m%d_%H%M%S)"; \
		mkdir -p "$$TMP_DIR"; \
		tar -xzf "$$FILE_PATH" -C "$$TMP_DIR"; \
		if [ ! -f "$$TMP_DIR/db.archive.gz" ]; then \
			echo "❌ Invalid backup archive: missing db.archive.gz"; \
			rm -rf "$$TMP_DIR"; \
			exit 1; \
		fi; \
		echo "📦 Restoring from $$FILE_PATH"; \
		docker run --rm \
			-e MONGO_URL="$(MONGO_URL)" \
			-v "$(CURDIR):/work" \
			$(MONGO_IMAGE) sh -lc 'mongorestore --uri "$$MONGO_URL" --archive="/work/'"$$TMP_DIR"'/db.archive.gz" --gzip --drop'; \
		if [ -d "$$TMP_DIR/files" ]; then \
			for DIR in "$$TMP_DIR"/files/*; do \
				[ -d "$$DIR" ] || continue; \
				REL=$${DIR#$$TMP_DIR/files/}; \
				echo "📁 Restoring files into $$REL"; \
				mkdir -p "$$REL"; \
				cp -a "$$DIR"/. "$$REL"/; \
			done; \
		fi; \
		rm -rf "$$TMP_DIR"
	@echo "✅ Restore complete."

# Alias (intentionally supports user-typed command)
restrore: restore

# ── Logs ────────────────────────────────────────────────────
logs:
	docker logs -f $(CONTAINER)

# ── Create Admin ─────────────────────────────────────────────
## Usage: make create-admin  (interactive)
##        make create-admin EMAIL=admin@example.com PASSWORD=secret NAME="Admin"
create-admin:
ifdef EMAIL
	@docker exec -it $(CONTAINER) \
		node src/backend/scripts/createAdmin.js \
		"$(EMAIL)" "$(PASSWORD)" "$(NAME)"
else
	@echo "Running create-admin interactively (requires running container)..."
	@docker exec -it $(CONTAINER) \
		node src/backend/scripts/createAdmin.js
endif

## Запуск create-admin через Node в контейнере (без npm на хосте)
create-admin-local:
ifdef EMAIL
	@$(DOCKER_NPM) -w /app/src/backend $(NODE_IMAGE) \
		node scripts/createAdmin.js "$(EMAIL)" "$(PASSWORD)" "$(NAME)"
else
	@$(DOCKER_NPM) -it -w /app/src/backend $(NODE_IMAGE) \
		node scripts/createAdmin.js
endif

# ── Tests ────────────────────────────────────────────────────
test: test-backend test-frontend

test-backend:
	@echo "🧪 Running backend tests..."
	@$(DOCKER_NPM) -w /app/src/backend $(NODE_IMAGE) npm test

test-frontend:
	@echo "🧪 Running frontend tests..."
	@$(DOCKER_NPM) -w /app/src/frontend $(NODE_IMAGE) npm test

# ── Development ──────────────────────────────────────────────
install:
	@echo "📦 Installing backend deps (Docker $(NODE_IMAGE))..."
	@$(DOCKER_NPM) -w /app/src/backend $(NODE_IMAGE) npm install
	@echo "📦 Installing frontend deps (Docker $(NODE_IMAGE))..."
	@$(DOCKER_NPM) -w /app/src/frontend $(NODE_IMAGE) npm install
	@echo "✅ Dependencies installed."

## Оба сервиса: backend + frontend (прокси /api → backend в сети compose)
dev:
	@echo "🚀 Starting dev stack (docker compose)..."
	docker compose -f docker-compose.dev.yml up

## Только backend; слушает порт из config.json (обычно 3000), снаружи — $(PORT)
dev-backend:
	@echo "🔧 Backend dev in Docker (host :$(PORT) → container :3000)..."
	docker run --rm -it \
		-p $(PORT):3000 \
		-v "$(CURDIR):/app" \
		-w /app/src/backend \
		$(NODE_IMAGE) npm run dev

## Только frontend; API на хосте: host.docker.internal → машина с Docker
dev-frontend:
	@echo "🔧 Frontend dev in Docker on port 5173 (API: host.docker.internal:$(PORT))..."
	docker run --rm -it \
		--add-host=host.docker.internal:host-gateway \
		-e VITE_DEV_API_PROXY=http://host.docker.internal:$(PORT) \
		-p 5173:5173 \
		-v "$(CURDIR):/app" \
		-w /app/src/frontend \
		$(NODE_IMAGE) sh -c "npm run dev -- --host 0.0.0.0"

# ── Clean ────────────────────────────────────────────────────
clean: stop
	@echo "🧹 Removing Docker image..."
	docker rmi $(IMAGE_NAME) 2>/dev/null || true
	@echo "🧹 Removing build artifacts..."
	rm -rf dist
	@echo "✅ Clean complete."

# ── Help ─────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Rodolog — Available Commands"
	@echo "  ─────────────────────────────────────────────"
	@echo "  make build          Build Docker image"
	@echo "  make run            Start application container"
	@echo "  make stop           Stop and remove container"
	@echo "  make restart        Stop then start container"
	@echo "  make rebuild        Stop, rebuild image, then start container"
	@echo "  make backup         Backup MongoDB + user files to one ./backups/*.tar.gz"
	@echo "  make restore        Restore MongoDB + user files (latest or FILE=...)"
	@echo "  make restrore       Alias for make restore"
	@echo "  make logs           Tail application logs"
	@echo "  make create-admin   Create superuser account"
	@echo "  make test           Run all tests (unit + integration)"
	@echo "  make install        Install npm deps via Docker (no host Node)"
	@echo "  make dev            Dev stack: backend + frontend (docker compose)"
	@echo "  make dev-backend    Backend only in Docker"
	@echo "  make dev-frontend   Frontend only in Docker (API on host:$(PORT))"
	@echo "  make clean          Remove container + image + dist"
	@echo ""
	@echo "  Variables:"
	@echo "    EMAIL=   PASSWORD=   NAME=   (for create-admin)"
	@echo "    PORT=    (default: 3000)"
	@echo ""

.DEFAULT_GOAL := help
