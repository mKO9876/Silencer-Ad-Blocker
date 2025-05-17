// use ES6 style import syntax (recommended)
import * as ort from 'onnxruntime-web';


export async function classifyData(inputData) {
    try {
        console.log("ORT Module: ", ort);
        console.log("ORT Keys: ", Object.keys(ort));
        console.log("ORT InferenceSession: ", ort.InferenceSession);

        const url = chrome.runtime.getURL('model.onnx')
        console.log("url: ", url)
        const session = await ort.InferenceSession.create(url);

        const tensor = new ort.Tensor('float32', new Float32Array(inputData), [1, inputData.length]);

        const feeds = { 'float_input': tensor };

        const results = await session.run(feeds);
        const output = results.output_label.data;
        return output[0] === 1; // if 1 then block
    } catch (e) {
        console.error('Classification failed:', e);
        return false;
    }
}
