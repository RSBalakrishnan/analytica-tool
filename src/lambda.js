const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app');

let serverlessExpressInstance;

async function setup(event, context) {
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

exports.handler = (event, context) => {
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }

  return setup(event, context);
};
