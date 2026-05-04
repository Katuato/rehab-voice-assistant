const App = (function() {
    let templates = [null, null, null, null, null];
    let rehabMode = false;
    let lastRecognitionTime = 0;
    let lastGesture = -1;
    let isCalibrationStarted = false;
    let calibrationCompleted = false;
    let isCalibrationPaused = false; 
    
    async function init() {
        await CameraModule.init(processFrame);
        await VoiceAssistant.requestMicrophonePermission();
        UIManager.setButtonToCalibration();
        setupEventListeners();
    }
    
    function processFrame(results) {
        const ctx = UIManager.getCanvasContext();
        const canvas = UIManager.getCanvas();
        if (!ctx || !canvas) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        
        if (results.image) {
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        }
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            UIManager.drawSkeleton(ctx, landmarks, canvas.width, canvas.height);
            const features = GestureRecognizer.extractFeatures(landmarks);
            
            if (CalibrationManager.isCalibrating()) {
                if (CalibrationManager.isCollectingMode() && features) {
                    CalibrationManager.addFrameToBuffer(features);
                } else if (features && !CalibrationManager.isCollectingMode()) {
                    CalibrationManager.tryRecognizeGesture(features);
                }
                ctx.restore();
                return;
            }
            
            if (rehabMode && features && templates.some(t => t !== null)) {
                const gestureId = GestureRecognizer.recognize(features, templates);
                const now = Date.now();
                if (gestureId !== -1 && gestureId !== lastGesture && now - lastRecognitionTime > REHAB_COOLDOWN_MS) {
                    lastGesture = gestureId;
                    lastRecognitionTime = now;
                    VoiceAssistant.speak(`Отлично! ${GESTURES[gestureId]}`);
                }
            }
        }
        ctx.restore();
    }
    
    function startCalibration() {
        isCalibrationStarted = true;
        isCalibrationPaused = false; 
        rehabMode = false;
        calibrationCompleted = false;
        CalibrationManager.stop();

        VoiceAssistant.speak("Начинаем калибровку пяти жестов");
        
        CalibrationManager.start((newTemplates) => {
            templates = newTemplates;
            isCalibrationStarted = false;
            calibrationCompleted = true;
            UIManager.setButtonToRehab();
        });
    }
    
    function startRehabilitation() {
        if (!calibrationCompleted && !CalibrationManager.isFullyCalibrated()) {
            VoiceAssistant.speak("Сначала завершите калибровку.");
            return;
        }
        
        templates = CalibrationManager.getTemplates();
        rehabMode = true;
        CalibrationManager.stop();
        
        VoiceAssistant.speak("Реабилитация запущена. Показывайте жесты.");
    }
    
    function setupEventListeners() {
        const btn = document.getElementById('mainBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                if (calibrationCompleted || CalibrationManager.isFullyCalibrated()) {
                    startRehabilitation();
                } else {
                    startCalibration();
                }
            });
        }

        const beginBtn = document.getElementById('beginBtn');
        const introScreen = document.querySelector('.intro-screen');
        const appContainer = document.querySelector('.container');
        if (beginBtn && introScreen && appContainer) {
            beginBtn.addEventListener('click', () => {
                introScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');
            });
        }
        

        VoiceAssistant.startListening(handleGlobalVoiceCommand);
    }
    
    function handleGlobalVoiceCommand(command) {
        if (CalibrationManager.isCalibrating()) {
            switch (command) {
                case 'stop':
                    CalibrationManager.stop();
                    isCalibrationStarted = false;
                    isCalibrationPaused = true; 
                    UIManager.setButtonToCalibration();
                    VoiceAssistant.speak('Калибровка остановлена');
                    setTimeout(() => {
                        VoiceAssistant.restartListening();
                    }, 1500);
                    break;
                case 'next':
                    if (CalibrationManager.isCollectingMode()) {
                        VoiceAssistant.speak('Завершаем сбор данных для текущего жеста');
                        CalibrationManager.forceFinishCurrentGesture();
                    } else {
                        VoiceAssistant.speak('Пропускаем текущий жест');
                        CalibrationManager.skipCurrentGesture();
                    }
                    break;
                case 'continue':
                    VoiceAssistant.speak('Возобновляем калибровку');
                    CalibrationManager.resumeCalibration();
                    break;
                case 'reset':
                    CalibrationManager.stop();
                    isCalibrationStarted = false;
                    isCalibrationPaused = false;
                    calibrationCompleted = false;
                    templates = [null, null, null, null, null];
                    UIManager.resetAllProgress();
                    UIManager.setButtonToCalibration();
                    VoiceAssistant.speak('Калибровка сброшена. Запускаем новую калибровку.');
                    setTimeout(() => {
                        startCalibration();
                    }, 1500);
                    break;
                default:
                    VoiceAssistant.speak('Команда не распознана во время калибровки');
            }
            return;
        }
        

        switch (command) {
            case 'start':
                if (isCalibrationPaused) {
                    VoiceAssistant.speak('Используйте команду продолжить для возобновления калибровки');
                } else if (!isCalibrationStarted && !calibrationCompleted) {
                    startCalibration();
                } else if (calibrationCompleted) {
                    startRehabilitation();
                } else {
                    VoiceAssistant.speak('Калибровка уже запущена');
                }
                break;
            case 'stop':
                if (rehabMode) {
                    rehabMode = false;
                    VoiceAssistant.speak('Реабилитация остановлена');
                } else {
                    VoiceAssistant.speak('Нечего останавливать');
                }
                break;
            case 'continue':
                if (isCalibrationPaused) {
                    isCalibrationPaused = false;
                    CalibrationManager.resumeCalibration();
                } else {
                    VoiceAssistant.speak('Нечего возобновлять. Используйте старт для начала калибровки');
                    setTimeout(() => {
                        VoiceAssistant.restartListening();
                    }, 1500);
                }
                break;
            case 'reset':
                isCalibrationPaused = false;
                if (CalibrationManager.isCalibrating()) {
                    CalibrationManager.stop();
                    isCalibrationStarted = false;
                }
                templates = [null, null, null, null, null];
                calibrationCompleted = false;
                UIManager.resetAllProgress();
                UIManager.setButtonToCalibration();
                VoiceAssistant.speak('Калибровка сброшена. Запускаем новую калибровку.');
                setTimeout(() => {
                    startCalibration();
                }, 1500);
                break;
            default:
                VoiceAssistant.speak('Команда не распознана');
                setTimeout(() => {
                    VoiceAssistant.restartListening();
                }, 1500);
        }
    }
    
    init();
    
    return { startCalibration, startRehabilitation };
})();