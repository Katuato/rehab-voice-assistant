
const VoiceAssistant = (function() {
    let queue = [];
    let isPlaying = false;
    let recognition = null;
    let isListening = false;
    let onCommandCallback = null;
    

    function beep() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            oscillator.connect(gain);
            gain.connect(audioCtx.destination);
            
            oscillator.frequency.value = 800;
            gain.gain.value = 0.3;
            
            oscillator.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
            oscillator.stop(audioCtx.currentTime + 0.5);
            
            audioCtx.resume();
        } catch(e) {
        }
    }
    
    function speak(text) {
    
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ru-RU';
                utterance.rate = 0.9;
                utterance.pitch = 1;
                utterance.volume = 1;
                
                utterance.onerror = (e) => {
                    if (e.error === 'interrupted' || e.error === 'synthesis-failed') {
                        beep();
                    }
                };
                
                window.speechSynthesis.speak(utterance);

                return;
            } catch(e) {

            }
        }

        beep();
    }
    
    function stop() {
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
            } catch(e) {}
        }
        queue = [];
        isPlaying = false;
    }
    
    async function requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            return false;
        }
    }
    
    function initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return false;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'ru-RU';
        
        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            
            let command = null;
            if (transcript.includes('старт') || transcript.includes('начать')) {
                command = 'start';
            } else if (transcript.includes('стоп') || transcript.includes('остановить')) {
                command = 'stop';
            } else if (transcript.includes('дальше')) {
                command = 'next';
            } else if (transcript.includes('продолжить') || transcript.includes('продолжение')) {
                command = 'continue';
            } else if (transcript.includes('заново') || transcript.includes('сброс')) {
                command = 'reset';
            }
            
            if (command && onCommandCallback) {
                onCommandCallback(command);
            }
        };
        

        
        recognition.onend = () => {
            isListening = false;
        };
        
        return true;
    }
    
    function startListening(onCommand) {
        if (!recognition && !initSpeechRecognition()) {
            speak('Распознавание речи не поддерживается в этом браузере');
            return false;
        }
        
        if (isListening) return true;
        
        onCommandCallback = onCommand;
        try {
            recognition.start();
            isListening = true;
            return true;
        } catch (error) {
            return false;
        }
    }
    
    function stopListening() {
        if (recognition && isListening) {
            recognition.stop();
            isListening = false;
            onCommandCallback = null;
        }
    }
    
    function restartListening() {
        if (!recognition && !initSpeechRecognition()) {
            return false;
        }
        
        try {
            if (isListening) return true;
            
            recognition.start();
            isListening = true;
            return true;
        } catch (error) {
            return false;
        }
    }
    
    return {
        speak,
        stop,
        beep,
        requestMicrophonePermission,
        startListening,
        stopListening,
        restartListening
    };
})();