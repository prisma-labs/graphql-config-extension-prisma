# graphql-config-extension-graphcool
Injects endpoints and headers into a GraphQL Config instance based on a given graphcool.yml

## Usage

```ts
import {patchEndpointsToConfig} from 'graphql-config-extension-graphcool'
import {getGraphQLConfig} from 'graphql-config'

const config = getGraphQLConfig().config
const patchedConfig = patchEndpointsToConfig(config, process.cwd())
```
