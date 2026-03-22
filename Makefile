# ============================================================
#  Rodolog — Makefile CLI
# ============================================================

IMAGE_NAME  := rodolog
CONTAINER   := rodolog-app
PORT        := 3000
CONFIG_FILE := ./config.json

.PHONY: build run stop restart logs create-admin test clean \
        dev-backend dev-frontend install

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

## Fallback: run directly without Docker (for dev)
create-admin-local:
	@cd src/backend && node scripts/createAdmin.js $(EMAIL) $(PASSWORD) "$(NAME)"

# ── Tests ────────────────────────────────────────────────────
test: test-backend test-frontend

test-backend:
	@echo "🧪 Running backend tests..."
	@cd src/backend && npm test

test-frontend:
	@echo "🧪 Running frontend tests..."
	@cd src/frontend && npm test

# ── Development ──────────────────────────────────────────────
install:
	@echo "📦 Installing backend deps..."
	@cd src/backend && npm install
	@echo "📦 Installing frontend deps..."
	@cd src/frontend && npm install
	@echo "✅ Dependencies installed."

dev-backend:
	@echo "🔧 Starting backend dev server on port 3000..."
	@cd src/backend && npm run dev

dev-frontend:
	@echo "🔧 Starting frontend dev server on port 5173..."
	@cd src/frontend && npm run dev

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
	@echo "  make logs           Tail application logs"
	@echo "  make create-admin   Create superuser account"
	@echo "  make test           Run all tests (unit + integration)"
	@echo "  make install        Install all npm dependencies"
	@echo "  make dev-backend    Start backend dev server"
	@echo "  make dev-frontend   Start frontend dev server"
	@echo "  make clean          Remove container + image + dist"
	@echo ""
	@echo "  Variables:"
	@echo "    EMAIL=   PASSWORD=   NAME=   (for create-admin)"
	@echo "    PORT=    (default: 3000)"
	@echo ""

.DEFAULT_GOAL := help
