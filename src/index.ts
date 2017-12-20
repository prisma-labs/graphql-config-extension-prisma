import { GraphQLConfigData, GraphQLConfigEnpointsData } from 'graphql-config'
import { GraphQLProjectConfig } from 'graphql-config/lib/GraphQLProjectConfig'
import {
  GraphcoolDefinitionClass,
  Environment,
  ClusterCache,
} from 'graphcool-yml'
import { merge, set } from 'lodash'
import * as os from 'os'
import * as path from 'path'

export async function patchEndpointsToConfig(
  config: GraphQLConfigData,
  cwd?: string,
  envVars?: any,
): Promise<GraphQLConfigData> {
  // let the show begin ...
  let newConfig = { ...config }
  const home = os.homedir()
  const globalGraphcoolPath = path.join(home, '.graphcool/')
  const globalConfigPath = path.join(home, '.graphcool/config.yml')
  const globalClusterCachePath = path.join(home, '.graphcool/cache.yml')
  const env = new Environment(globalConfigPath)
  const cache = new ClusterCache(globalClusterCachePath)
  await env.load({})
  if (newConfig.extensions && newConfig.extensions.graphcool) {
    newConfig = merge(
      await getEndpointsFromPath(
        env,
        newConfig.extensions.graphcool,
        cache,
        cwd,
        envVars,
      ),
    )
  }

  if (newConfig.projects) {
    await Promise.all(
      Object.keys(newConfig.projects).map(async projectName => {
        const project = newConfig.projects![projectName]
        if (project.extensions && project.extensions.graphcool) {
          set(
            newConfig,
            ['projects', projectName, 'extensions', 'endpoints'],
            await getEndpointsFromPath(
              env,
              project.extensions.graphcool,
              cache,
              cwd,
              envVars,
            ),
          )
        }
      }),
    )
  }

  return newConfig
}

async function getEndpointsFromPath(
  env: Environment,
  ymlPath: string,
  cache: ClusterCache,
  cwd?: string,
  envVars?: any,
) {
  const joinedYmlPath = cwd ? path.join(cwd, ymlPath) : ymlPath
  const definition = new GraphcoolDefinitionClass(env, joinedYmlPath, envVars)
  await definition.load({})
  const serviceName = definition.definition!.service
  let entries = cache.getEntriesByService(serviceName)
  if (envVars && envVars.GRAPHCOOL_STAGE) {
    entries = entries.filter(entry => entry.stage === envVars.GRAPHCOOL_STAGE)
  }
  return entries.reduce((acc, entry) => {
    const cluster = env.clusterByName(entry.cluster)
    if (cluster) {
      const url = cluster.getApiEndpoint(
        definition.definition!.service!,
        entry.stage,
      )
      const token = definition.getToken(
        definition.definition!.service,
        entry.stage,
      )
      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined
      return {
        ...acc,
        [entry.stage]: {
          url,
          headers,
        },
      }
    }

    return acc
  }, {})
}
