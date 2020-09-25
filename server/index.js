import Hapi from '@hapi/hapi';
import fetch from 'node-fetch'

const init = async () => {
    const server = Hapi.server({
        port: 3500,
        host: 'localhost'
    });

    server.route({
      method: 'GET',
      path: '/diff',
      handler: async (request, h) => {
          const response = await fetch(request.query.url);
          return await response.text();
      }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();