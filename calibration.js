const CalibrationManager = (function() {
    let templates = [null, null, null, null, null];
    let currentIndex = 0;
    let isActive = false;
    let isWaitingForGesture = false;
    let isCollecting = false;
    let captureBuffer = [];
    let recognitionStartTime = 0;
    let collectionStartTime = 0;
    let recognitionInterval = null;
    let collectionInterval = null;
    let expectedGestureId = -1;
    let onCompleteCallback = null;
    
    function start(onComplete) {
        VoiceAssistant.stop();
        
        templates = [null, null, null, null, null];
        currentIndex = 0;
        captureBuffer = [];
        isActive = true;
        onCompleteCallback = onComplete;
        UIManager.resetAllProgress();
        
        startNextGesture();
    }
    
    function startNextGesture() {
        if (currentIndex >= GESTURES.length) {
            finishAllCalibration();
            return;
        }
        
        expectedGestureId = currentIndex;
        isWaitingForGesture = true;
        isCollecting = false;
        captureBuffer = [];
        recognitionStartTime = Date.now();
        VoiceAssistant.speak(`Покажите жест: ${GESTURES[currentIndex]}. У вас ${RECOGNITION_TIMEOUT_SEC} секунд.`);
        
        startRecognitionTimer();
        
        UIManager.updateOverallProgress(currentIndex, GESTURES.length);
        UIManager.showTimer(RECOGNITION_TIMEOUT_SEC);
    }
    
    function startRecognitionTimer() {
        if (recognitionInterval) clearInterval(recognitionInterval);
        
        recognitionInterval = setInterval(() => {
            if (!isActive || !isWaitingForGesture) return;
            
            const elapsed = (Date.now() - recognitionStartTime) / 1000;
            const remaining = RECOGNITION_TIMEOUT_SEC - elapsed;
            
            UIManager.showTimer(remaining);
            
            if (elapsed >= RECOGNITION_TIMEOUT_SEC) {
                clearInterval(recognitionInterval);
                recognitionInterval = null;
                
                if (isActive && isWaitingForGesture) {
                    VoiceAssistant.speak(`Жест не распознан. Попробуем ещё раз: ${GESTURES[currentIndex]}`);
                    recognitionStartTime = Date.now();
                    startRecognitionTimer();
                }
            }
        }, 100);
    }
    
    function onGestureRecognized() {
        if (!isActive || !isWaitingForGesture) return false;

        
        clearInterval(recognitionInterval);
        recognitionInterval = null;
        
        isWaitingForGesture = false;
        isCollecting = true;
        captureBuffer = [];
        collectionStartTime = Date.now();
        
        VoiceAssistant.speak(`Жест распознан. Удерживайте позу ${CALIBRATION_TIME_SEC} секунд для сбора данных.`);
        
        startCollectionTimer();
        
        UIManager.updateOverallProgress(currentIndex, GESTURES.length);
        UIManager.showTimer(CALIBRATION_TIME_SEC);
        
        return true;
    }
    
    function startCollectionTimer() {
        if (collectionInterval) clearInterval(collectionInterval);
        
        collectionInterval = setInterval(() => {
            if (!isActive || !isCollecting) return;
            
            const elapsed = (Date.now() - collectionStartTime) / 1000;
            const remaining = CALIBRATION_TIME_SEC - elapsed;
            const timePercent = (elapsed / CALIBRATION_TIME_SEC) * 100;
            
            UIManager.showTimer(remaining);
            UIManager.updateCurrentGestureProgress(timePercent);
            
            if (elapsed >= CALIBRATION_TIME_SEC) {
                finishCurrentGesture();
            }
        }, 50);
    }
    
    function addFrame(features) {
        if (!isActive || !isCollecting) return;
        if (features) {
            captureBuffer.push(features);
        }
    }
    
    function finishCurrentGesture() {
        if (!isActive || !isCollecting) return;
        
        clearInterval(collectionInterval);
        collectionInterval = null;
        
        const avgFeatures = GestureRecognizer.averageFeatures(captureBuffer);
        
        if (avgFeatures && captureBuffer.length > 0) {
            templates[currentIndex] = avgFeatures;

 
            currentIndex++;
            isCollecting = false;
            UIManager.updateCurrentGestureProgress(0);
            
            if (currentIndex >= GESTURES.length) {
                finishAllCalibration();
            } else {
                setTimeout(() => {
                    if (isActive) startNextGesture();
                }, 1000);
            }
        } else {

            VoiceAssistant.speak("Не удалось собрать данные, повторяем попытку");
            
            isCollecting = false;
            isWaitingForGesture = true;
            recognitionStartTime = Date.now();
            startRecognitionTimer();
        }
    }
    
    function finishAllCalibration() {
        isActive = false;
        isWaitingForGesture = false;
        isCollecting = false;
        
        if (recognitionInterval) clearInterval(recognitionInterval);
        if (collectionInterval) clearInterval(collectionInterval);
        
        UIManager.hideTimer();
        UIManager.updateCurrentGestureProgress(0);
        UIManager.updateOverallProgress(GESTURES.length, GESTURES.length);
        

        VoiceAssistant.speak('Калибровка завершена. Нажмите на кнопку для выбора трека реабилитации.');
        UIManager.setButtonToRehab();
        
        console.group('ИCХОДНЫЕ ЖЕСТЫ (КАЛИБРОВКА ЗАВЕРШЕНА)');
        for (let i = 0; i < templates.length; i++) {
            if (templates[i]) {
                const stats = GestureRecognizer.getTemplateStats(templates[i], GESTURES[i]);
                console.log(`     ${stats.name}: ${stats.dimension} признаков`);
                console.log(`     Среднее: ${stats.mean.toFixed(6)}, Max: ${stats.max.toFixed(6)}, Min: ${stats.min.toFixed(6)}`);
                console.log(`     Первые 5 признаков: [${stats.sample.join(', ')}]`);
            }
        }
        console.groupEnd();
        
        if (onCompleteCallback) onCompleteCallback([...templates]);
    }
    
    function tryRecognizeGesture(features) {
        if (!isActive || !isWaitingForGesture) return false;
        const isMatch = GestureRecognizer.heuristicMatch(features, expectedGestureId);
        if (isMatch) {
            return onGestureRecognized();
        }
        return false;
    }
    
    function addFrameToBuffer(features) {
        addFrame(features);
    }
    
    function getTemplates() { return [...templates]; }
    function getCalibratedCount() { return templates.filter(t => t !== null).length; }
    function isFullyCalibrated() { return getCalibratedCount() === GESTURES.length; }
    function isCalibrating() { return isActive; }
    function isCollectingMode() { return isCollecting; }
    
    function stop() {
        isActive = false;
        isWaitingForGesture = false;
        isCollecting = false;
        if (recognitionInterval) clearInterval(recognitionInterval);
        if (collectionInterval) clearInterval(collectionInterval);
        VoiceAssistant.stop();
        UIManager.hideTimer();
    }
    
    function skipCurrentGesture() {
        if (!isActive) return;
        
        VoiceAssistant.speak(`Пропускаем жест: ${GESTURES[currentIndex]}`);
        currentIndex++;
        
        if (currentIndex >= GESTURES.length) {
            finishAllCalibration();
        } else {
            setTimeout(() => {
                if (isActive) startNextGesture();
            }, 2500);
        }
    }
    
    function forceFinishCurrentGesture() {
        if (!isActive || !isCollecting) return;
        
        VoiceAssistant.speak(`Завершаем сбор данных для жеста: ${GESTURES[currentIndex]}`);
        finishCurrentGesture();
    }
    
    function resumeCalibration() {
        if (isActive) {
            VoiceAssistant.speak('Калибровка уже запущена');
            return false;
        }
        
        if (currentIndex >= GESTURES.length) {
            VoiceAssistant.speak('Калибровка уже завершена');
            return false;
        }
        
        isActive = true;
        captureBuffer = [];
        isWaitingForGesture = true;
        isCollecting = false;
        recognitionStartTime = Date.now();
        
        VoiceAssistant.speak(`Калибровка возобновлена. Показывайте жест: ${GESTURES[currentIndex]}. У вас ${RECOGNITION_TIMEOUT_SEC} секунд.`);
        
        setTimeout(() => {
            VoiceAssistant.restartListening();
            startRecognitionTimer();
        }, 1500);
        
        UIManager.showTimer(RECOGNITION_TIMEOUT_SEC);
        
        return true;
    }
    
    return {
        start,
        tryRecognizeGesture,
        addFrameToBuffer,
        getTemplates,
        getCalibratedCount,
        isFullyCalibrated,
        isCalibrating,
        isCollectingMode,
        stop,
        skipCurrentGesture,
        forceFinishCurrentGesture,
        resumeCalibration
    };
})();