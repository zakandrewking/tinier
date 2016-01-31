module.exports = {
  entry: './src/main.js',
  output: {
    path: __dirname,
    filename: 'tinier.js',
    library: 'tinier',
    libraryTarget: 'umd'
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
