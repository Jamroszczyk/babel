import os
import azure.cognitiveservices.speech as speechsdk
import threading
import time
import asyncio
from typing import Optional


class AzureTTSHelper:
    def __init__(self):
        self.key = os.getenv("SPEECHKEY")
        self.endpoint = os.getenv("SPEECHENDPOINT")

        if not self.key or not self.endpoint:
            raise ValueError(
                "SPEECHKEY and SPEECHENDPOINT environment variables must be set"
            )

        # Configure speech service
        self.speech_config = speechsdk.SpeechConfig(
            subscription=self.key, endpoint=self.endpoint
        )

        # OPTIMIZATION: Use compressed MP3 format for faster network transfer
        self.speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3
        )

        # Voice mappings - maps display keys to Azure voice names
        self.voice_mappings = {
            # Default entities (swapped as requested)
            "entity1": "en-US-ChristopherMultilingualNeural",  # AI 1 - Christopher (male)
            "entity2": "en-US-CoraMultilingualNeural",  # AI 2 - Cora (female)
            # All available Azure voices
            "Adam": "en-US-AdamMultilingualNeural",
            "Alloy": "en-US-AlloyTurboMultilingualNeural",
            "Amanda": "en-US-AmandaMultilingualNeural",
            "Andrew": "en-US-AndrewMultilingualNeural",
            "Ava": "en-US-AvaMultilingualNeural",
            "Brandon": "en-US-BrandonMultilingualNeural",
            "Brian": "en-US-BrianMultilingualNeural",
            "Christopher": "en-US-ChristopherMultilingualNeural",
            "Cora": "en-US-CoraMultilingualNeural",
            "Davis": "en-US-DavisMultilingualNeural",
            "Derek": "en-US-DerekMultilingualNeural",
            "Dustin": "en-US-DustinMultilingualNeural",
            "Echo": "en-US-EchoTurboMultilingualNeural",
            "Emma": "en-US-EmmaMultilingualNeural",
            "Evelyn": "en-US-EvelynMultilingualNeural",
            "Fable": "en-US-FableTurboMultilingualNeural",
            "Jenny": "en-US-JennyMultilingualNeural",
            "Lewis": "en-US-LewisMultilingualNeural",
            "Lola": "en-US-LolaMultilingualNeural",
            "Nancy": "en-US-NancyMultilingualNeural",
            "Nova": "en-US-NovaTurboMultilingualNeural",
            "Onyx": "en-US-OnyxTurboMultilingualNeural",
            "Phoebe": "en-US-PhoebeMultilingualNeural",
            "Ryan": "en-US-RyanMultilingualNeural",
            "Samuel": "en-US-SamuelMultilingualNeural",
            "Serena": "en-US-SerenaMultilingualNeural",
            "Shimmer": "en-US-ShimmerTurboMultilingualNeural",
            "Steffan": "en-US-SteffanMultilingualNeural",
            # Keep backward compatibility with old voice names
            "en_amy_med": "en-US-AvaMultilingualNeural",
            "en_bryce_med": "en-US-BrianMultilingualNeural",
        }

        self.audio_dir = os.path.join(os.path.dirname(__file__), "voices")
        os.makedirs(self.audio_dir, exist_ok=True)

        self.stop_requested = False

        # OPTIMIZATION: Create reusable synthesizer instance and pre-connect
        self.speech_synthesizer = None
        self.connection = None
        self._initialize_synthesizer()

        print("Azure TTS initialized with voices:", list(self.voice_mappings.keys()))
        print("Using MP3 compression for optimal performance")

    def _initialize_synthesizer(self):
        """Initialize and pre-connect the speech synthesizer for lower latency"""
        try:
            # Create synthesizer without audio config (we'll specify per request)
            self.speech_synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=self.speech_config, audio_config=None
            )

            # OPTIMIZATION: Pre-connect to avoid connection setup latency
            self.connection = speechsdk.Connection.from_speech_synthesizer(
                self.speech_synthesizer
            )
            self.connection.open(True)  # Pre-connect
            print("Azure TTS: Pre-connected to service for optimal latency")

        except Exception as e:
            print(f"Warning: Could not pre-connect to Azure TTS: {e}")
            # Fallback: create synthesizer without pre-connection
            self.speech_synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=self.speech_config, audio_config=None
            )

    def get_voice_name(self, voice_key: str) -> str:
        """Get Azure voice name from voice key"""
        return self.voice_mappings.get(voice_key, self.voice_mappings["entity1"])

    def generate_audio_file(
        self, text: str, voice_key: str, speed: float = 1.0
    ) -> Optional[str]:
        """Generate audio file using Azure TTS and return file path"""
        try:
            # Clean text and prepare for synthesis
            cleaned_text = text.strip()
            if not cleaned_text:
                return None

            # Get the Azure voice name
            voice_name = self.get_voice_name(voice_key)

            # Create unique filename - using .mp3 extension now for compressed format
            timestamp = int(time.time() * 1000)  # Use milliseconds for uniqueness
            audio_file = os.path.join(
                self.audio_dir, f"azure_{voice_key}_{timestamp}.mp3"
            )

            # Configure audio output to file
            audio_config = speechsdk.audio.AudioOutputConfig(filename=audio_file)

            # Configure speech settings for this request
            self.speech_config.speech_synthesis_voice_name = voice_name

            # Adjust speech rate based on speed parameter
            # speed 1.0 = normal, 0.5 = slow, 2.0 = fast
            rate_percent = int((speed - 1.0) * 100)
            if rate_percent != 0:
                rate_string = (
                    f"+{rate_percent}%" if rate_percent > 0 else f"{rate_percent}%"
                )
                ssml_text = f"""
                <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
                    <voice name="{voice_name}">
                        <prosody rate="{rate_string}">
                            {cleaned_text}
                        </prosody>
                    </voice>
                </speak>
                """
            else:
                ssml_text = cleaned_text

            # OPTIMIZATION: Use the reusable synthesizer with new audio config
            # Create a new synthesizer with the specific audio config for this request
            request_synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=self.speech_config, audio_config=audio_config
            )

            # Record start time for latency measurement
            start_time = time.time()

            # Synthesize speech
            if rate_percent != 0:
                result = request_synthesizer.speak_ssml_async(ssml_text).get()
            else:
                result = request_synthesizer.speak_text_async(cleaned_text).get()

            # Calculate and log latency metrics
            total_time = (time.time() - start_time) * 1000  # Convert to milliseconds

            # Extract Azure latency metrics if available
            try:
                first_byte_latency = result.properties.get_property(
                    speechsdk.PropertyId.SpeechServiceResponse_SynthesisFirstByteLatencyMs
                )
                finish_latency = result.properties.get_property(
                    speechsdk.PropertyId.SpeechServiceResponse_SynthesisFinishLatencyMs
                )
                network_latency = result.properties.get_property(
                    speechsdk.PropertyId.SpeechServiceResponse_SynthesisNetworkLatencyMs
                )
                service_latency = result.properties.get_property(
                    speechsdk.PropertyId.SpeechServiceResponse_SynthesisServiceLatencyMs
                )

                if first_byte_latency:
                    print(
                        f"Azure TTS Latency - First byte: {first_byte_latency}ms, "
                        f"Finish: {finish_latency}ms, Network: {network_latency}ms, "
                        f"Service: {service_latency}ms, Total: {total_time:.1f}ms"
                    )
            except:
                print(f"Azure TTS: Total synthesis time: {total_time:.1f}ms")

            # Check if synthesis was successful
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                print(f"Azure TTS: MP3 audio saved to {audio_file}")
                return audio_file
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = result.cancellation_details
                print(f"Azure TTS synthesis canceled: {cancellation_details.reason}")
                if cancellation_details.reason == speechsdk.CancellationReason.Error:
                    print(f"Error details: {cancellation_details.error_details}")
                return None
            else:
                print(f"Azure TTS synthesis failed with reason: {result.reason}")
                return None

        except Exception as e:
            print(f"Error generating Azure TTS audio: {e}")
            return None

    def stop_all_audio(self):
        """Stop all audio playback (compatibility method)"""
        self.stop_requested = True
        print("Azure TTS: Stop all audio requested")

    def reset_stop_flag(self):
        """Reset stop flag for new audio playback"""
        self.stop_requested = False

    def cleanup_old_files(self, max_age_hours: int = 1):
        """Clean up old audio files to save disk space"""
        try:
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600

            for filename in os.listdir(self.audio_dir):
                if filename.startswith("azure_") and (
                    filename.endswith(".wav") or filename.endswith(".mp3")
                ):
                    file_path = os.path.join(self.audio_dir, filename)
                    if os.path.getmtime(file_path) < (current_time - max_age_seconds):
                        os.remove(file_path)
                        print(f"Cleaned up old audio file: {filename}")
        except Exception as e:
            print(f"Error cleaning up old audio files: {e}")

    def close_connection(self):
        """Close the pre-established connection"""
        try:
            if self.connection:
                self.connection.close()
                print("Azure TTS: Connection closed")
        except Exception as e:
            print(f"Error closing Azure TTS connection: {e}")


# Create global instance
azure_tts = AzureTTSHelper()
