import { patchConfig, getCustomDirectives } from '../index'

test('patches endpoints and directives to config', async () => {
  expect.assertions(1);
  const config = {
    config: {
      projects: {
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
  expect(newConfig).toEqual({
    config: {
      projects: {
        database: {
          extensions: {
            prisma: 'prisma.yml',
            graphcool: 'graphcool.yml',
            endpoints: {
              dev: {
                headers: undefined,
                url: "https://eu1.prisma.sh/public-asd/n/dev"
              }
            },
            customDirectives: getCustomDirectives()
          },
        },
      },
    }
  });
});