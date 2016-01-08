module.exports = {
    entry: './src/main.js',
    output: {
        path: __dirname,
        filename: 'bundle.js'
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                loader: 'babel',
                test: /\.js$/,
                exclude: /node_modules/
            }
        ]
    }
};
