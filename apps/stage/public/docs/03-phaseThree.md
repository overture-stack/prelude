# PhaseTwo

Here we focus on implementing our back-end file management services which will
include the addition of Song, Score, SongDb (Postgres) and an Object Storage
provider (Minio).

![Image Title](/docs/images/phaseThree.png "PhaseThree Architecture Diagram")

| Added Software                                                           | Description                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [Score](https://docs.overture.bio/docs/core-software/Score/overview)     | Transfer file data to and from any S3 object storage                                             |
| [Song](https://docs.overture.bio/docs/core-software/song/overview/)      | Catalog and manage metadata associated to file data                                              |
| [Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview) | Organizes distributed data into a centralized Elasticsearch index, automatically, on publication |
| SongDB (Postgres)                                                        | Database used by Song to store metadata and manage file information                              |
| Minio                                                                    | Open source S3-compatible object storage used locally for development and testing                |
