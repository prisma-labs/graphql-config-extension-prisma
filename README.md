# graphql-config-extension-graphcool
Injects endpoints and headers into a GraphQL Config instance based on a given graphcool.yml

## Usage

```ts
import {patchEndpointsToConfig} from 'graphql-config-extension-graphcool'
import {getGraphQLConfig, GraphQLConfigData} from 'graphql-config'

const config: GraphQLConfigData = getGraphQLConfig().config
const patchedConfig: GraphQLConfigData = patchEndpointsToConfig(config, process.cwd())
```
