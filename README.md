# Search & Exploration Demo

An interactive demo environment showcasing Overture's search and exploration services. This demo provides a local environment to explore Arranger search components within the Stage portal UI.

<p align="center">
   <img src="https://github.com/user-attachments/assets/32c5c20e-e786-4a2a-9e15-5aca3effe7a0" alt="Search & Explore Demo" width="800">
</p>

1. **Clone this repository:**

   ```bash
   git clone https://github.com/overture-stack/prelude.git -b demo/exploration &&
   cd prelude
   ```

2. **Run the automated setup:**
   ```bash
   make demo
   ```

> [!IMPORTANT]
> **Windows Users:** Use WSL2 with a Bash terminal for all make commands. This setup is not supported on native Windows environments. See the note below for more details.

## Architecture

The demo follows four main components:

1. **Demo Data ETL**: CSV files with demo data are processed by Conductor
2. **Indexing**: Data is indexed in Elasticsearch
3. **Querying**: Arranger queries Elasticsearch via GraphQL
4. **Portal UI**: Arranger search components in the Stage portal UI provide real-time filtering and exploration

![Search & Exploration Architecture](/apps/stage/public/docs/images/search&exploration.png)

### Custom Integrations

This architecture can be built on top of existing databases using a simple indexing script that extracts, transforms, and loads your data into Elasticsearch.

![Custom Build](/apps/stage/public/docs/images/platformintegration.png)

> [!NOTE]
> If you have any questions reach out via the [community support channels](https://docs.overture.bio/community/support) or email us at [contact@overture.bio](mailto:contact@overture.bio) we are happy to provide support.

## Windows Support

Prelude is designed for Linux/macOS environments. Windows users should use WSL2:

1. Install [WSL2 (Windows Subsystem for Linux)](https://learn.microsoft.com/en-us/windows/wsl/install)
2. Use Ubuntu or another Linux distribution within WSL2
3. Run all Prelude commands from the Bash terminal in your WSL2 environment
4. Install Docker Desktop with WSL2 integration enabled

WSL2 provides full Linux compatibility, allowing you to run Prelude without modification.

## Support

Questions? Reach out via our [community support channels](https://docs.overture.bio/community/support) or email us at [contact@overture.bio](mailto:contact@overture.bio).
