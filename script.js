class AIDialogueApp {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.currentAudio = null;
        this.conversationActive = false;
        this.audioQueue = [];
        this.volume = 1.0;
        this.isMuted = false;

        // Audio analysis setup
        this.audioContext = null;
        this.analyser1 = null;
        this.analyser2 = null;
        this.waveformAnimationId = null;

        // Fade in/out system for smooth transitions
        this.waveformOpacity1 = 0;
        this.waveformOpacity2 = 0;
        this.fadeSpeed = 0.05; // How fast to fade in/out

        this.initializeElements();
        this.attachEventListeners();
        this.updateSliderValues();
        this.initializeWaveforms();
        this.initializeSampleConversations();
        this.initializeAudioContext();
    }

    initializeElements() {
        // Form elements
        this.system1Input = document.getElementById("system1");
        this.system2Input = document.getElementById("system2");
        this.voice1Select = document.getElementById("voice1");
        this.voice2Select = document.getElementById("voice2");
        this.speed1Slider = document.getElementById("speed1");
        this.speed2Slider = document.getElementById("speed2");
        this.temperature1Slider = document.getElementById("temperature1");
        this.temperature2Slider = document.getElementById("temperature2");
        this.topP1Slider = document.getElementById("topP1");
        this.topP2Slider = document.getElementById("topP2");

        this.responseLength1Select = document.getElementById("responseLength1");
        this.responseLength2Select = document.getElementById("responseLength2");

        // Control elements
        this.startBtn = document.getElementById("startBtn");
        this.stopBtn = document.getElementById("stopBtn");
        this.muteBtn = document.getElementById("muteBtn");
        this.volumeSlider = document.getElementById("volumeSlider");

        // Status elements
        this.statusDot = document.getElementById("statusDot");
        this.statusText = document.getElementById("statusText");
        this.audioStatus = document.getElementById("audioStatus");

        // Display elements
        this.conversation = document.getElementById("conversation");
        this.loadingOverlay = document.getElementById("loadingOverlay");

        // Modal elements
        this.errorModal = document.getElementById("errorModal");
        this.errorMessage = document.getElementById("errorMessage");
        this.closeErrorModal = document.getElementById("closeErrorModal");
        this.acknowledgeError = document.getElementById("acknowledgeError");

        // Waveform elements
        this.waveform1Container = document.getElementById("waveform1");
        this.waveform2Container = document.getElementById("waveform2");
        this.waveformCanvas1 = document.getElementById("waveformCanvas1");
        this.waveformCanvas2 = document.getElementById("waveformCanvas2");

        // Settings toggle elements
        this.settingsToggle1 = document.getElementById("settingsToggle1");
        this.settingsToggle2 = document.getElementById("settingsToggle2");
        this.settingsPanel1 = document.getElementById("settingsPanel1");
        this.settingsPanel2 = document.getElementById("settingsPanel2");

        // Character counter elements
        this.charCount1 = document.getElementById("charCount1");
        this.charCount2 = document.getElementById("charCount2");

        // Sample conversations dropdown
        this.sampleConversationsSelect = document.getElementById(
            "sampleConversations"
        );
    }

    attachEventListeners() {
        // Control buttons
        this.startBtn.addEventListener("click", () => this.startConversation());
        this.stopBtn.addEventListener("click", () => this.stopConversation());

        // Audio controls
        this.muteBtn.addEventListener("click", () => this.toggleMute());
        this.volumeSlider.addEventListener("input", (e) =>
            this.updateVolume(e.target.value)
        );

        // Speed sliders
        this.speed1Slider.addEventListener("input", () =>
            this.updateSliderValues()
        );
        this.speed2Slider.addEventListener("input", () =>
            this.updateSliderValues()
        );

        // Temperature sliders
        this.temperature1Slider.addEventListener("input", () =>
            this.updateSliderValues()
        );
        this.temperature2Slider.addEventListener("input", () =>
            this.updateSliderValues()
        );

        // Top P sliders
        this.topP1Slider.addEventListener("input", () =>
            this.updateSliderValues()
        );
        this.topP2Slider.addEventListener("input", () =>
            this.updateSliderValues()
        );

        // Modal controls
        this.closeErrorModal.addEventListener("click", () =>
            this.hideErrorModal()
        );
        this.acknowledgeError.addEventListener("click", () =>
            this.hideErrorModal()
        );

        // Close modal when clicking outside
        this.errorModal.addEventListener("click", (e) => {
            if (e.target === this.errorModal) {
                this.hideErrorModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.hideErrorModal();
            }
            if (e.key === " " && e.ctrlKey) {
                e.preventDefault();
                if (this.conversationActive) {
                    this.stopConversation();
                } else {
                    this.startConversation();
                }
            }
        });

        // Settings toggle listeners
        this.settingsToggle1.addEventListener("click", () =>
            this.toggleSettings(1)
        );
        this.settingsToggle2.addEventListener("click", () =>
            this.toggleSettings(2)
        );

        // Character counter listeners
        this.system1Input.addEventListener("input", () =>
            this.updateCharacterCount(1)
        );
        this.system2Input.addEventListener("input", () =>
            this.updateCharacterCount(2)
        );

        // Sample conversations dropdown listener
        this.sampleConversationsSelect.addEventListener("change", () =>
            this.handleSampleConversationChange()
        );

        // Initialize character counts
        this.updateCharacterCount(1);
        this.updateCharacterCount(2);
    }

    initializeWaveforms() {
        // Initialize canvas contexts
        this.waveformCtx1 = this.waveformCanvas1.getContext("2d");
        this.waveformCtx2 = this.waveformCanvas2.getContext("2d");

        // Set canvas dimensions
        this.resizeCanvases();

        // Resize canvases on window resize
        window.addEventListener("resize", () => this.resizeCanvases());
    }

    initializeSampleConversations() {
        // Define sample conversation prompts
        this.sampleConversations = {
            riddles: {
                entity1:
                    "You engage in a back and forth telling riddles. First you will tell a riddle and the opponent will start guessing the answer. Only once they find the correct answer, will you tell them that they are correct and ask them to tell you a riddle. You then start guessing until you get the answer. And so on.",
                entity2:
                    "You engage in a back and forth telling riddles. First you will be told a riddle and you will start guessing the answer. Only once you find the correct answer, will the opponent tell you that you are correct and ask you to tell them a riddle next. You then tell a riddle and the opponent starts guessing until they get the answer. And so on.",
            },
            political: {
                entity1:
                    "You hold conservative political views and believe in traditional values, free markets, and limited government. You engage in respectful political debate while advocating for your conservative perspective.",
                entity2:
                    "You hold progressive political views and believe in social justice, environmental protection, and expanded government programs. You engage in respectful political debate while advocating for your liberal perspective.",
            },
            jokes: {
                entity1:
                    "You are a comedian who loves telling jokes and funny stories. You tell original jokes, puns, and humorous anecdotes, then eagerly wait for feedback and ratings on your comedic material.",
                entity2:
                    "You are a comedy critic who rates and reviews jokes. You listen to jokes and provide detailed feedback, ratings out of 10, and constructive criticism about timing, originality, and humor quality.",
            },
        };
    }

    handleSampleConversationChange() {
        const selectedValue = this.sampleConversationsSelect.value;

        if (selectedValue && this.sampleConversations[selectedValue]) {
            const sample = this.sampleConversations[selectedValue];

            // Fill in the textareas
            this.system1Input.value = sample.entity1;
            this.system2Input.value = sample.entity2;

            // Update character counters
            this.updateCharacterCount(1);
            this.updateCharacterCount(2);

            // Add a subtle animation to show the fields were updated
            this.system1Input.style.background = "rgba(102, 126, 234, 0.1)";
            this.system2Input.style.background = "rgba(240, 147, 251, 0.1)";

            setTimeout(() => {
                this.system1Input.style.background = "";
                this.system2Input.style.background = "";
            }, 1000);
        }
    }

    // Initialize audio context (will be created on first user interaction)
    initializeAudioContext() {
        // Audio context will be created on first user interaction due to browser autoplay policies
    }

    resizeCanvases() {
        const canvases = [this.waveformCanvas1, this.waveformCanvas2];

        canvases.forEach((canvas) => {
            const rect = canvas.getBoundingClientRect();
            // Set actual canvas size for circular waveform
            canvas.width = rect.width;
            canvas.height = rect.height;

            // No scaling needed for circular animation - we'll use actual canvas dimensions
        });
    }

    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();

            // Create analysers for each entity
            this.analyser1 = this.audioContext.createAnalyser();
            this.analyser2 = this.audioContext.createAnalyser();

            // Configure analysers
            [this.analyser1, this.analyser2].forEach((analyser) => {
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.8;
            });
        } catch (error) {
            console.error("Failed to initialize audio context:", error);
        }
    }

    connectAudioToAnalyser(audio, entity) {
        if (!this.audioContext) return;

        try {
            // Resume audio context if suspended
            if (this.audioContext.state === "suspended") {
                this.audioContext.resume();
            }

            // Create media element source
            const source = this.audioContext.createMediaElementSource(audio);
            const analyser = entity === 1 ? this.analyser1 : this.analyser2;

            // Connect: source -> analyser -> destination
            source.connect(analyser);
            analyser.connect(this.audioContext.destination);

            // Start waveform animation
            this.startWaveformAnimation(entity);
        } catch (error) {
            console.error("Failed to connect audio to analyser:", error);
            // Fallback: connect directly to destination
            try {
                const source =
                    this.audioContext.createMediaElementSource(audio);
                source.connect(this.audioContext.destination);
            } catch (fallbackError) {
                console.error("Fallback connection failed:", fallbackError);
            }
        }
    }

    startWaveformAnimation(entity) {
        if (this.waveformAnimationId) {
            cancelAnimationFrame(this.waveformAnimationId);
        }

        const analyser = entity === 1 ? this.analyser1 : this.analyser2;
        const canvas =
            entity === 1 ? this.waveformCanvas1 : this.waveformCanvas2;
        const ctx = entity === 1 ? this.waveformCtx1 : this.waveformCtx2;
        const container =
            entity === 1 ? this.waveform1Container : this.waveform2Container;

        if (!analyser || !canvas || !ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Add active class to container
        container.classList.add("active");

        const draw = () => {
            this.waveformAnimationId = requestAnimationFrame(draw);

            // Get fresh frequency data
            analyser.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2 - 10;
            const time = Date.now() * 0.001;

            // Update fade for smooth transitions
            const targetOpacity = 1;
            const currentOpacity =
                entity === 1 ? this.waveformOpacity1 : this.waveformOpacity2;
            const newOpacity = Math.min(
                currentOpacity + this.fadeSpeed,
                targetOpacity
            );

            if (entity === 1) {
                this.waveformOpacity1 = newOpacity;
            } else {
                this.waveformOpacity2 = newOpacity;
            }

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Draw circular boundary (subtle outline)
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = "#e5e7eb";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Calculate audio intensity for wave animation
            const audioIntensity = Math.max(...dataArray.slice(0, 32)) / 255;

            // Entity colors
            const entityColor = entity === 1 ? "#667EEA" : "#F093FB";

            // Create horizontal wave points across the circle
            const wavePoints = [];
            const numPoints = 200;
            const waveAmplitude = 8 + audioIntensity * 12; // Reduced wave height
            const baseWaveY = centerY; // Wave sits in middle of circle

            // Calculate the width of the circle at different y positions
            for (let i = 0; i <= numPoints; i++) {
                const progress = i / numPoints;
                const x = centerX - radius + progress * radius * 2;

                // Create smooth ocean-like wave using multiple sine waves
                const wave1 =
                    Math.sin(progress * Math.PI * 4 + time * 2) *
                    waveAmplitude *
                    0.6;
                const wave2 =
                    Math.sin(progress * Math.PI * 6 + time * 1.5) *
                    waveAmplitude *
                    0.3;
                const wave3 =
                    Math.sin(progress * Math.PI * 8 + time * 2.5) *
                    waveAmplitude *
                    0.2;

                // Add audio-reactive ripples (reduced)
                const audioWave =
                    audioIntensity *
                    Math.sin(progress * Math.PI * 10 + time * 4) *
                    8;

                const y = baseWaveY + wave1 + wave2 + wave3 + audioWave;

                // Only include points that are within the circle bounds
                const distFromCenter = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );
                if (distFromCenter <= radius) {
                    wavePoints.push({ x, y });
                }
            }

            // Create clipping mask for circle and apply fade opacity
            ctx.save();
            ctx.globalAlpha = newOpacity;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.clip();

            // Fill bottom area (below wave) with entity color
            if (wavePoints.length > 0) {
                ctx.beginPath();

                // Start from bottom-left of circle
                ctx.moveTo(centerX - radius, centerY + radius);
                ctx.lineTo(centerX + radius, centerY + radius); // Bottom edge

                // Follow wave line from right to left
                for (let i = wavePoints.length - 1; i >= 0; i--) {
                    const point = wavePoints[i];
                    ctx.lineTo(point.x, point.y);
                }

                ctx.closePath();

                // Create gradient fill for more depth
                const fillGradient = ctx.createLinearGradient(
                    0,
                    centerY - radius,
                    0,
                    centerY + radius
                );
                fillGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
                fillGradient.addColorStop(0.3, entityColor + "40"); // 25% opacity
                fillGradient.addColorStop(1, entityColor);

                ctx.fillStyle = fillGradient;
                ctx.fill();
            }

            // Draw wave line with glow effect
            if (wavePoints.length > 1) {
                // Glow effect (wider, semi-transparent)
                ctx.beginPath();
                ctx.moveTo(wavePoints[0].x, wavePoints[0].y);
                for (let i = 1; i < wavePoints.length; i++) {
                    const point = wavePoints[i];
                    const prevPoint = wavePoints[i - 1];
                    const cpx = (prevPoint.x + point.x) / 2;
                    const cpy = (prevPoint.y + point.y) / 2;
                    ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpx, cpy);
                }
                ctx.strokeStyle = entityColor;
                ctx.lineWidth = 4 + audioIntensity * 2; // Reduced glow thickness
                ctx.globalAlpha = 0.3 * newOpacity;
                ctx.stroke();

                // Main wave line (sharp and defined)
                ctx.beginPath();
                ctx.moveTo(wavePoints[0].x, wavePoints[0].y);
                for (let i = 1; i < wavePoints.length; i++) {
                    const point = wavePoints[i];
                    const prevPoint = wavePoints[i - 1];
                    const cpx = (prevPoint.x + point.x) / 2;
                    const cpy = (prevPoint.y + point.y) / 2;
                    ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpx, cpy);
                }
                ctx.strokeStyle = entityColor;
                ctx.lineWidth = 1.5 + audioIntensity * 1; // Reduced main line thickness
                ctx.globalAlpha = newOpacity;
                ctx.stroke();
            }

            ctx.restore(); // Remove clipping mask
        };

        draw();
    }

    stopWaveformAnimation(entity) {
        // Start fade out instead of immediate stop
        const fadeOut = () => {
            const currentOpacity =
                entity === 1 ? this.waveformOpacity1 : this.waveformOpacity2;
            const newOpacity = Math.max(currentOpacity - this.fadeSpeed * 2, 0); // Faster fade out

            if (entity === 1) {
                this.waveformOpacity1 = newOpacity;
            } else {
                this.waveformOpacity2 = newOpacity;
            }

            // Continue fading until fully transparent
            if (newOpacity > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                // Only stop animation and clear when fully faded
                if (this.waveformAnimationId) {
                    cancelAnimationFrame(this.waveformAnimationId);
                    this.waveformAnimationId = null;
                }

                const container =
                    entity === 1
                        ? this.waveform1Container
                        : this.waveform2Container;
                const ctx =
                    entity === 1 ? this.waveformCtx1 : this.waveformCtx2;
                const canvas =
                    entity === 1 ? this.waveformCanvas1 : this.waveformCanvas2;

                // Remove active class
                container.classList.remove("active");

                // Clear canvas
                if (ctx && canvas) {
                    ctx.clearRect(
                        0,
                        0,
                        canvas.offsetWidth,
                        canvas.offsetHeight
                    );
                }
            }
        };

        fadeOut();
    }

    toggleSettings(entity) {
        const toggle =
            entity === 1 ? this.settingsToggle1 : this.settingsToggle2;
        const panel = entity === 1 ? this.settingsPanel1 : this.settingsPanel2;

        const isCollapsed = panel.classList.contains("collapsed");

        if (isCollapsed) {
            panel.classList.remove("collapsed");
            toggle.classList.add("expanded");
        } else {
            panel.classList.add("collapsed");
            toggle.classList.remove("expanded");
        }
    }

    updateCharacterCount(entity) {
        const input = entity === 1 ? this.system1Input : this.system2Input;
        const counter = entity === 1 ? this.charCount1 : this.charCount2;
        const currentLength = input.value.length;

        counter.textContent = currentLength;

        // Update counter styling based on length
        const counterElement = counter.parentElement;
        counterElement.classList.remove("warning", "error");

        if (currentLength > 300) {
            counterElement.classList.add("warning");
        }
        if (currentLength >= 375) {
            counterElement.classList.add("error");
        }
    }

    updateSliderValues() {
        // Update speed display values
        document.querySelectorAll(".speed-value").forEach((el, index) => {
            const slider = index === 0 ? this.speed1Slider : this.speed2Slider;
            el.textContent = `${slider.value}x`;
        });

        // Update temperature display values
        document.querySelectorAll(".temp-value").forEach((el, index) => {
            const slider =
                index === 0 ? this.temperature1Slider : this.temperature2Slider;
            el.textContent = `${slider.value}`;
        });

        // Update top P display values
        document.querySelectorAll(".top-p-value").forEach((el, index) => {
            const slider = index === 0 ? this.topP1Slider : this.topP2Slider;
            el.textContent = `${slider.value}`;
        });
    }

    connectWebSocket() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log("WebSocket connected");
            this.isConnected = true;
            this.updateStatus("connected", "Connected");
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            // Only process messages if conversation is still active or it's a stopped message
            if (!this.conversationActive && message.type !== "stopped") {
                return;
            }
            this.handleWebSocketMessage(message);
        };

        this.ws.onclose = () => {
            console.log("WebSocket disconnected");
            this.isConnected = false;
            this.conversationActive = false;
            this.updateStatus("disconnected", "Disconnected");
            this.resetUI();
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            this.showError(
                "Connection error. Please check your network and try again."
            );
        };
    }

    handleWebSocketMessage(message) {
        console.log("Received message:", message);

        switch (message.type) {
            case "speaking":
                this.handleSpeaking(message);
                break;
            case "finished_speaking":
                this.handleFinishedSpeaking();
                break;
            case "stopped":
                this.handleStopped();
                break;
            case "error":
                this.handleError(message);
                break;
            default:
                console.log("Unknown message type:", message.type);
        }
    }

    async handleSpeaking(message) {
        const { entity, audioUrl, text } = message;

        // Add message to conversation
        this.addMessage(entity, text, true);

        // Play audio if available
        if (audioUrl && !this.isMuted) {
            this.playAudio(audioUrl, entity);
        } else {
            // If no audio or muted, simulate speaking duration and send finished signal
            setTimeout(() => {
                this.sendAudioFinishedSignal();
            }, 2000);
        }

        this.hideLoading();
    }

    playAudio(audioUrl, entity) {
        const audio = new Audio(audioUrl);
        audio.volume = this.volume;
        this.currentAudio = audio;

        audio.onloadstart = () => {
            this.updateAudioStatus("Loading audio...");
        };

        audio.oncanplay = () => {
            this.updateAudioStatus(`Entity ${entity} speaking...`);
        };

        audio.onplay = () => {
            // Mark the current message as speaking
            this.markMessageSpeaking(entity, true);

            // Connect audio to analyser for waveform visualization
            this.connectAudioToAnalyser(audio, entity);
        };

        audio.onended = () => {
            this.markMessageSpeaking(entity, false);
            this.updateAudioStatus("Audio Ready");
            this.sendAudioFinishedSignal();
            this.currentAudio = null;

            // Stop waveform animation
            this.stopWaveformAnimation(entity);
        };

        audio.onerror = () => {
            console.error("Error playing audio");
            this.updateAudioStatus("Audio Error");
            this.sendAudioFinishedSignal();
            this.currentAudio = null;

            // Stop waveform animation
            this.stopWaveformAnimation(entity);
        };

        audio.play().catch((error) => {
            console.error("Error playing audio:", error);
            this.sendAudioFinishedSignal();
            this.stopWaveformAnimation(entity);
        });
    }

    sendAudioFinishedSignal() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "audio_finished" }));
        }
    }

    handleFinishedSpeaking() {
        this.hideLoading();
        // Additional cleanup if needed
    }

    handleStopped() {
        // Ensure complete cleanup
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.audioQueue = [];
        this.stopWaveformAnimation(1);
        this.stopWaveformAnimation(2);

        this.conversationActive = false;
        this.resetUI();
        this.hideLoading();
        this.updateAudioStatus("Conversation stopped");
    }

    handleError(message) {
        this.showError(message.message || "An unknown error occurred");
        this.conversationActive = false;
        this.resetUI();
        this.hideLoading();
    }

    startConversation() {
        const system1 = this.system1Input.value.trim();
        const system2 = this.system2Input.value.trim();

        if (!system1 || !system2) {
            this.showError("Please enter system prompts for both entities.");
            return;
        }

        // Validate character limits
        if (system1.length > 375) {
            this.showError(
                "System prompt for Entity 1 must be 375 characters or less."
            );
            return;
        }

        if (system2.length > 375) {
            this.showError(
                "System prompt for Entity 2 must be 375 characters or less."
            );
            return;
        }

        if (!this.isConnected) {
            this.updateStatus("connecting", "Connecting...");
            this.connectWebSocket();

            // Wait for connection and then start
            const checkConnection = () => {
                if (this.isConnected) {
                    this.sendStartMessage(system1, system2);
                } else if (
                    this.ws &&
                    this.ws.readyState === WebSocket.CONNECTING
                ) {
                    setTimeout(checkConnection, 100);
                } else {
                    this.showError("Failed to connect to server.");
                }
            };
            setTimeout(checkConnection, 100);
        } else {
            this.sendStartMessage(system1, system2);
        }
    }

    sendStartMessage(system1, system2) {
        this.conversationActive = true;
        this.clearConversation();
        this.showLoading();

        // Update UI
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.enableControls(false);
        this.updateAudioStatus("Starting conversation...");

        // Get response length values
        const responseLengthMap = {
            short: 35,
            medium: 60,
            long: 90,
        };

        // Send start message with all parameters
        const message = {
            type: "start",
            system1: system1,
            system2: system2,
            voice1: this.voice1Select.value,
            voice2: this.voice2Select.value,
            speed1: parseFloat(this.speed1Slider.value),
            speed2: parseFloat(this.speed2Slider.value),
            temperature1: parseFloat(this.temperature1Slider.value),
            temperature2: parseFloat(this.temperature2Slider.value),
            topP1: parseFloat(this.topP1Slider.value),
            topP2: parseFloat(this.topP2Slider.value),

            responseLength1:
                responseLengthMap[this.responseLength1Select.value],
            responseLength2:
                responseLengthMap[this.responseLength2Select.value],
        };

        this.ws.send(JSON.stringify(message));
    }

    stopConversation() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "stop" }));
        }

        // Immediately stop any playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }

        // Clear audio queue
        this.audioQueue = [];

        // Stop all waveform animations immediately
        this.stopWaveformAnimation(1);
        this.stopWaveformAnimation(2);

        this.conversationActive = false;
        this.resetUI();
        this.hideLoading();
        this.updateAudioStatus("Conversation stopped");

        // Add delay before allowing new conversations to prevent race conditions
        this.startBtn.disabled = true;
        setTimeout(() => {
            this.startBtn.disabled = false;
        }, 1000);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        const icon = this.muteBtn.querySelector("i");

        if (this.isMuted) {
            icon.className = "fas fa-volume-mute";
            this.muteBtn.title = "Unmute";
            if (this.currentAudio) {
                this.currentAudio.pause();
            }
        } else {
            icon.className = "fas fa-volume-up";
            this.muteBtn.title = "Mute";
        }

        this.updateAudioStatus(this.isMuted ? "Audio Muted" : "Audio Ready");
    }

    updateVolume(value) {
        this.volume = value / 100;
        if (this.currentAudio) {
            this.currentAudio.volume = this.volume;
        }
        this.updateAudioStatus(`Volume: ${value}%`);

        setTimeout(() => {
            if (!this.currentAudio || this.currentAudio.paused) {
                this.updateAudioStatus("Audio Ready");
            }
        }, 1500);
    }

    addMessage(entity, text, isSpeaking = false) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isSpeaking ? "speaking" : ""}`;
        messageDiv.dataset.entity = entity;

        const timestamp = new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });

        messageDiv.innerHTML = `
            <div class="message-avatar entity-${entity}">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">Entity ${entity}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-text">${this.escapeHtml(text)}</div>
            </div>
        `;

        // Remove welcome message if it exists
        const welcomeMessage =
            this.conversation.querySelector(".welcome-message");
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        this.conversation.appendChild(messageDiv);
        this.conversation.scrollTop = this.conversation.scrollHeight;
    }

    markMessageSpeaking(entity, isSpeaking) {
        const messages = this.conversation.querySelectorAll(
            `[data-entity="${entity}"]`
        );
        const lastMessage = messages[messages.length - 1];

        if (lastMessage) {
            if (isSpeaking) {
                lastMessage.classList.add("speaking");
            } else {
                lastMessage.classList.remove("speaking");
            }
        }
    }

    clearConversation() {
        this.conversation.innerHTML = "";
    }

    updateStatus(status, text) {
        this.statusDot.className = `status-dot ${status}`;
        this.statusText.textContent = text;
    }

    updateAudioStatus(status) {
        this.audioStatus.textContent = status;
    }

    resetUI() {
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.enableControls(true);
    }

    enableControls(enabled) {
        // Disable/enable form controls during conversation
        const controls = [
            this.system1Input,
            this.system2Input,
            this.voice1Select,
            this.voice2Select,
            this.speed1Slider,
            this.speed2Slider,
            this.temperature1Slider,
            this.temperature2Slider,
            this.topP1Slider,
            this.topP2Slider,

            this.responseLength1Select,
            this.responseLength2Select,
            this.settingsToggle1,
            this.settingsToggle2,
        ];

        controls.forEach((control) => {
            control.disabled = !enabled;
        });
    }

    showLoading() {
        this.loadingOverlay.style.display = "flex";
    }

    hideLoading() {
        this.loadingOverlay.style.display = "none";
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorModal.style.display = "flex";
    }

    hideErrorModal() {
        this.errorModal.style.display = "none";
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when the page loads
document.addEventListener("DOMContentLoaded", () => {
    new AIDialogueApp();
});

// Add some helpful console messages for debugging
console.log("AI Dialogue Frontend Loaded");
console.log("Keyboard shortcuts:");
console.log("  Ctrl+Space: Start/Stop conversation");
console.log("  Escape: Close error modal");
