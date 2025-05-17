// Učitaj ONNX runtime
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');

let session = null;

async function classifyData(inputData) {
    if (!session) {
        const modelPath = chrome.runtime.getURL('model.onnx');
        session = await ort.InferenceSession.create(modelPath);
    }

    const tensor = new ort.Tensor('float32', new Float32Array(inputData), [1, inputData.length]);
    const feeds = { 'float_input': tensor };

    const results = await session.run(feeds);
    const classLabel = results.output_label.data[0];
    return classLabel === 1;
}

// Slušaj poruke od glavnog threada
self.onmessage = async function (e) {
    if (e.data.type === 'classify') {
        try {
            const result = await classifyData(e.data.input);
            self.postMessage({ type: 'result', result: result });
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
}; 