module.exports = {
    entry: "./main.js",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.css$/,
                loader: "style!css"
            },
            {
                loader: 'babel',
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                query: { presets: ['es2015'] }
            }
        ]
    }
};
