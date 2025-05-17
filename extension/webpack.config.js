const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        background: './background.js',
        context: './context.js',
        popup: './adBlocker_popup.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "manifest.json", to: "manifest.json" },
                { from: "model.onnx", to: "model.onnx" },
                { from: "adBlocker_popup.html", to: "adBlocker_popup.html" },
                { from: "logos", to: "logos" },
                {
                    from: "node_modules/onnxruntime-web/dist",
                    to: "onnxruntime"
                }
            ],
        }),
    ],
    resolve: {
        fallback: {
            "path": false,
            "fs": false
        }
    }
}; 