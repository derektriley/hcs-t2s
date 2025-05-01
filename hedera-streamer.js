#!/usr/bin/env node

const {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId,
  Hbar,
  CustomFixedFee,
  CustomRoyaltyFee
} = require("@hashgraph/sdk");
require('dotenv').config();
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .command('create', 'Create a new topic with custom fee')
  .command('send', 'Send messages to an existing topic', {
    topicId: {
      description: 'Topic ID to send messages to',
      alias: 't',
      type: 'string',
      demandOption: true
    },
    count: {
      description: 'Number of messages to send',
      alias: 'c',
      type: 'number',
      default: 10
    },
    interval: {
      description: 'Interval between messages in milliseconds',
      alias: 'i',
      type: 'number',
      default: 1000
    }
  })
  .demandCommand(1, 'You need to specify a command: create or send')
  .help()
  .alias('help', 'h')
  .argv;

// Check for required environment variables
const requiredEnvVars = [
  'STREAMER_ACCOUNT_ID', 
  'STREAMER_PRIVATE_KEY',
  'VIEWER_ACCOUNT_ID',
  'VIEWER_PRIVATE_KEY',
  'HEDERA_NETWORK'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Error: Missing environment variables: ${missingVars.join(', ')}`);
  console.error('Please create a .env file with these variables.');
  process.exit(1);
}

// Get account info from environment variables
const streamerAccountId = AccountId.fromString(process.env.STREAMER_ACCOUNT_ID);
const streamerPrivateKey = PrivateKey.fromStringDer(process.env.STREAMER_PRIVATE_KEY);
const viewerAccountId = AccountId.fromString(process.env.VIEWER_ACCOUNT_ID);
const viewerPrivateKey = PrivateKey.fromStringDer(process.env.VIEWER_PRIVATE_KEY);

// Configure the client based on the network
let client;
const network = process.env.HEDERA_NETWORK.toLowerCase();

switch (network) {
  case 'mainnet':
    client = Client.forMainnet();
    break;
  case 'testnet':
    client = Client.forTestnet();
    break;
  case 'previewnet':
    client = Client.forPreviewnet();
    break;
  default:
    console.error(`Error: Unknown network: ${network}`);
    process.exit(1);
}


async function createTopic() {
  console.log("Creating a new topic with custom fee...");
  
  try {
    // Set the operator on the client
    const streamerClient = client.setOperator(streamerAccountId, streamerPrivateKey);
    // Create a custom fixed fee of 20 HBAR to be paid to the streamer account
    const customFee = new CustomFixedFee()
      .setHbarAmount(new Hbar(20))
      .setFeeCollectorAccountId(streamerAccountId);
    
    const transaction = new TopicCreateTransaction()
      .setAdminKey(streamerPrivateKey.publicKey)
      .setTopicMemo("Hedera TTS Demo")
      .setCustomFees([customFee]);
    
    const txResponse = await transaction.execute(streamerClient);
    const receipt = await txResponse.getReceipt(streamerClient);
    const topicId = receipt.topicId;
    
    console.log(`Topic created with ID: ${topicId.toString()}`);
    console.log(`Custom fee: 20 HBAR per submission, paid to ${streamerAccountId.toString()}`);
    return topicId.toString();
  } catch (error) {
    console.error("Error creating topic:", error);
    process.exit(1);
  }
}

async function submitMessage(topicId, messageNumber) {
  const viewerClient = client.setOperator(viewerAccountId, viewerPrivateKey);
  const message = {
    name: `Viewer ${messageNumber}`,
    message: `This is test message #${messageNumber} from the CLI streamer`
  };
  
  console.log(`Submitting message #${messageNumber} to topic ${topicId}...`);
  
  try {
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(JSON.stringify(message));
    
    const txResponse = await transaction.execute(viewerClient);
    const receipt = await txResponse.getReceipt(viewerClient);
    
    console.log(`Message #${messageNumber} submitted successfully (status: ${receipt.status})`);
  } catch (error) {
    console.error(`Error submitting message #${messageNumber}:`, error);
  }
}

async function sendMessages(topicId, count, interval) {
  console.log(`\nStarting message submission (${count} messages, ${interval}ms interval)...`);
  
  for (let i = 1; i <= count; i++) {
    await submitMessage(topicId, i);
    
    // Wait for the specified interval before sending the next message (except for the last one)
    if (i < count) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  console.log("\nAll messages submitted successfully!");
}

async function main() {
  console.log("Hedera Message Streamer CLI");
  console.log(`Network: ${network}`);
  console.log(`Streamer Account: ${streamerAccountId.toString()}`);
  console.log(`Viewer Account: ${viewerAccountId.toString()}`);
  
  const command = argv._[0];
  
  if (command === 'create') {
    // Create a new topic
    const topicId = await createTopic();
    console.log("\nTopic created successfully!");
    console.log(`Topic ID: ${topicId}`);
    console.log("You can use this Topic ID in your application to receive these messages.");
    console.log("\nTo send messages to this topic, run:");
    console.log(`  node hedera-streamer.js send -t ${topicId}`);
  } else if (command === 'send') {
    // Send messages to an existing topic
    const { topicId, count, interval } = argv;
    console.log(`Using existing topic: ${topicId}`);
    await sendMessages(topicId, count, interval);
  }
}

main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 