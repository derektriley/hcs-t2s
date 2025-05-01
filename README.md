# Message Display App with Hedera HCS Integration

A transparent message display app that integrates with Hedera Consensus Service to display and speak messages from a topic stream.

## Features

- Transparent window for OBS screen capture
- Text-to-speech message narration
- Hedera Consensus Service (HCS) integration
- Message queue system with fade animations
- OBS-friendly background rendering
- Support for Hedera testnet, mainnet, previewnet, and custom/solo networks

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory (or copy from `.env-example`):

```
# Hedera Testnet credentials
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY

# Topic ID to listen to
HEDERA_TOPIC_ID=0.0.YOUR_TOPIC_ID

# Hedera network (testnet, previewnet, or mainnet)
HEDERA_NETWORK=testnet

# For custom/solo Hedera network
# Uncomment and set these values if using a custom/solo network
# HEDERA_CUSTOM_ENDPOINT=localhost:50211
# HEDERA_CUSTOM_MIRROR_ENDPOINT=localhost:5600
```

## Running the Application

```bash
npm start
```

## Usage with Hedera Consensus Service

### Public Network (Testnet/Previewnet/Mainnet)

1. Obtain a Hedera testnet account from [Hedera Portal](https://portal.hedera.com)
2. Create a topic using the Hedera Console or programmatically
3. Update your `.env` file with your account ID, private key, and topic ID
4. Run the application with `npm start`

### Custom/Solo Network

To connect to a solo Hedera network deployment:

1. Set up your custom Hedera network (either locally or on a server)
2. Update the `.env` file with:
   - Your account ID on the custom network
   - Your private key for that account
   - The topic ID (if already created)
   - Uncomment and configure the custom endpoint settings

Example configuration for a local solo network:
```
HEDERA_ACCOUNT_ID=0.0.2
HEDERA_PRIVATE_KEY=302e020100300506032b65700422042091afd14923120d27b1a1a836d45c77ece78d96afa07dbe22c44eae795d15193c
HEDERA_TOPIC_ID=0.0.1022
HEDERA_NETWORK=custom
HEDERA_CUSTOM_ENDPOINT=localhost:50211
HEDERA_CUSTOM_MIRROR_ENDPOINT=localhost:5600
```

### Message Format

The messages sent to the HCS topic should follow this JSON format:

```json
{
  "name": "Sender Name",
  "message": "Your message content here"
}
```

## OBS Integration

1. Add a "Window Capture" source in OBS Studio
2. Select the "Message Display" window
3. Set any desired filters or effects
4. Messages will display even when the app is running in the background

## License

ISC
