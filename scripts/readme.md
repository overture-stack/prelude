# Scripts

## Deployments

Deployment scripts are an ordered collection of service scripts made to
systematically deploy platform infrastructure.

## Services

Service scripts are modular and designed to perform specific tasks (like health
checks, data setup, and service validation) that can be easily referenced and
executed by deployment scripts. The plug-and-play setup allows for flexible
deployment configurations where scripts can be added, removed, or reordered as
needed.

To reduce coginitive overload we have organized setup scripts by the phase they
are introduced in. All configurable variables are located at the top of the
script and are configurable from the enviorment variables of the conductor
service within the docker compose file.

### PhaseOne.sh

Configurations:

- `DEBUG`: Boolean flag to enable/disable debug logging
- `SCRIPT_DIR`: Base directory path for service scripts

Key Functions:

- `debug()`: Handles conditional debug output when DEBUG=true
- `rs()`: (Run Script) Utility function that:
  - Verifies script existence
  - Sets execute permissions
  - Executes scripts with explicit shell command
  - Includes debug logging of permissions

Deployment Sequence:

1. Removes any existing health check files (These files, when present, flag
   downstream services to start)
2. Initializes Elasticsearch
3. Sets up File Data in Elasticsearch
4. Sets up Tabular Data in Elasticsearch
5. Updates Conductor health status (by creating a `healthcheck` file)
6. Performs Stage verification
7. Validates Arranger setup

The script includes progress tracking with colored output and completes by
displaying the portal's access URL (default: http://localhost:3000). Each step
includes error handling and debug logging capabilities when enabled.

## Services
