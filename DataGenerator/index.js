const fs = require('fs');
const solace = require('solclientjs').debug; // Assuming Solace is installed
const asyncapi = require('@asyncapi/parser'); // Assuming AsyncAPI is installed
const jsf = require('json-schema-faker');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node generator.js asyncapi.yaml');
    return;
  }

  const asyncapiFile = args[0];
  const asyncapiObject = await asyncapi.parse(fs.readFileSync(asyncapiFile, 'utf8'));
  console.log(asyncapiObject.components.schemas);
  const topics = asyncapiObject.channelNames(); // Get all the channel names from the AsyncAPI file
  const schemas = asyncapiObject.components.schemas; // Get all the schemas from the AsyncAPI file

  // Solace initialization
  solace.SolclientFactory.init();

  // Solace connection and session creation
  const factoryProps = new solace.SolclientFactoryProperties();
  factoryProps.profile = solace.SolclientFactoryProfiles.version10;
  const solaceFactory = solace.SolclientFactory.createFactory(factoryProps);
  
  // create a Solace session for publishing messages
  const sessionProps = new solace.SessionProperties();
  sessionProps.url = 'ws://localhost:219'; // replace with your Solace message router host and port
  sessionProps.vpnName = 'default'; // replace with your Solace VPN name
  sessionProps.userName = 'default'; // replace with your Solace username
  sessionProps.password = 'default'; // replace with your Solace password

  const session = solace.SolclientFactory.createSession(sessionProps, new solace.MessageRxCBInfo((session, message) => {
    console.log(`Received message: ${message.getBinaryAttachment()}`);
  }));

  // Connect to Solace
  session.connect();

  // Publish a message to a random topic every second
  setInterval(() => {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const message = solace.SolclientFactory.createMessage();
    message.setBinaryAttachment('message-payload');
    message.setDestination(solace.SolclientFactory.createTopic(topic));
    session.send(message);
  }, 1000);
}

main();