# Phase2

Here we will focus on implementing our back-end tabular data management services
which will include the addition of Lyric, Lectern, LyricDb (Postgres) and a
LecternDb (MongoDb).

![Image Title](/docs/images/phase2.png 'Phase2 Architecture Diagram')

| Added Software                                                           | Description                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Lyric](https://docs.overture.bio/docs/under-development/lyric/)         | Lyric is a tabular data management service designed to handle structured clinical and research data. Built on top of Lectern's dictionary framework, it provides a system for organizations to submit, validate, and manage structured data according to predefined schemas.                        |
| [Lectern](https://docs.overture.bio/docs/under-development/lectern/)     | Data dictionaries are collections of schemas that define the structure of tabular data files (like CSV). This application provides functionality to validate the structure of data dictionaries, maintain a list of dictionary versions, and to compute the difference between dictionary versions. |
| [Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview) | Organizes distributed data into a centralized Elasticsearch index, automatically, on publication.                                                                                                                                                                                                   |
| LecternDB (MongoDb)                                                      | Database used by Lectern to store its schemas.                                                                                                                                                                                                                                                      |
| LyricDb (Postgres)                                                       | Database used by Lyric to store its tabular data.                                                                                                                                                                                                                                                   |
