# 🤖 AI Dialogue

**Two AI entities talking to each other — in real time, with premium neural voices**

AI Dialogue is a sophisticated conversation simulator where you configure two AI entities with simple prompts, hit start, and watch them engage in natural, human-like dialogue. Perfect for exploring AI behavior, testing conversation scenarios, or just enjoying entertaining AI interactions.

![AI Dialogue Demo](https://img.shields.io/badge/Status-Live%20Demo-brightgreen)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Azure](https://img.shields.io/badge/Azure-OpenAI%20%26%20Speech-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🎙️ **Premium Neural Voices**

- **28+ Azure Neural Voices** including Brian, Ava, Emma, Ryan and more
- **Multilingual support** with natural-sounding speech
- **Real-time audio streaming** with minimal latency
- **Speed control** from 0.5x to 1.5x playback speed

### 🎨 **Modern Interface**

- **Circular audio waveforms** that dance to the actual audio signal
- **Clean, responsive design** that works on desktop and mobile
- **Real-time character counting** with live validation
- **Collapsible advanced settings** for power users

### 🧠 **Advanced AI Configuration**

- **Human-like conversation instructions** built-in automatically
- **Temperature and Top-P controls** for fine-tuning AI behavior
- **Response length options**: Short (35 words), Medium (60 words), Long (90 words)
- **Character limits**: Up to 375 characters per entity prompt

### 🚀 **Smart Conversation Management**

- **Sample conversation templates**: Riddle challenges, political debates, joke rating
- **Automatic conversation limits**: Max 20 interactions (10 per entity)
- **Real-time WebSocket updates** for smooth interaction
- **Comprehensive cleanup** between conversations prevents overlaps

### 🔒 **Privacy & Compliance**

- **GDPR compliant** with proper legal links
- **Azure EU data residency** for European users
- **No data training** on your conversations
- **Secure WebSocket connections**

## 🛠️ Tech Stack

- **Backend**: FastAPI + WebSockets + Azure integrations
- **Frontend**: Pure HTML5/CSS3/JavaScript (no build step needed!)
- **Text-to-Speech**: Azure Cognitive Services Speech SDK
- **LLM**: Azure OpenAI GPT-4o mini
- **Audio Visualization**: Web Audio API + Canvas
- **Real-time Updates**: WebSocket streaming

## 📋 Requirements

- **Python ≥ 3.9**
- **Azure OpenAI account** with GPT-4o mini deployment
- **Azure Speech Services** account
- **No Node.js required!** ✨

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/Jamroszczyk/AI-Dialogue.git
cd AI-Dialogue

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file in the project root:

```bash
# Azure OpenAI (required)
AZURE_OPENAI_KEY_DE_4_1=your_openai_api_key_here
AZURE_OPENAI_ENDPOINT_DE_4_1=https://your-resource.openai.azure.com/

# Azure Speech Services (required)
SPEECHKEY=your_speech_service_key_here
SPEECHENDPOINT=https://your-region.api.cognitive.microsoft.com
```

### 3. Launch Application

```bash
python backend_app.py
```

Visit **http://localhost:8000** and start your first AI dialogue! 🎉

## 🎯 How to Use

1. **Configure AI Entities**: Enter simple prompts like "You love discussing space exploration" or "You're skeptical about new technology"
2. **Choose Voices**: Select from 28+ premium Azure neural voices (Brian and Ava are defaults)
3. **Pick a Template** (Optional): Try pre-built scenarios like riddle challenges or political debates
4. **Fine-tune Settings**: Adjust temperature, top-p, response length, and speech speed
5. **Start Conversation**: Hit the play button and watch your AIs come to life!

## 📁 Project Structure

```
AI-Dialogue/
├── backend_app.py          # FastAPI web server & WebSocket handler
├── azure_tts_helper.py     # Azure Speech Services integration
├── transformers.py         # Azure OpenAI API calls
├── index.html             # Main frontend interface
├── style.css             # Modern UI styling
├── script.js             # Frontend logic & audio handling
├── requirements.txt      # Python dependencies
├── voices/              # Generated audio files (auto-cleaned)
└── README.md           # This file
```

## 🎨 Sample Conversations

The app includes three built-in conversation templates:

- **🧩 Riddle Challenge**: AIs take turns creating and solving riddles
- **🗳️ Political Debate**: Respectful discussion between conservative and progressive viewpoints
- **😂 Joke Rating Time**: One AI tells jokes while the other provides ratings and feedback

## ⚙️ Configuration Options

### Entity Settings

- **System Prompt**: Up to 375 characters defining the AI's personality
- **Voice Selection**: Choose from 28+ Azure neural voices
- **Speed Control**: 0.5x to 1.5x playback speed

### Advanced AI Parameters

- **Temperature**: 0.0-2.0 (creativity vs consistency)
- **Top P**: 0.0-1.0 (response diversity)
- **Response Length**: Short/Medium/Long word limits

### Conversation Limits

- **Character Limit**: 375 characters per prompt (with live counter)
- **Interaction Limit**: Maximum 20 exchanges per conversation
- **Auto-cleanup**: Prevents conversation overlap issues

## 🔧 Dependencies

fastapi==0.116.1
uvicorn==0.35.0
python-dotenv==1.1.1
pydantic==2.11.7
openai==1.99.9
azure-cognitiveservices-speech==1.45.0

See `requirements.txt` for the complete list with all pinned versions.

## 🌍 Azure Services Setup

### Azure OpenAI

1. Create an Azure OpenAI resource in your preferred region
2. Deploy a **GPT-4o mini** model
3. Copy the endpoint and API key to your `.env` file

### Azure Speech Services

1. Create a Speech Services resource
2. Choose a region (preferably same as OpenAI for lowest latency)
3. Copy the service key and endpoint to your `.env` file

💡 **Pro tip**: Both services offer free tiers perfect for testing!

## 🔊 Available Voices

**Male Voices**: Adam, Alloy, Andrew, Brandon, Brian, Christopher, Davis, Derek, Dustin, Echo, Lewis, Onyx, Ryan, Samuel, Steffan

**Female Voices**: Amanda, Ava, Cora, Emma, Evelyn, Jenny, Lola, Nancy, Nova, Phoebe, Serena, Shimmer

**Neutral Voice**: Fable

All voices support multiple languages and natural prosody patterns.

## 🔒 Privacy & Security

- **Secure Connections**: All API calls use encrypted connections
- **Auto-cleanup**: Audio files are automatically deleted after playback

## 🐛 Troubleshooting

### Common Issues

**"Connection Error"**

- Check your Azure credentials in `.env`
- Verify your Azure resources are deployed and active
- Ensure you have sufficient quota/credits

**"Audio Not Playing"**

- Check browser audio permissions
- Try refreshing the page to reset audio context
- Verify Speech Services key and endpoint

**"WebSocket Disconnected"**

- Restart the backend server
- Check for firewall/proxy issues
- Clear browser cache and reload

### Getting Help

- Check the browser console for detailed error messages
- Verify all environment variables are set correctly
- Ensure Python dependencies are installed in the virtual environment

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes. Just give credit where it's due!

See [LICENSE](LICENSE) for full details.

## 🙏 Acknowledgments

- **Azure Cognitive Services** for premium neural voices
- **FastAPI** for the excellent async web framework
- **Azure OpenAI** for powerful language models
- **Web Audio API** for real-time audio visualization

**Privacy**: [Privacy Policy](https://www.tebbl.com/privacy-policy)

**Legal**: [Imprint](https://www.tebbl.com/imprint)

---

**Made with ❤️ by [Jamroszczyk](https://github.com/Jamroszczyk)**

*AI Dialogue - Where artificial minds meet and magic happens* ✨
