import { patchEndpointsToConfig } from '../index'

async function run() {
  const config = {
    projects: {
      database: {
        extensions: {
          graphcool: 'graphcool.yml',
        },
      },
    },
  } as any

  const newConfig = await patchEndpointsToConfig(config, process.cwd())

  console.log(JSON.stringify(newConfig, null, 2))
}

run().catch(e => console.error(e))
