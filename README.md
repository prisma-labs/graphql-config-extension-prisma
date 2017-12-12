# graphql-config-extension-graphcool
Injects endpoints and headers into a GraphQL Config instance based on a given graphcool.yml

## Usage in `.graphqlconfig.yml`
```yml
projects:
  database:
    extensions:
      graphcool: graphcool.yml
```

## Usage in Node.js

```ts
import {patchEndpointsToConfig} from 'graphql-config-extension-graphcool'
import {getGraphQLConfig, GraphQLConfigData} from 'graphql-config'

const config: GraphQLConfigData = getGraphQLConfig().config
const patchedConfig: GraphQLConfigData = patchEndpointsToConfig(config, process.cwd())
```
