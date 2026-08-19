
/**
 * Pen 11 - Explainer Video Showcase Engine (6-Scene Master Player)
 * Produced according to What a Story Explainer Agency Standards
 * 
 * Architecture:
 * - 60 FPS High-Performance 2D Canvas Engine
 * - HiDPI / Retina Display Native Buffer Scaling
 * - 16:9 Safe Zone Framing (Title & Action Safe)
 * - 6 Interactive Storyline Scenes:
 *   0: The Struggle (समस्या: 0:00 - 0:06)
 *   1: Meet Pen 11 (पैन 11 का आगमन: 0:00 - 0:06)
 *   2: Teaching & Highlighting (हाइलाइटर और एनोटेशन: 0:00 - 0:06)
 *   3: Smart Shapes & Snapping (स्मार्ट शेप्स: 0:00 - 0:06)
 *   4: Ghost Mode & Privacy (घोस्ट मोड: 0:00 - 0:06)
 *   5: Free Download & Zero Bloat (फ्री डाउनलोड: 0:00 - 0:06)
 * - Procedural Web Audio Sound Design (Typing, Sighs, Snaps, Chimes, Clicks)
 * - Clean Transport Controls (Play/Pause, Sound FX Toggle, Scrubbing, Tab Switching)
 */

class ExplainerAudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.lastTrigger = 0;
        this.lastTick = 0;
        this.lastType = 0;
    }

    _init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (!this.muted) this._init();
        return this.muted;
    }

    stepAudio(sceneIdx, t) {
        if (this.muted) return;
        this._init();
        if (!this.ctx) return;

        if (sceneIdx === 0) {
            // Scene 0: Frantic typing (0-2s), Sigh (2.2s), Pop (2.8s), Clock tick (4-6s)
            if (t < 2200) {
                if (t - this.lastType > 110) {
                    this.lastType = t;
                    this._playKeyClick();
                }
            } else if (t >= 2200 && t < 2250) {
                if (t - this.lastTrigger > 500) {
                    this.lastTrigger = t;
                    this._playHeavySigh();
                }
            } else if (t >= 2800 && t < 2850) {
                if (t - this.lastTrigger > 500) {
                    this.lastTrigger = t;
                    this._playPopChirp();
                }
            } else if (t >= 4000) {
                if (t - this.lastTick > 750) {
                    this.lastTick = t;
                    this._playClockTick();
                }
            }
        } else if (sceneIdx === 1) {
            // Scene 1: Arrival whoosh (0.8s), Chime (2.5s)
            if (t >= 800 && t < 850 && t - this.lastTrigger > 1000) {
                this.lastTrigger = t;
                this._playWhoosh();
            } else if (t >= 2500 && t < 2550 && t - this.lastTrigger > 1000) {
                this.lastTrigger = t;
                this._playChimeChord();
            }
        } else if (sceneIdx === 2) {
            // Scene 2: Marker draw friction (1.0s - 3.5s)
            if (t >= 1000 && t <= 3500) {
                if (t - this.lastType > 180) {
                    this.lastType = t;
                    this._playFrictionASMR();
                }
            }
        } else if (sceneIdx === 3) {
            // Scene 3: Snap chord chime at 2.4s
            if (t >= 2400 && t < 2450 && t - this.lastTrigger > 1000) {
                this.lastTrigger = t;
                this._playHarmonicSnap();
            }
        } else if (sceneIdx === 4) {
            // Scene 4: Hotkey click at 1.0s, Ghost whoosh at 1.8s
            if (t >= 1000 && t < 1050 && t - this.lastTrigger > 1000) {
                this.lastTrigger = t;
                this._playKeyClick();
            } else if (t >= 1800 && t < 1850 && t - this.lastTrigger > 1000) {
                this.lastTrigger = t;
                this._playWhoosh();
            }
        } else if (sceneIdx === 5) {
            // Scene 5: Victory chime at 2.0s
            if (t >= 2000 && t < 2050 && t - this.lastTrigger > 1000) {
                this.lastTrigger = t;
                this._playChimeChord();
            }
        }
    }

    _playKeyClick() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const freq = 1200 + Math.random() * 800;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.025);
        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.025);
    }

    _playHeavySigh() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.45;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.45);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.45);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.start();
    }

    _playPopChirp() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(920, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    _playClockTick() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
    }

    _playWhoosh() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.15);
        filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.3);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.start();
    }

    _playChimeChord() {
        if (!this.ctx) return;
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major Chord
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.04);
            gain.gain.setValueAtTime(0.04, this.ctx.currentTime + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.04 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.04);
            osc.stop(this.ctx.currentTime + idx * 0.04 + 0.4);
        });
    }

    _playHarmonicSnap() {
        if (!this.ctx) return;
        const freqs = [659.25, 880.00, 1318.51]; // E5 -> A5 -> E6
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.05);
            gain.gain.setValueAtTime(0.05, this.ctx.currentTime + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.05 + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.05);
            osc.stop(this.ctx.currentTime + idx * 0.05 + 0.25);
        });
    }

    _playFrictionASMR() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220 + Math.random() * 80, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }
}

