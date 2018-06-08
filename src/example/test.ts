import { patchConfig } from '../index'

test('patches endpoints and directives (to all projects if one of them has prisma) to config', async () => {
  expect.assertions(1);
  const config = {
    config: {
      projects: {
        app: {
          extensions: {}
        },
        database: {
          extensions: {
            prisma: 'prisma.yml',
            graphcool: 'graphcool.yml',
          },
        },
      },
    }
  } as any
  const newConfig = await patchConfig(config, `${__dirname}`);
  expect(newConfig).toMatchSnapshot();
});