# HCS (Hedera Consensus Service) TTS (Text to Speech)

A real-time message streaming application that displays and reads out messages from a Hedera Consensus Service (HCS) topic. Built with Electron and featuring text-to-speech capabilities.

## Features

- **Real-time Message Streaming**: Connect to any Hedera Consensus Service (HCS) topic to receive messages in real-time
- **Text-to-Speech Integration**: Messages are automatically read aloud using ElevenLabs TTS or browser's built-in TTS
- **Dual Window Interface**:
  - **Dashboard**: Monitor message queue, connection status, and control settings
  - **Overlay**: Clean, transparent display window for showing messages
- **Message Queue Management**:
  - Automatic queue management
  - Skip functionality to move to next message
  - Queue count display
- **Customizable Settings**:
  - Change topic ID on the fly
  - Toggle overlay visibility
  - Adjust network settings (testnet/mainnet/custom)
- **Connection Status Monitoring**:
  - Real-time connection status display
  - Network indicator
  - Read-only mode indicator

## Requirements

- Node.js (v14 or higher)
- npm or yarn
- Hedera account credentials (for write access)
- ElevenLabs API key (optional, for enhanced TTS)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hcs-t2s.git
cd hcs-t2s
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your credentials:
```env
# Topic ID to listen to
# Replace with your topic ID or create a new one
HEDERA_TOPIC_ID=0.0.5931541

# Hedera network (testnet, previewnet, or mainnet)
HEDERA_NETWORK=testnet

# For custom/solo Hedera network
# Uncomment and set these values if using a custom/solo network
# HEDERA_CUSTOM_ENDPOINT=localhost:50211
# HEDERA_CUSTOM_MIRROR_ENDPOINT=localhost:5600

# Account that creates the topic (streamer)
STREAMER_ACCOUNT_ID=
STREAMER_PRIVATE_KEY=

# Account that views and sends messages to the topic (viewer)
VIEWER_ACCOUNT_ID=0.0.5908277
VIEWER_PRIVATE_KEY=
ELEVEN_LABS_API_KEY=
```

## Usage

1. Start the application:
```bash
npm start
```

2. The application will open two windows:
   - Dashboard window: Shows message queue and controls
   - Overlay window: Displays messages with TTS

3. To send messages to the topic, use the Hedera SDK or any compatible client.

## Configuration

The application can be configured through environment variables in the `.env` file:

- `HEDERA_TOPIC_ID`: The topic ID to subscribe to (required)
- `HEDERA_NETWORK`: Network to connect to (testnet/mainnet/previewnet)
- `HEDERA_CUSTOM_ENDPOINT`: Custom network endpoint (optional)
- `HEDERA_CUSTOM_MIRROR_ENDPOINT`: Custom mirror node endpoint (optional)
- `STREAMER_ACCOUNT_ID`: Account ID for creating topics (optional)
- `STREAMER_PRIVATE_KEY`: Private key for the streamer account (optional)
- `VIEWER_ACCOUNT_ID`: Account ID for viewing and sending messages (optional)
- `VIEWER_PRIVATE_KEY`: Private key for the viewer account (optional)
- `ELEVEN_LABS_API_KEY`: API key for ElevenLabs TTS (optional)

## Message Format

Messages should be sent in the following JSON format:
```json
{
  "name": "Sender Name",
  "message": "Message content"
}
```

## Development

To run the application in development mode:
```bash
npm run dev
```

To build the application:
```bash
npm run build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Hedera Hashgraph](https://hedera.com/) for the HCS service
- [Electron](https://www.electronjs.org/) for the application framework
- [ElevenLabs](https://elevenlabs.io/) for text-to-speech capabilities
