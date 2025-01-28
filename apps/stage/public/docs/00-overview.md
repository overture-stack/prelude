# Overview

Prelude is a tool that enables teams to incrementally build their data platform.
By breaking down data portal development into phased steps, teams can
systematically verify requirements and user workflows while minimizing technical
overhead.

This process enables teams to:

- Validate project requirements with hands-on testing
- Gain a clear understanding of user workflows and interactions
- Documented data management processes
- Define security and access control needs
- Build a solid foundation for production deployment planning

## Prelude Development Phases

Development progresses through four distinct phases, each building upon the
previous phase's foundation while introducing new capabilities.

| Phase                                              | Description                                                                                       | Software Components                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **PhaseOne:** Data Exploration & Theming           | Display your tabular data in a themable portal with our front-end and back-end search components. | CSV-processor, Elasticsearch, Arranger, Stage                                       |
| **PhaseTwo:** Tabular Data Management & Validation | Implementation of tabular data submission, storage and validation.                                | All the above with Lyric, LyricDb (Postgres), Lectern and LecternDb (MongoDb) added |
| **PhaseThree:** File Data & Metadata Management    | Implement back-end file management.                                                               | All the above with Song, Score, SongDb (Postgres) and Object Storage (Minio)        |
| **PhaseFour:** Identity and Access management      | Configure Keycloak to authenticate users and authorize what they have access too.                 | Empahsis on data access control planning and Keycloak configuration                 |
