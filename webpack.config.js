var path = require('path')
var webpack = require('webpack')

module.exports = {
  entry: {
    'tinier': './src/main.js',
    'tinier.min': './src/main.js',
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    library: 'tinier',
    libraryTarget: 'umd'
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      include: /\.min\.js$/,
      minimize: true
    })
  ],
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