class ExplainerVideoShowcaseEngine {
    constructor(canvasSelector) {
        this.canvas = document.querySelector(canvasSelector || '#demo-video-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.audio = new ExplainerAudioEngine();

        this.logicalWidth = 960;
        this.logicalHeight = 540; // Strict 16:9 safe zone resolution
        this.dpr = window.devicePixelRatio || 1;

        this.duration = 6000; // 6.0 seconds per scene
        this.sceneTime = 0;
        this.currentScene = 0; // 0 to 5
        this.isPlaying = true;
        this.lastFrameTime = performance.now();

        this.scenesData = [
            {
                badge: '🚨 सीन 1: समस्या (0:00 - 0:06)',
                title: 'विक्रम स्क्रीन शेयर करके थक चुका था...',
                desc: 'वह ऐप का डिज़ाइन समझाते-समझाते परेशान था, पर क्लाइंट को कुछ समझ नहीं आ रहा था।',
                captions: [
                    { start: 0, end: 2200, text: 'विक्रम: "यहाँ बटन का कलर और मार्जिन बदलना है..." (माउस हिलाते हुए)' },
                    { start: 2200, end: 4000, text: 'क्लाइंट: "कहाँ? स्क्रीन पर कुछ समझ नहीं आ रहा!" ❓' },
                    { start: 4000, end: 6000, text: 'विक्रम: "उफ्फ! स्क्रीन शेयरिंग में समझाना कितना मुश्किल है..." 🤦‍♂️' }
                ]
            },
            {
                badge: '✨ सीन 2: समाधान (0:00 - 0:06)',
                title: 'मिलिए Pen 11 से — अल्ट्रा-लाइट और सुपरफास्ट',
                desc: 'डबल-क्लिक करते ही फ्लोटिंग टूलबार तैयार। बिना किसी रुकावट स्क्रीन पर तुरंत ड्रा करें।',
                captions: [
                    { start: 0, end: 2000, text: 'तभी विक्रम ने शुरू किया Pen 11 — हल्का, तेज़ और बेहद आसान! ⚡' },
                    { start: 2000, end: 4000, text: 'डेस्कटॉप पर कहीं भी तुरंत फ्लोटिंग टूलबार एक्टिवेट हो गया।' },
                    { start: 4000, end: 6000, text: 'अब स्क्रीन शेयरिंग में समझाना हुआ चुटकियों का खेल! 🚀' }
                ]
            },
            {
                badge: '🎓 सीन 3: एनोटेशन व हाइलाइटर (0:00 - 0:06)',
                title: 'टीचिंग, प्रजेंटेशन और कोड रिव्यू का बेस्ट टूल',
                desc: 'मल्टीप्लाई ब्लेंड मोड के साथ सेमी-ट्रांसपेरेंट हाइलाइटर और स्मूथ पेन स्ट्रोक्स।',
                captions: [
                    { start: 0, end: 2500, text: 'हाइलाइटर से महत्वपूर्ण कोड और फ़ॉर्मूला को तुरंत मार्क किया ✨' },
                    { start: 2500, end: 4500, text: 'स्मूथ पेन स्ट्रोक्स के साथ रियल-टाइम में एनोटेशन!' },
                    { start: 4500, end: 6000, text: 'क्लाइंट को एक ही नज़र में सब कुछ साफ़ समझ आ गया! 💡' }
                ]
            },
            {
                badge: '📐 सीन 4: स्मार्ट शेप्स (0:00 - 0:06)',
                title: 'ऑटो-स्नैप ज्यामितीय आकृतियाँ और एरो',
                desc: 'रफ़ स्केच बनाएं और Pen 11 उसे तुरंत परफेक्ट सर्कल, रेक्टेंगल या एरो में बदल देगा।',
                captions: [
                    { start: 0, end: 2200, text: 'रफ़ हाथ से सर्कल और एरो बनाया...' },
                    { start: 2200, end: 4200, text: '✨ ऑटो-स्नैप: एक सेकंड में परफेक्ट ज्यामितीय आकृति बन गई!' },
                    { start: 4200, end: 6000, text: 'परफेक्ट एंगल्स और शेप्स बिना किसी झंझट के! 📐' }
                ]
            },
            {
                badge: '🐒 सीन 5: घोस्ट मोड और प्राइवेसी (0:00 - 0:06)',
                title: 'क्यूट मिनिमल पिल (🙈) और क्लिक-थ्रू मोड',
                desc: 'Ctrl + 5 दबाते ही टूलबार सिमट जाता है और आप एनोटेशन के आर-पार काम कर सकते हैं।',
                captions: [
                    { start: 0, end: 2000, text: 'Ctrl + 5 दबाते ही टूलबार क्यूट मिनिमल पिल (🙈) में सिमट गया!' },
                    { start: 2000, end: 4200, text: 'घोस्ट मोड ऑन: एनोटेशन के आर-पार डेस्कटॉप पर क्लिक करें।' },
                    { start: 4200, end: 6000, text: 'फुल प्राइवेसी और ज़ीरो इंटरप्शन! 🛡️' }
                ]
            },
            {
                badge: '⬇️ सीन 6: ज़ीरो ब्लोट डाउनलोड (0:00 - 0:06)',
                title: '< 48MB RAM, 60 FPS और 100% फ्री',
                desc: 'Direct3D 11 हार्डवेयर एक्सेलेरेशन। कोई इंस्टॉलेशन नहीं, सिर्फ़ डाउनलोड और रन।',
                captions: [
                    { start: 0, end: 2500, text: 'मात्र < 48MB RAM का उपयोग — ज़ीरो पीसी लैग! 🪶' },
                    { start: 2500, end: 4500, text: 'Direct3D 11 एक्सेलेरेशन के साथ 60 FPS स्मूथ परफॉरमेंस!' },
                    { start: 4500, end: 6000, text: '100% फ्री, ओपन सोर्स और पोर्टेबल — अभी डाउनलोड करें! ⬇️' }
                ]
            }
        ];

        this.ui = {
            btnPlay: document.querySelector('#demo-btn-play'),
            btnSound: document.querySelector('#demo-btn-sound'),
            progressTrack: document.querySelector('.demo-progress-track'),
            progressBar: document.querySelector('#demo-video-progress'),
            caption: document.querySelector('#demo-video-caption'),
            badge: document.querySelector('#demo-video-badge'),
            title: document.querySelector('#demo-video-title'),
            desc: document.querySelector('#demo-video-desc'),
            tabs: document.querySelectorAll('[data-usecase-tab]')
        };

        this.initUI();
        this.bindEvents();
        this.resize();
        requestAnimationFrame((t) => this.loop(t));
    }

    initUI() {
        this.updateSceneMeta(this.currentScene);
    }

    updateSceneMeta(idx) {
        const data = this.scenesData[idx] || this.scenesData[0];
        if (this.ui.badge) this.ui.badge.textContent = data.badge;
        if (this.ui.title) this.ui.title.textContent = data.title;
        if (this.ui.desc) this.ui.desc.textContent = data.desc;

        if (this.ui.tabs && this.ui.tabs.length > 0) {
            this.ui.tabs.forEach((tab, tIdx) => {
                const isActive = tIdx === idx;
                tab.classList.toggle('active', isActive);
                tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
        }
    }

    updateCaption(idx, t) {
        if (!this.ui.caption) return;
        const data = this.scenesData[idx] || this.scenesData[0];
        const match = data.captions.find(c => t >= c.start && t < c.end);
        if (match && this.ui.caption.textContent !== match.text) {
            this.ui.caption.textContent = match.text;
        }
    }

    resize() {
        if (!this.canvas) return;
        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.logicalWidth * this.dpr;
        this.canvas.height = this.logicalHeight * this.dpr;
    }

    switchScene(idx) {
        if (idx < 0 || idx >= this.scenesData.length) return;
        this.currentScene = idx;
        this.sceneTime = 0;
        this.lastFrameTime = performance.now();
        this.updateSceneMeta(idx);
        this.updateProgress();
    }

    bindEvents() {
        if (this.ui.btnPlay) {
            this.ui.btnPlay.addEventListener('click', () => {
                this.isPlaying = !this.isPlaying;
                const icon = this.ui.btnPlay.querySelector('.material-symbols-rounded');
                if (icon) icon.textContent = this.isPlaying ? 'pause' : 'play_arrow';
                if (this.isPlaying) this.lastFrameTime = performance.now();
            });
        }

        if (this.ui.btnSound) {
            this.ui.btnSound.addEventListener('click', () => {
                const muted = this.audio.toggleMute();
                const icon = this.ui.btnSound.querySelector('.material-symbols-rounded');
                if (icon) icon.textContent = muted ? 'volume_off' : 'volume_up';
            });
        }

        if (this.ui.progressTrack) {
            this.ui.progressTrack.addEventListener('click', (e) => {
                const rect = this.ui.progressTrack.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                this.sceneTime = pct * this.duration;
            });
        }

        if (this.ui.tabs && this.ui.tabs.length > 0) {
            this.ui.tabs.forEach((tab) => {
                tab.addEventListener('click', () => {
                    const tabIdx = parseInt(tab.getAttribute('data-usecase-tab'), 10);
                    if (!isNaN(tabIdx)) {
                        this.switchScene(tabIdx);
                    }
                });
            });
        }

        if (this.canvas) {
            this.canvas.addEventListener('pointerdown', () => {
                this.audio._init();
            }, { once: true });
        }

        window.addEventListener('resize', () => {
            this.resize();
        }, { passive: true });
    }

    loop(timestamp) {
        if (this.isPlaying) {
            const dt = Math.min(timestamp - this.lastFrameTime, 100);
            this.lastFrameTime = timestamp;
            this.sceneTime += dt;

            if (this.sceneTime >= this.duration) {
                // Loop seamlessly to next scene or repeat
                this.sceneTime = 0;
            }

            this.audio.stepAudio(this.currentScene, this.sceneTime);
            this.renderScene(this.currentScene, this.sceneTime);
            this.updateCaption(this.currentScene, this.sceneTime);
            this.updateProgress();
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    updateProgress() {
        if (!this.ui.progressBar) return;
        const pct = (this.sceneTime / this.duration) * 100;
        this.ui.progressBar.style.width = pct + '%';
    }

    // ==========================================
    // 🎨 MASTER MULTI-SCENE DISPATCHER
    // ==========================================
    renderScene(sceneIdx, t) {
        const ctx = this.ctx;
        const w = this.logicalWidth;
        const h = this.logicalHeight;

        // Reset transform to native HiDPI scale
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Dispatch to appropriate scene renderer
        switch (sceneIdx) {
            case 0:
                this.renderScene0(ctx, w, h, t);
                break;
            case 1:
                this.renderScene1(ctx, w, h, t);
                break;
            case 2:
                this.renderScene2(ctx, w, h, t);
                break;
            case 3:
                this.renderScene3(ctx, w, h, t);
                break;
            case 4:
                this.renderScene4(ctx, w, h, t);
                break;
            case 5:
                this.renderScene5(ctx, w, h, t);
                break;
            default:
                this.renderScene0(ctx, w, h, t);
        }

        ctx.restore();
    }

    // ==========================================
    // 🚨 SCENE 0: THE STRUGGLE (0:00 - 0:06)
    // ==========================================
    renderScene0(ctx, w, h, t) {
        // Stage Background
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, w, h);

        const bgGlow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 450);
        bgGlow.addColorStop(0, '#1F2937');
        bgGlow.addColorStop(1, '#0B0F19');
        ctx.fillStyle = bgGlow;
        ctx.fillRect(0, 0, w, h);

        // Camera Ease Zoom between 2s and 4s
        let camScale = 1.0;
        if (t >= 2000 && t < 4000) {
            const zProg = (t - 2000) / 2000;
            camScale = 1.0 + Math.sin(zProg * Math.PI * 0.5) * 0.04;
        } else if (t >= 4000) {
            camScale = 1.04;
        }

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(camScale, camScale);
        ctx.translate(-w / 2, -h / 2);

        // Desk
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(80, 390, 800, 24, 12);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Laptop & App UI
        this.drawLaptopAndAppUI(ctx, 120, 150, t);

        // Vikram Character
        this.drawVikramCharacter(ctx, 720, 250, t);

        ctx.restore();

        // Tension Vignette in Climax Phase (4s - 6s)
        if (t > 3800) {
            const vProg = Math.min(1, (t - 3800) / 1200);
            const vig = ctx.createRadialGradient(w / 2, h / 2, 180, w / 2, h / 2, 480);
            vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vig.addColorStop(1, `rgba(3, 7, 18, ${0.65 * vProg})`);
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, w, h);
        }
    }

    drawLaptopAndAppUI(ctx, x, y, t) {
        ctx.save();
        ctx.translate(x, y);

        // Laptop Outer Frame
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.roundRect(0, 0, 460, 260, 14);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Screen Bezel Inner
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.roundRect(10, 10, 440, 240, 8);
        ctx.fill();

        // Top App Bar of UI Design
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(10, 10, 440, 28);
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.arc(26, 24, 4, 0, Math.PI * 2);
        ctx.arc(38, 24, 4, 0, Math.PI * 2);
        ctx.arc(50, 24, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('⚡ E-Commerce App Layout (v3.2 - In Review)', 70, 28);

        // Sidebar
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(10, 38, 90, 212);
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = '#CBD5E1';
            ctx.beginPath();
            ctx.roundRect(22, 55 + i * 32, 66, 16, 4);
            ctx.fill();
        }

        // Main App Content Grid
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.roundRect(115, 55, 180, 70, 6);
        ctx.fill();

        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.roundRect(115, 135, 85, 50, 6);
        ctx.roundRect(210, 135, 85, 50, 6);
        ctx.fill();

        // Misaligned Broken Button
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.roundRect(115, 195, 110, 28, 6);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('Order Now →', 135, 212);

        // Frantic Mouse Tracking (0 - 2.8s)
        if (t < 2800) {
            const mProg = (t / 2800) * Math.PI * 6;
            const curX = 170 + Math.sin(mProg * 1.5) * 60;
            const curY = 160 + Math.cos(mProg * 2) * 35;

            // Mouse trail dots
            ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.beginPath();
            ctx.arc(curX - 6, curY - 6, 4, 0, Math.PI * 2);
            ctx.fill();

            // Cursor Icon
            ctx.fillStyle = '#0F172A';
            ctx.font = '18px sans-serif';
            ctx.fillText('↖️', curX, curY);
        }

        // Zoom Video Call PIP Window (Top Right)
        const pipX = 310;
        const pipY = 48;
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.roundRect(pipX, pipY, 130, 95, 8);
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Live Badge
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(pipX + 14, pipY + 12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('CLIENT LIVE', pipX + 22, pipY + 15);

        // Client Character Inside Call
        ctx.fillStyle = '#FCD34D';
        ctx.beginPath();
        ctx.arc(pipX + 65, pipY + 48, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(pipX + 65, pipY + 44, 17, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();

        // Eyebrows
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pipX + 57, pipY + 42); ctx.lineTo(pipX + 63, pipY + 45);
        ctx.moveTo(pipX + 67, pipY + 40); ctx.lineTo(pipX + 73, pipY + 43);
        ctx.stroke();

        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(pipX + 60, pipY + 48, 1.8, 0, Math.PI * 2);
        ctx.arc(pipX + 70, pipY + 48, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.beginPath();
        ctx.arc(pipX + 65, pipY + 56, 3, 0, Math.PI);
        ctx.stroke();

        // Client Question Marks
        if (t > 2200) {
            const qProg = Math.min(1, (t - 2200) / 400);
            const qScale = 1 + Math.sin(qProg * Math.PI) * 0.25;

            ctx.save();
            ctx.translate(pipX + 65, pipY - 10);
            ctx.scale(qScale, qScale);

            ctx.fillStyle = '#F59E0B';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('???', 0, 0);
            ctx.restore();
        }

        ctx.restore();
    }

    drawVikramCharacter(ctx, x, y, t) {
        ctx.save();
        ctx.translate(x, y);

        // Shoulder sigh drop offset at 2.4s
        let sighDrop = 0;
        if (t >= 2400 && t < 4000) {
            sighDrop = Math.sin(((t - 2400) / 1600) * Math.PI) * 7;
        } else if (t >= 4000) {
            sighDrop = 5;
        }

        // Body / Navy Shirt
        ctx.fillStyle = '#34495E';
        ctx.beginPath();
        ctx.roundRect(-42, 70 + sighDrop, 84, 90, [20, 20, 0, 0]);
        ctx.fill();
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Collar
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-16, 70 + sighDrop);
        ctx.lineTo(0, 92 + sighDrop);
        ctx.lineTo(16, 70 + sighDrop);
        ctx.fill();

        // Head
        const breathe = Math.sin(t * 0.003) * 1.5;
        const headY = 10 + sighDrop + breathe;

        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(0, headY, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Hair
        const hairBounce = Math.sin(t * 0.005) * 1.2;
        ctx.fillStyle = '#1F2937';
        ctx.beginPath();
        ctx.arc(0, headY - 6 + hairBounce, 38, Math.PI * 0.75, Math.PI * 2.25);
        ctx.fill();
        ctx.stroke();

        // Eyebrows & Eyes
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 3.5;

        if (t < 2200) {
            ctx.beginPath();
            ctx.moveTo(-20, headY - 12); ctx.lineTo(-6, headY - 8);
            ctx.moveTo(6, headY - 8); ctx.lineTo(20, headY - 12);
            ctx.stroke();

            ctx.fillStyle = '#1F2937';
            ctx.beginPath();
            ctx.arc(-14, headY - 2, 3.5, 0, Math.PI * 2);
            ctx.arc(10, headY - 2, 3.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(-20, headY - 8); ctx.lineTo(-6, headY - 14);
            ctx.moveTo(6, headY - 14); ctx.lineTo(20, headY - 8);
            ctx.stroke();

            ctx.fillStyle = '#1F2937';
            ctx.beginPath();
            ctx.arc(-12, headY, 4, 0, Math.PI * 2);
            ctx.arc(12, headY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glasses
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-12, headY, 9, 0, Math.PI * 2);
        ctx.arc(12, headY, 9, 0, Math.PI * 2);
        ctx.moveTo(-3, headY); ctx.lineTo(3, headY);
        ctx.stroke();

        // Mouth
        ctx.strokeStyle = '#991B1B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (t < 2200) {
            ctx.moveTo(-10, headY + 18); ctx.quadraticCurveTo(0, headY + 12, 10, headY + 18);
        } else {
            ctx.ellipse(0, headY + 18, 5, 8, 0, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Right Arm
        ctx.fillStyle = '#34495E';
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 4;

        if (t < 2800) {
            const armShake = Math.sin(t * 0.04) * 3;
            ctx.beginPath();
            ctx.moveTo(35, 85 + sighDrop);
            ctx.quadraticCurveTo(65, 110, 45, 140 + armShake);
            ctx.stroke();

            ctx.fillStyle = '#FBBF24';
            ctx.beginPath();
            ctx.arc(45, 140 + armShake, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (t >= 4000) {
            ctx.beginPath();
            ctx.moveTo(35, 85 + sighDrop);
            ctx.quadraticCurveTo(55, 40, 20, headY - 10);
            ctx.stroke();

            ctx.fillStyle = '#FBBF24';
            ctx.beginPath();
            ctx.arc(20, headY - 10, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Confusion Loops
        if (t > 2000) {
            const sqProg = (t - 2000) * 0.005;
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            const cx = 0;
            const cy = headY - 55;

            for (let a = 0; a <= Math.PI * 4; a += 0.3) {
                const r = 12 + a * 3.5 + Math.sin(sqProg * 6 + a * 2) * 3;
                const px = cx + Math.cos(a + sqProg) * r;
                const py = cy + Math.sin(a + sqProg) * r;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    // ==========================================
    // ✨ SCENE 1: MEET PEN 11 (0:00 - 0:06)
    // ==========================================
    renderScene1(ctx, w, h, t) {
        // Modern Clean Desktop Background
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, w, h);

        const glow = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 480);
        glow.addColorStop(0, '#1E293B');
        glow.addColorStop(1, '#090D16');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);

        // Windows 11 Desktop Taskbar Mockup at bottom
        ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
        ctx.fillRect(0, h - 44, w, 44);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h - 44); ctx.lineTo(w, h - 44);
        ctx.stroke();

        // Taskbar Center Icons
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = ['#38BDF8', '#818CF8', '#34D399', '#FBBF24', '#F43F5E'][i];
            ctx.beginPath();
            ctx.roundRect(w / 2 - 80 + i * 36, h - 34, 24, 24, 6);
            ctx.fill();
        }

        // Floating Pen 11 Toolbar Entrance (0.5s - 2.5s)
        const tbProg = Math.min(1, t / 1500);
        const tbY = -60 + tbProg * 140; // Glides smoothly from top
        const tbX = w / 2 - 180;

        // Toolbar Shadow & Glow
        ctx.save();
        ctx.shadowColor = 'rgba(56, 189, 248, 0.35)';
        ctx.shadowBlur = 24;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(tbX, tbY, 360, 56, 28);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Toolbar App Logo & Tools
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('✒️ Pen 11', tbX + 20, tbY + 35);

        // Action Buttons inside Toolbar
        const tools = ['✏️', '🖍️', '🧹', '📐', '🎨'];
        tools.forEach((tool, idx) => {
            const btnX = tbX + 130 + idx * 44;
            const isHover = (t > 2500 && idx === 0);
            ctx.fillStyle = isHover ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            ctx.arc(btnX + 16, tbY + 28, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(tool, btnX + 16, tbY + 34);
        });

        // Double-Click Spark Wave (2.0s - 3.5s)
        if (t > 2000 && t < 4000) {
            const waveProg = (t - 2000) / 2000;
            ctx.strokeStyle = `rgba(56, 189, 248, ${1 - waveProg})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tbX + 146, tbY + 28, 20 + waveProg * 50, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Hero Spotlight Card below
        ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.beginPath();
        ctx.roundRect(w / 2 - 280, 200, 560, 200, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ Instant Zero-Lag Annotation Tool', w / 2, 250);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '15px sans-serif';
        ctx.fillText('• Ultra-lightweight: < 48MB Memory Footprint', w / 2, 295);
        ctx.fillText('• Native Direct3D 11 GPU Rendering (60 FPS)', w / 2, 325);
        ctx.fillText('• Double-Click & Draw Anywhere on Windows 11', w / 2, 355);

        ctx.textAlign = 'left';
    }

    // ==========================================
    // 🎓 SCENE 2: TEACHING & HIGHLIGHTING (0:00 - 0:06)
    // ==========================================
    renderScene2(ctx, w, h, t) {
        ctx.fillStyle = '#18181B';
        ctx.fillRect(0, 0, w, h);

        // Code / Slide Window
        ctx.fillStyle = '#27272A';
        ctx.beginPath();
        ctx.roundRect(80, 60, 800, 420, 12);
        ctx.fill();
        ctx.strokeStyle = '#3F3F46';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Code Editor Tab Bar
        ctx.fillStyle = '#18181B';
        ctx.beginPath();
        ctx.roundRect(80, 60, 800, 36, [12, 12, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#A1A1AA';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('📄 Lecture_Algorithms_04.js', 110, 83);

        // Sample Code Lines
        const lines = [
            '1  // Calculate Optimised Rendering Matrix',
            '2  function renderFrame(dpr, width, height) {',
            '3      const matrix = new Float32Array(16);',
            '4      matrix[0] = dpr;  matrix[5] = dpr;',
            '5      return matrix;',
            '6  }'
        ];

        ctx.font = '16px monospace';
        lines.forEach((line, idx) => {
            ctx.fillStyle = idx === 3 ? '#FACC15' : '#E4E4E7';
            ctx.fillText(line, 110, 140 + idx * 36);
        });

        // Highlighter Stroke Animation (1.0s - 3.5s)
        if (t > 1000) {
            const hProg = Math.min(1, (t - 1000) / 2500);
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(250, 204, 21, 0.38)';
            ctx.fillRect(110, 225, 420 * hProg, 28);
            ctx.restore();
        }

        // Red Pen Handwritten Note & Arrow (3.5s - 6.0s)
        if (t > 3500) {
            const nProg = Math.min(1, (t - 3500) / 2000);
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 3.5;
            ctx.beginPath();

            // Hand-drawn arrow
            ctx.moveTo(560, 240);
            ctx.quadraticCurveTo(620, 200, 680, 230);
            ctx.lineTo(665, 215);
            ctx.moveTo(680, 230);
            ctx.lineTo(670, 245);
            ctx.stroke();

            // Note Text
            ctx.fillStyle = '#EF4444';
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText('⚡ Key Scaling Logic!', 570, 190);
        }
    }

    // ==========================================
    // 📐 SCENE 3: SMART SHAPES & SNAPPING (0:00 - 0:06)
    // ==========================================
    renderScene3(ctx, w, h, t) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, w, h);

        // Blueprint Grid Background
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Stage Title
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📐 AI Smart Shape Snapping & Precision Vectors', w / 2, 60);

        // Left: Rough Hand Circle (0-2.4s) -> Perfect Circle (2.4s-6s)
        const leftX = 280;
        const centerY = 270;

        if (t < 2400) {
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 3;
            ctx.beginPath();
            // Imperfect hand-drawn loop
            for (let a = 0; a <= Math.PI * 2; a += 0.2) {
                const r = 80 + Math.sin(a * 5) * 6;
                const px = leftX + Math.cos(a) * r;
                const py = centerY + Math.sin(a) * r;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = '#94A3B8';
            ctx.font = '14px sans-serif';
            ctx.fillText('Rough Freehand Sketch...', leftX, centerY + 120);
        } else {
            // Snapped Perfect Circle with Sparkles
            const snapProg = Math.min(1, (t - 2400) / 400);
            const scale = 1 + Math.sin(snapProg * Math.PI) * 0.15;

            ctx.save();
            ctx.translate(leftX, centerY);
            ctx.scale(scale, scale);

            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 80, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#10B981';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText('✨ Auto-Snapped Perfect Circle!', leftX, centerY + 120);
        }

        // Right: Arrow Snapping
        const rightX = 680;
        if (t < 2400) {
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(rightX - 80, centerY + 40);
            ctx.lineTo(rightX + 60, centerY - 30);
            ctx.lineTo(rightX + 40, centerY - 10);
            ctx.stroke();

            ctx.fillStyle = '#94A3B8';
            ctx.font = '14px sans-serif';
            ctx.fillText('Wobbly Arrow Sketch', rightX, centerY + 120);
        } else {
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(rightX - 90, centerY + 40);
            ctx.lineTo(rightX + 80, centerY - 40);
            ctx.lineTo(rightX + 50, centerY - 40);
            ctx.moveTo(rightX + 80, centerY - 40);
            ctx.lineTo(rightX + 80, centerY - 10);
            ctx.stroke();

            ctx.fillStyle = '#38BDF8';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText('✨ Snapped 45° Precision Vector', rightX, centerY + 120);
        }

        ctx.textAlign = 'left';
    }

    // ==========================================
    // 🐒 SCENE 4: GHOST MODE & PRIVACY (0:00 - 0:06)
    // ==========================================
    renderScene4(ctx, w, h, t) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, w, h);

        // Hotkey Pill Header
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.beginPath();
        ctx.roundRect(w / 2 - 140, 40, 280, 40, 20);
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⌨️ Hotkey: Ctrl + 5', w / 2, 65);

        // Transformation from Toolbar to Monkey Pill
        const isCollapsed = t > 1800;
        const pillWidth = isCollapsed ? 64 : 320;
        const pillX = w / 2 - pillWidth / 2;
        const pillY = 160;

        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillWidth, 54, 27);
        ctx.fill();
        ctx.strokeStyle = isCollapsed ? '#F59E0B' : '#475569';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (isCollapsed) {
            ctx.font = '28px sans-serif';
            ctx.fillText('🙈', w / 2, pillY + 38);
        } else {
            ctx.fillStyle = '#F8FAFC';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('✒️ Pen 11 Full Toolbar', w / 2, pillY + 34);
        }

        // Ghost Click-Through Demonstration
        ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
        ctx.beginPath();
        ctx.roundRect(w / 2 - 240, 260, 480, 180, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isCollapsed ? '#34D399' : '#94A3B8';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(isCollapsed ? '🛡️ Ghost Click-Through: ENABLED' : '🔒 Normal Draw Mode: ACTIVE', w / 2, 310);

        ctx.fillStyle = '#CBD5E1';
        ctx.font = '14px sans-serif';
        ctx.fillText('All mouse clicks pass directly through ink to underlying desktop apps.', w / 2, 350);
        ctx.fillText('Ink stays visible while you interact with web pages & spreadsheets!', w / 2, 380);

        ctx.textAlign = 'left';
    }

    // ==========================================
    // ⬇️ SCENE 5: FREE DOWNLOAD & ZERO BLOAT (0:00 - 0:06)
    // ==========================================
    renderScene5(ctx, w, h, t) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, w, h);

        // Background Radial Flare
        const flare = ctx.createRadialGradient(w / 2, 220, 20, w / 2, 220, 400);
        flare.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
        flare.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = flare;
        ctx.fillRect(0, 0, w, h);

        // Metric Comparison Cards
        // Card 1: Heavy Competitors
        ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.beginPath();
        ctx.roundRect(140, 80, 300, 180, 14);
        ctx.fill();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❌ Traditional Screen Tools', 290, 115);
        ctx.fillStyle = '#FCA5A5';
        ctx.font = '14px sans-serif';
        ctx.fillText('• 380MB+ RAM Consumption', 290, 155);
        ctx.fillText('• Noticeable PC Lag & Stutters', 290, 185);
        ctx.fillText('• Clunky Multi-Window Bloat', 290, 215);

        // Card 2: Pen 11 Excellence
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.beginPath();
        ctx.roundRect(520, 80, 300, 180, 14);
        ctx.fill();
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('✨ Pen 11 (Windows 11 Native)', 670, 115);
        ctx.fillStyle = '#6EE7B7';
        ctx.font = '14px sans-serif';
        ctx.fillText('• < 48MB Featherweight RAM', 670, 155);
        ctx.fillText('• 60 FPS Direct3D 11 Render', 670, 185);
        ctx.fillText('• 100% Free & Portable EXE', 670, 215);

        // Big Pulsing CTA Button
        const pulse = Math.sin(t * 0.006) * 4;
        const btnW = 380;
        const btnH = 64;
        const btnX = w / 2 - btnW / 2;
        const btnY = 320 - pulse / 2;

        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 32);
        ctx.fill();

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('⬇️ Download Pen 11 Free for Windows', w / 2, btnY + 40);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '13px sans-serif';
        ctx.fillText('No Registration Required • Direct Portable Download • 100% Virus-Free', w / 2, 430);

        ctx.textAlign = 'left';
    }
}

// Initialize on DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ExplainerVideoShowcaseEngine());
} else {
    new ExplainerVideoShowcaseEngine();
}