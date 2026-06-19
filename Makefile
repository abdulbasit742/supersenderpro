.DEFAULT_GOAL := help
COMPOSE := docker compose -f docker-compose.yml -f docker-compose.prod.yml
SHELL := /bin/bash

.PHONY: help install dev build up up-ssl down restart logs ps health migrate seed \
        backup secrets validate doctor image-monolith k8s-deploy k8s-delete prune

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install root dependencies
	npm install

dev: ## Run the monolith locally with nodemon
	npm run dev

validate: ## Validate environment variables
	npm run validate:env

doctor: ## Run project doctor / health diagnostics
	npm run doctor

secrets: ## Generate production secrets
	npm run generate:secrets

build: ## Build all production images
	$(COMPOSE) build

up: ## Start full stack (self-signed nginx TLS)
	$(COMPOSE) up -d

up-ssl: ## Start full stack with Caddy automatic Let's Encrypt TLS
	$(COMPOSE) -f deploy/caddy/docker-compose.caddy.yml up -d

down: ## Stop the stack
	$(COMPOSE) down

restart: ## Recreate the stack
	$(COMPOSE) up -d --build --force-recreate

logs: ## Tail logs
	$(COMPOSE) logs -f --tail=100

ps: ## Show container status
	$(COMPOSE) ps

health: ## Curl the backend health endpoint
	curl -fsS http://localhost:3001/api/health && echo

migrate: ## Run Prisma migrations inside the backend container
	docker exec backend npx prisma migrate deploy --schema src/prisma/schema.docker.prisma \
	  || docker exec backend npx prisma db push --schema src/prisma/schema.docker.prisma

seed: ## Seed the database
	docker exec backend node src/db/seed.js

backup: ## Backup application data
	npm run backup:data

image-monolith: ## Build only the monolith image
	docker build -t supersender-monolith:local .

k8s-deploy: ## Apply Kubernetes manifests
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/

k8s-delete: ## Delete the Kubernetes namespace
	kubectl delete -f k8s/namespace.yaml

prune: ## Remove dangling Docker images
	docker image prune -f
