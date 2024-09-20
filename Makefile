platform:
	PROFILE=platform docker compose --profile platform up --attach conductor

stageDev:
	PROFILE=stageDev docker compose --profile stageDev up --attach conductor

down:
	docker compose down
