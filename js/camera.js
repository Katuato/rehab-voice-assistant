
const CameraModule = (function() {
    let camera = null;
    let hands = null;
    let frameCallback = null;
    let isInitialized = false;
    
    async function init(onFrame) {
        frameCallback = onFrame;
        
        hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.6
        });
        
        hands.onResults(onResults);
        
        const videoElement = document.createElement('video');
        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (hands) await hands.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });
        
        await camera.start();
        isInitialized = true;
        return true;
    }
    
    function onResults(results) {
        if (frameCallback) frameCallback(results);
    }
    
    function stop() {
        if (camera) camera.stop();
        isInitialized = false;
    }
    
    return { init, stop, isInitialized: () => isInitialized };
})();