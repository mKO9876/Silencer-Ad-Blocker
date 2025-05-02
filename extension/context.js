const ort = require('onnxruntime-node');
import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js';

async function classifyData(inputData) {
    try {
        const model = await ort.InferenceSession.create('./model.onnx');
        // Run the model
        const results = await model.run(inputData);
        const output = results.label.data;
        return output[0] === 1; //if 1 then block
    } catch (e) {
        console.error('Classification failed:', e);
        return false;
    }
}