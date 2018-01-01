import {
  GraphQLConfig,
  GraphQLConfigData,
  GraphQLConfigEnpointsData,
  GraphQLProjectConfig,
} from 'graphql-config'
import {
  GraphcoolDefinitionClass,
  Environment,
  ClusterCache,
} from 'graphcool-yml'
import { set, values } from 'lodash'
import * as os from 'os'
import * as path from 'path'

export async function patchEndpointsToConfig<
  T extends GraphQLConfig | GraphQLProjectConfig
>(config: T, cwd?: string, envVars?: { [key: string]: any }): Promise<T> {
  config.config = await patchEndpointsToConfigData(config.config, cwd, envVars)
  return config
}

export async function patchEndpointsToConfigData(
  config: GraphQLConfigData,
  cwd?: string,
  envVars?: { [key: string]: any },
): Promise<GraphQLConfigData> {
  // return early if no graphcool extension found
  const allExtensions = [
    config.extensions,
    ...values(config.projects).map(p => p.extensions),
  ]
  if (!allExtensions.some(e => e && e.graphcool)) {
    return config
  }

  const newConfig = { ...config }

  const home = os.homedir()

  const globalClusterCachePath = path.join(home, '.graphcool/cache.yml')
  const cache = new ClusterCache(globalClusterCachePath)

  const globalConfigPath = path.join(home, '.graphcool/config.yml')
  const env = new Environment(globalConfigPath)
  await env.load({})

  if (newConfig.extensions && newConfig.extensions.graphcool) {
    set(
      newConfig,
      ['extensions', 'endpoints'],
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
  envVars?: { [key: string]: any },
): Promise<GraphQLConfigEnpointsData> {
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
