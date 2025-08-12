1. Clone Repo

```
git clone https://github.com/overture-stack/prelude.git -b jbrowse-demo
```

2. Run the following

```
cd apps/stage
docker build -t stageimage:1.0 .
```

3. Then from root

```
make demo
```

4. Install conductor

```
cd apps/conductor
npm install -g .
```

5. then from root load the data

```
conductor songCreateStudy -i demo
conductor songUploadSchema -s ./apps/conductor/configs/songSchemas/song-schema.json
conductor songSubmitAnalysis -a ./data/file-metadata.json -i demo
conductor maestroIndex --repository-code song.overture
```
