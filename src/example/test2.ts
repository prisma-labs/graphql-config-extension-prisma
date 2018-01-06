import { patchEndpointsToConfigData } from '../index'

const config = {
  projects: {
    app: {
      schemaPath: 'src/schema.graphql',
      extensions: {
        endpoints: {
          default: 'http://localhost:4000',
        },
      },
    },
    database: {
      schemaPath: 'src/generated/database.graphql',
      extensions: {
        graphcool: 'graphcool.yml',
      },
    },
  },
}

const cwd = '/Users/tim/code/nilan'

const envVars = {
  npm_package_version: '',
  NODE_ENV: 'dev',
  GRAPHCOOL_STAGE: 'dev',
  GRAPHCOOL_CLUSTER: 'local',
  GRAPHCOOL_ENDPOINT: 'http://localhost:60000/nilan/dev',
  GRAPHCOOL_SECRET: 'mysecret123',
  APP_SECRET: 'jwtsecret123',
}

async function run() {
  const newConfig = await patchEndpointsToConfigData(
    config as any,
    cwd,
    envVars,
  )

  console.log(JSON.stringify(newConfig, null, 2))
}

run().catch(e => console.error(e))
