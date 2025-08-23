from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
from typing import Dict, Any
import os
from dotenv import load_dotenv
from transformers import gpt4o_mini_azure_history
from azure_tts_helper import azure_tts
import threading
import time
import atexit

load_dotenv()

app = FastAPI()


# Register cleanup function for Azure TTS connection
def cleanup_azure_connection():
    """Clean up Azure TTS connection on app shutdown"""
    try:
        azure_tts.cleanup_old_files(max_age_hours=0)  # Clean all files on shutdown
        azure_tts.close_connection()
    except Exception as e:
        print(f"Error during Azure TTS cleanup: {e}")


atexit.register(cleanup_azure_connection)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",  # Local development
        "https://babel-a9is.onrender.com",  # Production deployment
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for audio
app.mount("/audio", StaticFiles(directory="voices"), name="audio")

# Mount static files for frontend (CSS, JS)
app.mount("/static", StaticFiles(directory="."), name="static")

# Store active conversations
active_conversations: Dict[str, Dict[str, Any]] = {}

# Store audio finished events
audio_finished_events: Dict[str, asyncio.Event] = {}

# Store running conversation tasks for proper cleanup
conversation_tasks: Dict[str, asyncio.Task] = {}


class ConversationRequest(BaseModel):
    system1: str
    system2: str
    voice1: str = "Brian"  # Default to Brian for Entity 1
    voice2: str = "Ava"  # Default to Ava for Entity 2
    speed1: float = 1.0
    speed2: float = 1.0


@app.get("/api/")
async def get_api_info():
    """Basic API info endpoint"""
    return {"message": "AI Dialogue Backend API", "version": "1.0.0"}


@app.get("/")
async def get_index():
    """Serve the frontend HTML file"""
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    else:
        return {
            "message": "AI Dialogue Backend API",
            "version": "1.0.0",
            "note": "Frontend files not found. Make sure index.html exists in the root directory.",
        }


@app.get("/style.css")
async def get_css():
    """Serve the CSS file"""
    return FileResponse("style.css", media_type="text/css")


@app.get("/script.js")
async def get_js():
    """Serve the JavaScript file"""
    return FileResponse("script.js", media_type="application/javascript")


async def cleanup_conversation_state(conversation_id: str):
    """Comprehensively clean up all conversation state"""
    # Mark conversation as stopped
    if conversation_id in active_conversations:
        active_conversations[conversation_id]["stop"] = True
        del active_conversations[conversation_id]

    # Clear audio events
    if conversation_id in audio_finished_events:
        audio_finished_events[conversation_id].set()  # Release any waiting tasks
        del audio_finished_events[conversation_id]

    # Remove conversation task reference
    if conversation_id in conversation_tasks:
        del conversation_tasks[conversation_id]

    # Stop all audio and clean up files
    azure_tts.stop_all_audio()
    azure_tts.cleanup_old_files(max_age_hours=0)  # Clean all current files

    # Small delay to ensure cleanup completes
    await asyncio.sleep(0.2)


async def wait_for_audio_finished(conversation_id: str):
    """Wait for client to confirm audio playback has finished"""
    if conversation_id not in audio_finished_events:
        audio_finished_events[conversation_id] = asyncio.Event()

    event = audio_finished_events[conversation_id]
    event.clear()
    await event.wait()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    conversation_id = str(id(websocket))

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "start":
                # Cancel any existing conversation task for this client
                if conversation_id in conversation_tasks:
                    conversation_tasks[conversation_id].cancel()
                    try:
                        await conversation_tasks[conversation_id]
                    except asyncio.CancelledError:
                        pass

                # Clean up any existing state completely
                await cleanup_conversation_state(conversation_id)

                # Start new conversation in background
                conversation_tasks[conversation_id] = asyncio.create_task(
                    run_conversation(
                        websocket,
                        conversation_id,
                        message,
                    )
                )

            elif message["type"] == "stop":
                # Cancel conversation task immediately
                if conversation_id in conversation_tasks:
                    conversation_tasks[conversation_id].cancel()
                    try:
                        await conversation_tasks[conversation_id]
                    except asyncio.CancelledError:
                        pass

                # Stop conversation and clean up all state
                if conversation_id in active_conversations:
                    active_conversations[conversation_id]["stop"] = True

                # Comprehensive cleanup
                await cleanup_conversation_state(conversation_id)

                # Stop any currently playing audio
                azure_tts.stop_all_audio()
                await websocket.send_text(json.dumps({"type": "stopped"}))

            elif message["type"] == "audio_finished":
                # Client confirms audio playback finished
                if conversation_id in audio_finished_events:
                    audio_finished_events[conversation_id].set()

    except WebSocketDisconnect:
        # Cancel conversation task
        if conversation_id in conversation_tasks:
            conversation_tasks[conversation_id].cancel()
            try:
                await conversation_tasks[conversation_id]
            except asyncio.CancelledError:
                pass

        # Comprehensive cleanup
        await cleanup_conversation_state(conversation_id)
        print(f"Client {conversation_id} disconnected")


