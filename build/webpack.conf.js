const webpack = require('webpack')
const resolve = require('path').resolve
const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const frontend = {
  target:'web',
  entry:{
    'index':'./plugin/index.js',
    'adminIndex':'./plugin/adminIndex.js'
  },
  mode: 'production',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './../dist/')
  },
  context: path.join(__dirname, './../'),
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'images' },
                { from: 'credentials.json' },
                { from: 'package.json' }
            ]
        })
    ]
}

const backend = {
    target: 'node',
    mode:'production',
    node: {
      __dirname: false,
      __filename: false,
    },
    entry: [ './server.js' ],
    output: {
      filename: "server.js",
      path: resolve(__dirname, './../dist')
    },
    externals: [nodeExternals()],
    plugins : [
        new webpack.ContextReplacementPlugin(
          /express\/lib/,
          resolve(__dirname, '../node_modules'),
          {
            'ejs': 'ejs'
          }
        )
      ],
    stats : {
        warningsFilter: /require\.extensions/
    }
}

module.exports = [backend,frontend];