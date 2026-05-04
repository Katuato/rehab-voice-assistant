
const UIManager = (function() {
    let elements = {};
    
    function cacheElements() {
        elements = {
            videoCanvas: document.getElementById('videoCanvas'),
            timerDisplay: document.getElementById('timerDisplay'),
            progressFill: document.getElementById('progressFill'),
            timeProgressFill: document.getElementById('timeProgressFill'),
            mainBtn: document.getElementById('mainBtn')
        };
    }
    
    function setButtonToCalibration() {
        if (elements.mainBtn) {
            elements.mainBtn.innerHTML = 'НАЧАТЬ КАЛИБРОВКУ';
            elements.mainBtn.classList.remove('rehab');
        }
    }
    
    function setButtonToRehab() {
        if (elements.mainBtn) {
            elements.mainBtn.innerHTML = 'ЗАПУСТИТЬ РЕАБИЛИТАЦИЮ';
            elements.mainBtn.classList.add('rehab');
        }
    }
    
    function updateOverallProgress(gestureIndex, totalGestures) {
        const percent = (gestureIndex / totalGestures) * 100;
        if (elements.progressFill) {
            elements.progressFill.style.width = `${percent}%`;
        }
    }
    
    function updateCurrentGestureProgress(percent) {
        if (elements.timeProgressFill) {
            elements.timeProgressFill.style.width = `${percent || 0}%`;
        }
    }
    
    function showTimer(seconds) {
        if (elements.timerDisplay) {
            if (seconds > 0) {
                elements.timerDisplay.textContent = `${Math.ceil(seconds)}`;
                elements.timerDisplay.style.display = 'flex';
            } else {
                elements.timerDisplay.style.display = 'none';
            }
        }
    }
    
    function hideTimer() {
        if (elements.timerDisplay) {
            elements.timerDisplay.style.display = 'none';
        }
    }
    
    function resetAllProgress() {
        if (elements.progressFill) elements.progressFill.style.width = '0%';
        if (elements.timeProgressFill) elements.timeProgressFill.style.width = '0%';
        hideTimer();
    }
    
    function getCanvas() {
        return elements.videoCanvas;
    }
    
    function getCanvasContext() {
        return elements.videoCanvas ? elements.videoCanvas.getContext('2d') : null;
    }
    
    function drawSkeleton(ctx, landmarks, width, height) {
        if (!ctx || !landmarks) return;
        
        for (const lm of landmarks) {
            ctx.beginPath();
            ctx.arc(lm.x * width, lm.y * height, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "#00FFCC";
            ctx.fill();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        const connections = [
            [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],
            [5,9],[9,10],[10,11], [9,13],[13,14],[14,15],
            [13,17],[17,18],[18,19], [0,17]
        ];
        
        for (const conn of connections) {
            if (landmarks[conn[0]] && landmarks[conn[1]]) {
                const p1 = landmarks[conn[0]];
                const p2 = landmarks[conn[1]];
                ctx.beginPath();
                ctx.moveTo(p1.x * width, p1.y * height);
                ctx.lineTo(p2.x * width, p2.y * height);
                ctx.strokeStyle = "#FFAA33";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
    
    cacheElements();
    
    return {
        setButtonToCalibration,
        setButtonToRehab,
        updateOverallProgress,
        updateCurrentGestureProgress,
        showTimer,
        hideTimer,
        resetAllProgress,
        getCanvas,
        getCanvasContext,
        drawSkeleton,
        getMainBtn: () => elements.mainBtn
    };
})();