async def run_conversation(websocket: WebSocket, conversation_id: str, config: dict):
    """Run the AI conversation with the same logic as the original script"""

    # Extract configuration
    system1 = config["system1"]
    system2 = config["system2"]

    # Initialize conversation state
    active_conversations[conversation_id] = {"stop": False}

    async def safe_send(message):
        """Safely send message to websocket, ignoring closed connections"""
        try:
            if (
                conversation_id in active_conversations
                and not active_conversations[conversation_id]["stop"]
            ):
                await websocket.send_text(json.dumps(message))
        except:
            # Connection closed, ignore
            pass

    # Validate character limits
    if len(system1) > 375:
        await safe_send(
            {"type": "error", "message": "System prompt 1 exceeds 375 character limit"}
        )
        return

    if len(system2) > 375:
        await safe_send(
            {"type": "error", "message": "System prompt 2 exceeds 375 character limit"}
        )
        return

    voice1 = config.get("voice1", "Brian")
    voice2 = config.get("voice2", "Ava")
    speed1 = config.get("speed1", 1.0)
    speed2 = config.get("speed2", 1.0)

    # LLM parameters
    temperature1 = config.get("temperature1", 0.7)
    temperature2 = config.get("temperature2", 0.7)
    top_p1 = config.get("topP1", 1.0)
    top_p2 = config.get("topP2", 1.0)

    response_length1 = config.get("responseLength1", 35)
    response_length2 = config.get("responseLength2", 35)

    # Add comprehensive human-like conversation instructions to system prompts
    human_conversation_instructions = """

CONVERSATION STYLE:
- Engage naturally like a real human in casual conversation
- React emotionally and personally to what the other person says
- Use conversational flow: ask questions, make observations, share thoughts
- Show curiosity, agreement, disagreement, surprise, or other natural reactions
- Build on previous points rather than just stating new arguments
- Use "I think...", "That's interesting...", "Wait, but...", "You know what..." etc.
- Include conversational fillers and natural speech patterns
- Show personality and individual perspective
- Sometimes go off on tangents or bring up related points
- React to the other person's tone and adjust accordingly

AVOID:
- Formal debate structure or academic presentations  
- Simply stating facts without personal reaction
- Ignoring what the other person just said
- Being overly polite or robotic
- Starting every response the same way"""

    system1_with_limit = (
        f"{system1}"
        f"{human_conversation_instructions}"
        f"\n\nKeep your responses to {response_length1} words maximum."
    )
    system2_with_limit = (
        f"{system2}"
        f"{human_conversation_instructions}"
        f"\n\nKeep your responses to {response_length2} words maximum."
    )

    async def cleanup_audio_file(audio_file, delay):
        """Clean up audio file after a delay"""
        await asyncio.sleep(delay)
        try:
            if os.path.exists(audio_file):
                os.remove(audio_file)
        except Exception as e:
            print(f"Could not delete audio file {audio_file}: {e}")

    async def play_audio_and_cleanup(text, voice, speed, entity_num):
        """Generate audio, send to client, wait for client confirmation"""
        # Check if conversation was stopped before generating audio
        if active_conversations.get(conversation_id, {}).get("stop", True):
            return 0

        audio_file = await asyncio.get_event_loop().run_in_executor(
            None, azure_tts.generate_audio_file, text, voice, speed
        )

        # Check again after audio generation
        if active_conversations.get(conversation_id, {}).get("stop", True):
            # Clean up the generated file and return
            if audio_file and os.path.exists(audio_file):
                try:
                    os.remove(audio_file)
                except:
                    pass
            return 0

        audio_url = f"/audio/{os.path.basename(audio_file)}" if audio_file else None
        await safe_send(
            {
                "type": "speaking",
                "entity": entity_num,
                "audioUrl": audio_url,
                "text": text,
            }
        )

        duration = 0
        if audio_file:
            # Calculate duration based on file format
            if audio_file.endswith(".mp3"):
                # For MP3 files, estimate duration based on file size
                # This is a rough estimate: MP3 48kbps ≈ 6KB per second
                try:
                    file_size = os.path.getsize(audio_file)
                    # Estimate for 48kbps MP3: roughly 6KB per second
                    duration = file_size / 6000
                except:
                    duration = 5  # Fallback duration
            else:
                # For WAV files, use wave module
                try:
                    import wave

                    with wave.open(audio_file, "rb") as wav_file:
                        duration = wav_file.getnframes() / wav_file.getframerate()
                except:
                    duration = 5  # Fallback duration

            # Schedule cleanup in background (extra buffer time)
            asyncio.create_task(cleanup_audio_file(audio_file, duration + 5))

            # Wait for client to confirm audio finished, with timeout fallback
            try:
                await asyncio.wait_for(
                    wait_for_audio_finished(conversation_id),
                    timeout=duration + 3,  # Extra buffer for network delays
                )
            except asyncio.TimeoutError:
                # Fallback to time-based approach if client doesn't respond
                pass
            except asyncio.CancelledError:
                # Conversation was cancelled during audio playback
                if audio_file and os.path.exists(audio_file):
                    try:
                        os.remove(audio_file)
                    except:
                        pass
                raise

        # Final check before sending finished_speaking
        if not active_conversations.get(conversation_id, {}).get("stop", True):
            await safe_send({"type": "finished_speaking"})

        # Small buffer to ensure clean transition
        await asyncio.sleep(0.1)
        return duration

    try:
        # Get Azure OpenAI credentials
        KEY = os.getenv("AZURE_OPENAI_KEY_DE_4_1")
        ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT_DE_4_1")

        if not KEY or not ENDPOINT:
            await safe_send(
                {"type": "error", "message": "Azure OpenAI credentials not found"}
            )
            return

        # Initialize conversation
        seed = gpt4o_mini_azure_history(
            system=system1_with_limit,
            history=[
                {
                    "role": "user",
                    "content": f"Make a first response based on your system prompt: {system1_with_limit}",
                }
            ],
            key=KEY,
            endpoint=ENDPOINT,
            temperature=temperature1,
            top_p=top_p1,
        )

        liberal_history = [{"role": "user", "content": seed}]
        republican_history = []

        # Generate and send first response
        await play_audio_and_cleanup(seed, voice1, speed1, 1)

        # Check if stopped
        if active_conversations[conversation_id]["stop"]:
            return

        # Get response from entity 2
        response = gpt4o_mini_azure_history(
            system=system2_with_limit,
            history=liberal_history,
            key=KEY,
            endpoint=ENDPOINT,
            temperature=temperature2,
            top_p=top_p2,
        )

        await play_audio_and_cleanup(response, voice2, speed2, 2)

        if response:
            republican_history.append({"role": "user", "content": response})
            liberal_history.append({"role": "assistant", "content": response})

        # Main conversation loop - limit to 10 rounds (20 total interactions)
        for i in range(10):
            if active_conversations[conversation_id]["stop"]:
                break

            # Entity 1 response
            response = gpt4o_mini_azure_history(
                system=system1_with_limit,
                history=republican_history,
                key=KEY,
                endpoint=ENDPOINT,
                temperature=temperature1,
                top_p=top_p1,
            )

            if response:
                liberal_history.append({"role": "user", "content": response})
                republican_history.append({"role": "assistant", "content": response})

            await play_audio_and_cleanup(response, voice1, speed1, 1)

            if active_conversations[conversation_id]["stop"]:
                break

            # Entity 2 response
            response = gpt4o_mini_azure_history(
                system=system2_with_limit,
                history=liberal_history,
                key=KEY,
                endpoint=ENDPOINT,
                temperature=temperature2,
                top_p=top_p2,
            )

            if response:
                republican_history.append({"role": "user", "content": response})
                liberal_history.append({"role": "assistant", "content": response})

            await play_audio_and_cleanup(response, voice2, speed2, 2)

    except asyncio.CancelledError:
        # Conversation was cancelled - clean up gracefully
        await cleanup_conversation_state(conversation_id)
        raise
    except Exception as e:
        await safe_send({"type": "error", "message": str(e)})
    finally:
        # Comprehensive cleanup
        await cleanup_conversation_state(conversation_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
