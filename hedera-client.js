const {
  Client,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  TopicCreateTransaction,
  Wallet,
  PrivateKey,
  AccountId
} = require("@hashgraph/sdk");

class HederaClient {
  constructor() {
    this.client = null;
    this.topicId = null;
    this.accountId = null;
    this.privateKey = null;
    this.listeners = [];
    this.mirrorNodeUrl = null;
  }

  // Initialize client with credentials (optional for read-only operations)
  init(accountId, privateKey, network = "testnet", topicId = null, customEndpoint = null) {
    try {
      this.topicId = topicId;
      
      // Create client based on network
      if (customEndpoint) {
        // Use custom/solo network
        const [host, port] = customEndpoint.split(':');
        
        console.log(`Using custom Hedera network at ${host}:${port}`);
        
        // For read-only operations, we don't need credentials
        if (accountId && privateKey) {
          this.accountId = accountId;
          this.privateKey = privateKey;
          
          this.client = Client.forNetwork({
            [host]: new AccountId(accountId).shard.toString() + "." + new AccountId(accountId).realm.toString()
          });
          
          // Set operator with account ID and private key
          this.client.setOperator(accountId, privateKey);
        } else {
          // Create a client for mirror node access only (read-only)
          this.client = Client.forName(network);
          console.log("No credentials provided. Client will be limited to read-only operations.");
        }
        
        // Set custom mirror node address
        const mirrorPort = port || 5600;
        this.mirrorNodeUrl = `${host}:${mirrorPort}`;
        this.client.setMirrorNetwork([this.mirrorNodeUrl]);
        
      } else if (network === "testnet") {
        this.client = Client.forTestnet();
        if (accountId && privateKey) {
          this.accountId = accountId;
          this.privateKey = privateKey;
          this.client.setOperator(accountId, privateKey);
        } else {
          console.log("No credentials provided. Client will be limited to read-only operations.");
        }
      } else if (network === "mainnet") {
        this.client = Client.forMainnet();
        if (accountId && privateKey) {
          this.accountId = accountId;
          this.privateKey = privateKey;
          this.client.setOperator(accountId, privateKey);
        } else {
          console.log("No credentials provided. Client will be limited to read-only operations.");
        }
      } else if (network === "previewnet") {
        this.client = Client.forPreviewnet();
        if (accountId && privateKey) {
          this.accountId = accountId;
          this.privateKey = privateKey;
          this.client.setOperator(accountId, privateKey);
        } else {
          console.log("No credentials provided. Client will be limited to read-only operations.");
        }
      } else {
        throw new Error("Invalid network specified");
      }

      console.log(`Initialized Hedera client for ${customEndpoint ? 'custom network' : network}`);
      if (accountId) {
        console.log(`Using account ID: ${accountId}`);
      }
      if (topicId) {
        console.log(`Using topic ID: ${topicId}`);
      }

      return true;
    } catch (error) {
      console.error("Error initializing Hedera client:", error);
      return false;
    }
  }

  // Create a new topic (requires credentials)
  async createTopic() {
    if (!this.accountId || !this.privateKey) {
      console.error("Cannot create topic: No credentials provided");
      return null;
    }
    
    try {
      const transaction = new TopicCreateTransaction();
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      this.topicId = receipt.topicId;
      console.log(`Created topic with ID: ${this.topicId}`);
      return this.topicId;
    } catch (error) {
      console.error("Error creating topic:", error);
      return null;
    }
  }

  // Submit a message to the topic (requires credentials)
  async submitMessage(message) {
    if (!this.topicId) {
      console.error("No topic ID specified");
      return false;
    }
    
    if (!this.accountId || !this.privateKey) {
      console.error("Cannot submit message: No credentials provided");
      return false;
    }

    try {
      const messageObject = typeof message === 'object' ? 
        JSON.stringify(message) : message.toString();
      
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(this.topicId)
        .setMessage(messageObject);
      
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      console.log(`Message submitted successfully: ${receipt.status}`);
      return true;
    } catch (error) {
      console.error("Error submitting message:", error);
      return false;
    }
  }

  // Subscribe to a topic and listen for messages (no credentials required)
  subscribeToTopic(callback) {
    if (!this.topicId) {
      console.error("No topic ID specified");
      return false;
    }

    try {
      console.log(`Subscribing to topic: ${this.topicId}`);
      
      const messageQuery = new TopicMessageQuery()
        .setTopicId(this.topicId)
        .subscribe(this.client, (message) => {
          const messageAsString = Buffer.from(message.contents).toString();
          let parsedMessage;
          
          try {
            parsedMessage = JSON.parse(messageAsString);
          } catch (e) {
            parsedMessage = messageAsString;
          }
          
          console.log(`Received message from topic: ${message.consensusTimestamp.toString()}`);
          callback(parsedMessage);
        });
      
      this.listeners.push(messageQuery);
      return true;
    } catch (error) {
      console.error("Error subscribing to topic:", error);
      return false;
    }
  }

  // Stop listening to all topics
  unsubscribeAll() {
    try {
      this.listeners.forEach(listener => {
        if (listener.subscriber) {
          listener.subscriber.close();
        }
      });
      this.listeners = [];
      console.log("Unsubscribed from all topics");
      return true;
    } catch (error) {
      console.error("Error unsubscribing from topics:", error);
      return false;
    }
  }

  // Close the client connection
  close() {
    try {
      this.unsubscribeAll();
      if (this.client) {
        this.client.close();
        console.log("Hedera client closed");
      }
      return true;
    } catch (error) {
      console.error("Error closing Hedera client:", error);
      return false;
    }
  }
}

module.exports = HederaClient; 