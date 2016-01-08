var webpack = require('webpack');
var webpackConfig = require('./webpack.config');

module.exports = function (config) {
    config.set({
        browsers: [ 'Chrome' ],
        singleRun: true,
        frameworks: [ 'mocha', 'chai' ],
        files: [
            'tests.bundle.js'
        ],
        preprocessors: {
            'tests.bundle.js': [ 'webpack', 'sourcemap' ]
        },
        reporters: [ 'dots' ],
        webpack: {
          devtool: 'inline-source-map',
          module: webpackConfig.module
        },
        webpackServer: {
            noInfo: true
        }
    });
};
