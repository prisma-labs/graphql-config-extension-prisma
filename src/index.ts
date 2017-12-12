import { GraphQLConfigData, GraphQLConfigEnpointsData } from 'graphql-config'
import { GraphQLProjectConfig } from 'graphql-config/lib/GraphQLProjectConfig'
import { GraphcoolDefinitionClass, Environment } from 'graphcool-yml'
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
  const env = new Environment(path.join(os.homedir(), '.graphcoolrc'))
  await env.load({})
  if (newConfig.extensions && newConfig.extensions.graphcool) {
    newConfig = merge(
      await getEndpointsFromPath(env, newConfig.extensions.graphcool, cwd),
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
  envVars?: any,
) {
  const joinedYmlPath = cwd ? path.join(cwd, ymlPath) : ymlPath
  const definition = new GraphcoolDefinitionClass(env, joinedYmlPath, envVars)
  await definition.load({})
  return Object.keys(definition.rawStages)
    .filter(s => s !== 'default')
    .reduce((acc, stageName) => {
      const value = definition.rawStages[stageName]
      const cluster = env.clusterByName(value)
      if (cluster) {
        const url = cluster.getApiEndpoint(
          definition.definition!.service!,
          stageName,
        )
        const token = definition.getToken(
          definition.definition!.service,
          stageName,
        )
        const headers = token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined
        return {
          ...acc,
          [stageName]: {
            url,
            headers,
          },
        }
      }

      return acc
    }, {})
}
