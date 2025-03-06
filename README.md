# Conductor

Conductor is a flexible Docker Compose setup that simplifies the process of spinning up Overture development and deployment configurations using Docker profiles and extensible scripting events.

> <div>
> <img align="left" src="ov-logo.png" height="50"/>
> </div>
>
> Conductor is part of [Overture](https://www.overture.bio/), a collection of open-source software microservices used to create platforms for researchers to organize and share genomics data.\*

## Documentation

Technical resources for those working with or contributing to the project are available from our official documentation site, the following content can also be read and updated within the `/docs` folder of this repository.

- **[Getting Started](https://docs.overture.bio/guides/getting-started#overture-platform-quick-start)**
- **[Conductor Documentation](https://docs.overture.bio/docs/other-software/conductor/)**

## Requirements

- [Docker Version 4.39.0+](https://www.docker.com/products/docker-desktop/)

> [!NOTE]
> Docker needs to be allocated with sufficient resources:
>
> - Minimum CPU: 8 cores
> - Memory: 8 GB
> - Swap: 2 GB
> - Virtual disk: 64 GB
>
> Adjust these in Docker Desktop settings under "Resources".

## Support & Contributions

- For support, feature requests, and bug reports, please see our [Support Guide](https://docs.overture.bio/community/support).

- For detailed information on how to contribute to this project, please see our [Contributing Guide](https://docs.overture.bio/docs/contribution).

## Related Software

The Overture Platform includes the following Overture Components:

</br>

| Software                                                | Description                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Score](https://github.com/overture-stack/score/)       | Transfer data to and from any cloud-based storage system                                  |
| [Song](https://github.com/overture-stack/song/)         | Catalog and manage metadata associated to file data spread across cloud storage systems   |
| [Maestro](https://github.com/overture-stack/maestro/)   | Organizing your distributed data into a centralized Elasticsearch index                   |
| [Arranger](https://github.com/overture-stack/arranger/) | A search API with reusable search UI components                                           |
| [Stage](https://github.com/overture-stack/stage)        | A React-based web portal scaffolding                                                      |
| [Lyric](https://github.com/overture-stack/lyric)        | A model-agnostic, tabular data submission system                                          |
| [Lectern](https://github.com/overture-stack/lectern)    | Schema Manager, designed to validate, store, and manage collections of data dictionaries. |

If you'd like to get started using our platform [check out our quickstart guides](https://docs.overture.bio/guides/getting-started)

## Funding Acknowledgement

Overture is supported by grant #U24CA253529 from the National Cancer Institute at the US National Institutes of Health, and additional funding from Genome Canada, the Canada Foundation for Innovation, the Canadian Institutes of Health Research, Canarie, and the Ontario Institute for Cancer Research.
