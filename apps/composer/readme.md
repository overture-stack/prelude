## Repository Structure

```
conductor/apps/composer/
│
├── src/ # Source code directory
│ ├── cli/ # Command-line interface components
│ │ ├── environment.ts
│ │ ├── index.ts
│ │ ├── options.ts
│ │ ├── profiles.ts
│ │ └── validation.ts
│ │
│ ├── commands/ # Application commands
│ │ ├── Commandfactory.ts
│ │ ├── arrangerCommand.ts
│ │ ├── baseCommand.ts
│ │ ├── dictionaryCommand.ts
│ │ ├── mappingCommands.ts
│ │ └── songCommand.ts
│ │
│ ├── services/ # Business logic services
│ │ ├── generateArrangerConfigs.ts
│ │ ├── generateEsMappingFromCSV.ts
│ │ ├── generateEsMappingFromJSON.ts
│ │ ├── generateLecternDictionary.ts
│ │ └── generateSongSchema.ts
│ │
│ ├── types/ # TypeScript type definitions
│ │ ├── arranger.ts
│ │ ├── cli.ts
│ │ ├── constants.ts
│ │ ├── elasticsearch.ts
│ │ ├── index.ts
│ │ ├── lectern.ts
│ │ ├── song.ts
│ │ └── validations.ts
│ │
│ ├── utils/ # Utility functions
│ │ ├── csvParser.ts
│ │ └── errors.ts
│ │
│ └── validations/ # Validation utilities
│ ├── csvValidator.ts
│ ├── enviromentValidator.ts
│ ├── fileValidator.ts
│ └── index.ts
│
├── tests/ # Test directory
│ ├── **fixtures**/ # Test fixture data
│ │ ├── mapping.json
│ │ ├── metadata.json
│ │ ├── output
│ │ └── sample.csv
│ │
│ └── **tests**/ # Test cases
│ ├── commands
│ └── setup.ts
│
├── dist/ # Compiled output directory
├── node_modules/ # Dependency packages
├── README.md
├── package.json
├── package-lock.json
└── tsconfig.json
```

### Key Components

- **CLI**: Handles command-line interface logic and validation
- **Commands**: Defines various application commands like arranger, dictionary, and mapping
- **Services**: Provides core logic for generating configurations and mappings
- **Types**: Contains TypeScript type definitions
- **Utils**: Global Utility functions, including CSV parsing
- **Validations**: Validation logic for CSV, environment, and file operations

### Test Structure

- \***\*fixtures\*\***: Contains sample data and test resources
- \***\*tests\*\***: Includes test cases and setup configurations
