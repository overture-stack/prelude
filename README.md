# Drug Discovery Portal

## Running conductor

1. Build the conductor CLI:

```
cd apps/conductor
npm install
npm run build
chmod +x dist/main.js
cd ../..
```

2. Make the wrapper script executable:

```
chmod +x conductor.sh
```

3. Add the project directory to their PATH:

```
echo "export PATH=\"$(pwd):\$PATH\"" >> ~/.bashrc
source ~/.bashrc
``` 

> Run step 3 if the utility has been pre-built for you