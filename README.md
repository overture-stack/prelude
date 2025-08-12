# Overture - JBrowse2 Integration

This integration connects Overture's genomic data management platform with [JBrowse 2](https://jbrowse.org/jb2/) genome visualization functionality, specifically linear and circular viewers for BAM and VCF files.

![JbrowseIntegration](/jbrowse.png "jBrowse Integration")

> [!IMPORTANT]  
> Each tool integration requires unique data transformations and custom development approaches that limit the broad reusability of the platform. Learning from this body of work, we've transitioned to focusing on more flexible and broadly applicable API-driven approaches specifically standardized interfaces and client libraries (like Python)to give users greater tool choice, extensibility, and the ability to integrate their preferred solutions without platform-specific constraints.

## Quick Start

**Prerequisites**

- Docker installed and running
- Node.js and npm installed
- Internet connection required

> [!NOTE]  
> All prerequisites can be checked using the predeployment check command provided in the setup instructions below.

### Setup Instructions

1. **Clone the repository**

   ```bash
   git clone https://github.com/overture-stack/prelude.git -b jbrowse-demo
   cd prelude
   ```

2. **Run the predeployment check**

   ```bash
   make phase0
   ```

3. **Build the Stage service**

   ```bash
   cd apps/stage
   docker build -t stageimage:1.0 .
   cd ../..
   ```

4. **Start the demo environment**

   ```bash
   make demo
   ```

5. **Install Conductor CLI**

   ```bash
   cd apps/conductor
   npm install -g .
   cd ../..
   ```

6. **Load sample data**

   ```bash
   # Create study and upload schema
   conductor songCreateStudy -i demo
   conductor songUploadSchema -s ./apps/conductor/configs/songSchemas/song-schema.json

   # Submit sample genomic data
   conductor songSubmitAnalysis -a ./data/bam-metadata.json -i demo
   conductor songSubmitAnalysis -a ./data/vcf-metadata.json -i demo

   # Index the data for search
   conductor maestroIndex --repository-code song.overture
   ```

7. **Access JBrowse 2**

   Once the setup is complete, navigate to `http://localhost:3000` to explore the integrated JBrowse 2 interface with your Overture-managed genomic data.

### What's Included

- Sample BAM and VCF files for demonstration
- Pre-configured Overture services (Song, Maestro, Stage)
- JBrowse 2 instance embedded within the web portal UI

## Funding Acknowledgement

Overture is supported by grant #U24CA253529 from the National Cancer Institute at the US National Institutes of Health, and additional funding from Genome Canada, the Canada Foundation for Innovation, the Canadian Institutes of Health Research, Canarie, and the Ontario Institute for Cancer Research.
