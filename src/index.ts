import {
  GraphQLConfig,
  GraphQLConfigData,
  GraphQLConfigEnpointsData,
  GraphQLProjectConfig,
} from 'graphql-config'
import { PrismaDefinitionClass, Environment } from 'prisma-yml'
import { set, values } from 'lodash'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

export async function patchConfig<
T extends GraphQLConfig | GraphQLProjectConfig
>(config: T, cwd?: string, envVars?: { [key: string]: any }): Promise<T> {
  config = await patchEndpointsToConfig(config, cwd, envVars)
  config = patchDirectivesToConfig(config, cwd, envVars)
  return config
}

function patchDirectivesToConfig<
T extends GraphQLConfig | GraphQLProjectConfig
>(config: T, cwd?: string, envVars?: { [key: string]: any }): T {
  config.config = patchDirectivesToConfigData(config.config, cwd, envVars)
  return config
}

function patchDirectivesToConfigData(
  config: GraphQLConfigData,
  cwd?: string,
  envVars?: { [key: string]: any },
): GraphQLConfigData {
  // return early if no prisma extension found
  const allExtensions = [
    config.extensions,
    ...values(config.projects).map(p => p.extensions),
  ]
  if (!allExtensions.some(e => e && e.prisma)) {
    return config
  }
  
  const newConfig = { ...config }

  if (newConfig.extensions) {
    set(
      newConfig,
      ['extensions', 'customDirectives'],
      getCustomDirectives(),
    )
  }

  if (newConfig.projects) {
    Object.keys(newConfig.projects).map(projectName => {
      const project = newConfig.projects![projectName]
      if (project.extensions) {
        set(
          newConfig,
          ['projects', projectName, 'extensions', 'customDirectives'],
          getCustomDirectives()
        )
      }
    })
  }

  return newConfig
}

export function getCustomDirectives(version?: string) {
  return [
    'enum DeleteValues { CASCADE SET_NULL }',
    'directive @default(value: Any!) on FIELD_DEFINITION | SCALAR',
    'directive @relation(name: String!, onDelete: DeleteValues!) on FIELD_DEFINITION | SCALAR',
    'directive @unique on FIELD_DEFINITION | SCALAR',
    'directive @pgRelation(column: String!) on FIELD_DEFINITION | SCALAR',
    'directive @pgRelationTable(table: String!, relationColumn: String!, targetColumn: String!) on FIELD_DEFINITION | SCALAR',
    'directive @pgTable(name: String!) on FIELD_DEFINITION | SCALAR',
    'directive @pgColumn(name: String!) on FIELD_DEFINITION | SCALAR',
    'directive @pgDefault(value: Any!) on FIELD_DEFINITION | SCALAR'
  ];
}


// TODO: Deprecate and remove this public API in favor 
// of patchConfig function in playground and other usages 
// of this project. 
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
  // return early if no prisma extension found
  const allExtensions = [
    config.extensions,
    ...values(config.projects).map(p => p.extensions),
  ]
  if (!allExtensions.some(e => e && e.prisma)) {
    return config
  }

  const newConfig = { ...config }

  const home = os.homedir()

  const env = new Environment(home)
  await env.load({})

  if (newConfig.extensions && newConfig.extensions.prisma) {
    set(
      newConfig,
      ['extensions', 'endpoints'],
      await getEndpointsFromPath(
        env,
        newConfig.extensions.prisma,
        cwd,
        envVars,
      ),
    )
  }

  if (newConfig.projects) {
    await Promise.all(
      Object.keys(newConfig.projects).map(async projectName => {
        const project = newConfig.projects![projectName]
        if (project.extensions && project.extensions.prisma) {
          set(
            newConfig,
            ['projects', projectName, 'extensions', 'endpoints'],
            await getEndpointsFromPath(
              env,
              project.extensions.prisma,
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

export async function makeConfigFromPath(
  cwd: string = process.cwd(),
  envVars?: { [key: string]: any },
): Promise<GraphQLConfig | null> {
  const ymlPath = path.join(cwd, 'prisma.yml')
  if (!fs.existsSync(ymlPath)) {
    return null
  }

  const home = os.homedir()
  const env = new Environment(home)
  await env.load({})

  const definition = new PrismaDefinitionClass(env, ymlPath, envVars)
  await definition.load({})
  const serviceName = definition.service!
  const stage = definition.stage!
  const clusterName = definition.cluster
  if (!clusterName) {
    throw new Error(
      `No cluster set. Please set the "cluster" property in your prisma.yml`,
    )
  }
  const cluster = definition.getCluster()
  if (!cluster) {
    throw new Error(
      `Cluster ${clusterName} provided in prisma.yml could not be found in global ~/.prisma/config.yml.
Please check in ~/.prisma/config.yml, if the cluster exists.
You can use \`docker-compose up -d\` to start a new cluster.`,
    )
  }
  const url = cluster.getApiEndpoint(
    serviceName,
    stage,
    definition.getWorkspace() || undefined,
  )
  const token = definition.getToken(serviceName, stage)
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined

  const data = {
    schemaPath: '',
    projects: {
      [serviceName]: {
        schemaPath: '',
        extensions: {
          endpoints: {
            [stage]: {
              url,
              headers,
            },
          },
        },
      },
    },
  }

  return new GraphQLConfig(data, '')
}

async function getEndpointsFromPath(
  env: Environment,
  ymlPath: string,
  cwd?: string,
  envVars?: { [key: string]: any },
): Promise<GraphQLConfigEnpointsData> {
  const joinedYmlPath = cwd ? path.join(cwd, ymlPath) : ymlPath
  const definition = new PrismaDefinitionClass(env, joinedYmlPath, envVars)
  await definition.load({})
  const serviceName = definition.service!
  const stage = definition.stage!
  const clusterName = definition.cluster
  if (!clusterName) {
    throw new Error(
      `No cluster set. Please set the "cluster" property in your prisma.yml`,
    )
  }
  const cluster = definition.getCluster()
  if (!cluster) {
    throw new Error(
      `Cluster ${clusterName} provided in prisma.yml could not be found in global ~/.prisma/config.yml.
Please check in ~/.prisma/config.yml, if the cluster exists.
You can use \`docker-compose up -d\` to start a new cluster.`,
    )
  }
  const url = cluster.getApiEndpoint(
    serviceName,
    stage,
    definition.getWorkspace() || undefined,
  )
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
