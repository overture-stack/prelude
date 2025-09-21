# Overture Search & Exploration Demo Portal

Welcome to our search and exploration demo environment! If you want to get started right away, skip to the next section. If you'd like to understand who we are and what this is about, check out the short clip below.

## Overture's Search and Exploration Architecture

We arbitrarily split our Overture platform across three main areas:

| Area                  | Component              | Function                     |
| --------------------- | ---------------------- | ---------------------------- |
| Submission & Download | Lectern                | Dictionary Management        |
|                       | Lyric                  | Tabular Submission           |
|                       | Song                   | File Metadata Management     |
|                       | Score                  | File Transfer                |
| Search & Exploration  | Arranger               | Search API & UI Components   |
|                       | Stage                  | Portal UI                    |
| Access Management     | KeyCloak (Third-Party) | Identity & Access Managment- |

This demo branch focuses on our search and exploration services, Arranger
and Stage. By running the demo you will have a local environment to use
our Arranger search components within our Stage portal UI.

TODO gif of moving through the interface

### Architecture

![Search & Exploration Architecture](/docs/images/search&exploration.png)

Arranger serves as the search API layer, interfacing with Elasticsearch to provide flexible querying capabilities, while Stage provides the user-facing portal interface with integrated Arranger search UI components.

This architecture can be extended with any persistent storage:

![Custom Build](/docs/images/platformintegration.png)

## Get Started

Clone this repository:

```
git clone https://github.com/overture-stack/prelude.git -b demo/exploration &&
cd prelude
```

Run our automated setup:

```
make demo
```

> [!NOTE]
> The demo environment will deploy locally using Docker on your computer. Our automated setup will do
> a system check on startup to make sure you have an appropriate version of Docker installed and have
> configured it with sufficient system resources. We've created a [support
> forum](https://github.com/overture-stack/docs/discussions/categories/support) - please post there if
> you need help.

> [!IMPORTANT]
> Windows Users: Please use WSL2 with a Bash terminal for all make commands. This setup is not supported on native Windows environments. See below for more details.

## Technical Details

All technical details are available in the `/docs` folder and can also be viewed from the portal documentation section.

## Configuring the Platform for Your Data

The main branch of this repository provides a comprehensive toolkit for integrating your data with our platform. This toolkit is called Prelude, an event that precedes and prepares for something more important.

Prelude's goal is to streamline platform development by streamline initial setup while preserving flexibility and choice. We provide automations and configuration generation scripts where needed, plus guided documentation within the resource to accommodate the diversity of data platform requirements.

For more informaiton check out [the main branch of this repository](https://github.com/overture-stack/prelude/)

## Windows Support

Prelude is designed to run in Linux/macOS environments. Windows users should:

1. Install [WSL2 (Windows Subsystem for Linux)](https://learn.microsoft.com/en-us/windows/wsl/install)
2. Use Ubuntu or another Linux distribution within WSL2
3. Run all Prelude commands from the Bash terminal in your WSL2 environment
4. Install Docker Desktop with WSL2 integration enabled

WSL2 provides a full Linux kernel and compatibility layer, allowing you to run Prelude's Linux commands without modification.

## Support

For assistance, reach out via the [community support channels](https://docs.overture.bio/community/support), for private inquiries email us at [contact@overture.bio](mailto:contact@overture.bio).
