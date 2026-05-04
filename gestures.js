
const GestureRecognizer = (function() {
    
    function extractFeatures(landmarks) {
        if (!landmarks || landmarks.length < 21) return null;
        
        const features = [];
        const wrist = landmarks[0];
        
        for (let i = 1; i <= 20; i++) {
            features.push(landmarks[i].x - wrist.x);
            features.push(landmarks[i].y - wrist.y);
            features.push((landmarks[i].z || 0) - (wrist.z || 0));
        }
        
        const tips = [4, 8, 12, 16, 20];
        for (let i = 0; i < tips.length; i++) {
            for (let j = i + 1; j < tips.length; j++) {
                const p1 = landmarks[tips[i]];
                const p2 = landmarks[tips[j]];
                features.push(Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0)));
            }
        }
        
        const mcpIndices = [1, 5, 9, 13, 17];
        for (let i = 0; i < mcpIndices.length; i++) {
            const tip = tips[i];
            const mcp = mcpIndices[i];
            const length = Math.hypot(
                landmarks[tip].x - landmarks[mcp].x,
                landmarks[tip].y - landmarks[mcp].y,
                (landmarks[tip].z || 0) - (landmarks[mcp].z || 0)
            );
            features.push(length);
        }
        
        return features;
    }
    
    function cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return -1;
        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            magA += vecA[i] * vecA[i];
            magB += vecB[i] * vecB[i];
        }
        if (magA === 0 || magB === 0) return -1;
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    }
    
    function averageFeatures(buffer) {
        if (!buffer.length) return null;
        const sum = new Array(buffer[0].length).fill(0);
        for (const feat of buffer) {
            for (let i = 0; i < feat.length; i++) sum[i] += feat[i];
        }
        return sum.map(v => v / buffer.length);
    }
    
    function recognize(features, templates) {
        if (!features || !templates) return -1;
        let bestId = -1, bestScore = -1;
        for (let i = 0; i < templates.length; i++) {
            if (templates[i]) {
                const score = cosineSimilarity(features, templates[i]);
                if (score > bestScore) {
                    bestScore = score;
                    bestId = i;
                }
            }
        }
        return bestScore > SIMILARITY_THRESHOLD ? bestId : -1;
    }
    
    function getTemplateStats(template, gestureName) {
        if (!template) return null;
        return {
            name: gestureName,
            dimension: template.length,
            mean: template.reduce((a, b) => a + b, 0) / template.length,
            max: Math.max(...template),
            min: Math.min(...template),
            sample: template.slice(0, 10).map(v => v.toFixed(4))
        };
    }

    function heuristicMatch(features, expectedId) {
        if (!features) return false;
        const fingerDistances = features.slice(60, 70);
        const avgDistance = fingerDistances.reduce((a, b) => a + b, 0) / fingerDistances.length;
        
        switch(expectedId) {
            case 0: return avgDistance > 0.12;
            case 1: return avgDistance < 0.06;
            case 2: return avgDistance > 0.08 && avgDistance < 0.15;
            case 3: return avgDistance > 0.05 && avgDistance < 0.12;
            case 4: return avgDistance > 0.07 && avgDistance < 0.14;
            default: return false;
        }
    }
    
    return {
        extractFeatures,
        cosineSimilarity,
        averageFeatures,
        recognize,
        getTemplateStats,
        heuristicMatch
    };
})();