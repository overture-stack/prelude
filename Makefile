platform:
	PROFILE=platform docker compose --profile platform up --attach conductor

stageDev:
	PROFILE=stageDev docker compose --profile stageDev up --attach conductor

arrangerDev:
	PROFILE=arrangerDev docker compose --profile arrangerDev up --attach conductor

maestroDev:
	PROFILE=maestroDev docker compose --profile maestroDev up --attach conductor

songDev:
	PROFILE=songDev docker compose --profile songDev up --attach conductor

scoreDev:
	PROFILE=scoreDev docker compose --profile scoreDev up --attach conductor

down:
	PROFILE=platform docker compose --profile platform down
