const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Get the subdirectory from environment variable or use default
const subdirectory = process.env.SUBDIRECTORY || 'flow-chart-gen';
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: isProduction ? `/${subdirectory}/` : '/'
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            filename: 'index.html',
            inject: 'body',
            base: isProduction ? `/${subdirectory}/` : '/'
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 9000,
        hot: true
    }
}; 