import {
  GraphQLConfig,
  GraphQLConfigData,
  GraphQLConfigEnpointsData,
  GraphQLProjectConfig,
} from 'graphql-config'
import { GraphcoolDefinitionClass, Environment } from 'graphcool-yml'
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

  const env = new Environment(home)
  await env.load({})

  if (newConfig.extensions && newConfig.extensions.graphcool) {
    set(
      newConfig,
      ['extensions', 'endpoints'],
      await getEndpointsFromPath(
        env,
        newConfig.extensions.graphcool,
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
  cwd?: string,
  envVars?: { [key: string]: any },
): Promise<GraphQLConfigEnpointsData> {
  const joinedYmlPath = cwd ? path.join(cwd, ymlPath) : ymlPath
  const definition = new GraphcoolDefinitionClass(env, joinedYmlPath, envVars)
  await definition.load({})
  const serviceName = definition.definition!.service
  const stage = definition.definition!.stage
  const clusterName = definition.definition!.cluster
  if (!clusterName) {
    throw new Error(
      `No cluster set. Please set the "cluster" property in your graphcool.yml`,
    )
  }
  const cluster = definition.getCluster()
  if (!cluster) {
    throw new Error(
      `Cluster ${clusterName} provided in graphcool.yml could not be found in global ~/.graphcoolrc.
Please check in ~/.graphcoolrc under 'graphcool-1.0', if the cluster exists.
You can use \`graphcool local start\` to start a new cluster.`,
    )
  }
  const url = cluster.getApiEndpoint(serviceName, stage, definition.getWorkspace() || undefined)
  const token = definition.getToken(serviceName, stage)
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined
  return {
    [stage]: {
      url,
      headers,
    },
  }
}
