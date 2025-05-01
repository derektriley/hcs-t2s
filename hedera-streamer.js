#!/usr/bin/env node

const {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId,
  Hbar,
  CustomFixedFee,
  CustomRoyaltyFee,
  TopicId,
  TransferTransaction
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
  .command('transfer', 'Send HBAR from streamer to viewer account', {
    amount: {
      description: 'Amount of HBAR to transfer',
      alias: 'a',
      type: 'number',
      demandOption: true
    }
  })
  .demandCommand(1, 'You need to specify a command: create, send, or transfer')
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

// Humorous crypto-related streamer names
const humorousStreamers = [
  "HODLHarold",
  "SatoshisSister",
  "DiamondHands42",
  "CryptoClown",
  "BlockchainBarbarian",
  "TokenTosser",
  "GasFeeGuru",
  "MoonboySam",
  "LamboLarry",
  "DeFiDiva",
  "WhaleWatcher",
  "RektRambler",
  "HashRateHero",
  "NFTNerd",
  "DumpDetective",
  "StablecoinSage",
  "MinerMike",
  "AltcoinAlice",
  "RugPullRanger",
  "FOMOFighter"
];

// Humorous crypto-related messages
const humorousMessages = [
  "Just mortgaged my house to buy the dip. Wife still doesn't know. Bullish!",
  "My portfolio is so red it's giving tomatoes an inferiority complex.",
  "Who needs a retirement plan when you've got 69 different altcoins?",
  "I told my kids that blockchain is like a digital cookie jar where everyone can see how many cookies there are, but nobody can steal them.",
  "My crypto strategy: buy high, sell low, cry in the shower.",
  "I'm so bullish on this coin that I've started eating grass.",
  "My wife asked what NFT stands for. I told her 'Not For Traders' who can't handle volatility.",
  "I don't always HODL, but when I do, I panic sell right before a 500% pump.",
  "Dear Bitcoin, my therapist says it's not healthy how often I check on you.",
  "Investing strategy: one part technical analysis, two parts astrology, three parts blind hope.",
  "They say diversify your portfolio, so I own 28 coins that all do exactly the same thing.",
  "My dog chewed up my hardware wallet. Now he's worth more than my car.",
  "I'm so deep into DeFi that my credit score is just my wallet address.",
  "My boyfriend dumped me for checking crypto prices during our anniversary dinner. Anyway, looking for someone who appreciates financial independence.",
  "I named my Wi-Fi 'SEC Investigation Van' just to scare my crypto neighbors.",
  "I'm on a seafood diet with crypto: I see a dip, I buy it.",
  "Told my boss I'm quitting when Bitcoin reaches 100k. It's been 3 years and I still have this job.",
  "My crypto portfolio is like my dating life: high expectations, disappointing results.",
  "I don't need a gym membership, I get plenty of exercise jumping to conclusions about price movements.",
  "I've got diamond hands but a paper wallet. What could go wrong?"
];

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
  
  // Select a random name and message
  const randomNameIndex = Math.floor(Math.random() * humorousStreamers.length);
  const randomMessageIndex = Math.floor(Math.random() * humorousMessages.length);
  
  const message = {
    name: humorousStreamers[randomNameIndex],
    message: humorousMessages[randomMessageIndex]
  };
  
  console.log(`Submitting message #${messageNumber} from ${message.name} to topic ${topicId}...`);
  console.log(`Message: "${message.message}"`);
  
  try {
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
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

async function transferHbar(amount) {
  console.log(`Transferring ${amount} HBAR from streamer to viewer account...`);
  
  try {
    const streamerClient = client.setOperator(streamerAccountId, streamerPrivateKey);
    
    const transaction = new TransferTransaction()
      .addHbarTransfer(streamerAccountId, new Hbar(-amount)) // Subtract from streamer
      .addHbarTransfer(viewerAccountId, new Hbar(amount))    // Add to viewer
      .setTransactionMemo("HCS TTS HBAR transfer");
    
    const txResponse = await transaction.execute(streamerClient);
    const receipt = await txResponse.getReceipt(streamerClient);
    
    console.log(`Transfer successful! Transaction ID: ${txResponse.transactionId.toString()}`);
    console.log(`Status: ${receipt.status}`);
  } catch (error) {
    console.error("Error transferring HBAR:", error);
    process.exit(1);
  }
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
  } else if (command === 'transfer') {
    // Transfer HBAR from streamer to viewer
    const { amount } = argv;
    await transferHbar(amount);
  }
}

main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 