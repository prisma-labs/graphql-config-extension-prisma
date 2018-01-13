import { patchEndpointsToConfigData } from '../index'

async function run() {
  const config = {
    projects: {
      database: {
        extensions: {
          prisma: 'prisma.yml',
          graphcool: 'graphcool.yml',
        },
      },
    },
  } as any

  const newConfig = await patchEndpointsToConfigData(config, process.cwd())

  console.log(JSON.stringify(newConfig, null, 2))
}

run().catch(e => console.error(e))
