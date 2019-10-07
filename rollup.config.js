const path = require('path')
const replace = require('rollup-plugin-replace')
const commonjs = require('rollup-plugin-commonjs')
const babel = require('rollup-plugin-babel')
const resolve = require('rollup-plugin-node-resolve')
const fs = require('fs')

module.exports = {
  input: path.resolve('./package/index.ts'),
  output: {
    file: path.resolve(__dirname, './build/mreact.js'),
    format: 'umd',
    name: 'mreact',
    sourcemap: false,
  },
  // experimentalOptimizeChunks: true,
  plugins: [
    {
      resolveId(source, importer) {
        if (path.isAbsolute(source) || path.extname(source)) {
          return null
        }

        let extensions = ['.ts']
        let exactPath = path.resolve(importer, '..', source)

        for (let i = 0; i < extensions.length; i++) {
          let ext = extensions[i]
          let resolvedPath = path.join(exactPath, `/index${ext}`)
          if (fs.existsSync(resolvedPath)) {
            return resolvedPath
          }
          resolvedPath = exactPath + ext
          if (fs.existsSync(resolvedPath)) {
            return resolvedPath
          }
        }
        return null
      },
    },
    resolve({}),
    babel({
      exclude: '/**/node_modules/**',
      extensions: ['ts'],
    }),
    replace({
      'process.env': JSON.stringify({
        NODE_ENV: 'production',
      }),
    }),
    commonjs({
      // non-CommonJS modules will be ignored, but you can also
      // specifically include/exclude files
      include: /node_modules/, // Default: undefined
      // exclude: ['node_modules/foo/**', 'node_modules/bar/**'],  // Default: undefined
      // these values can also be regular expressions
      // include: /node_modules/

      // search for files other than .js files (must already
      // be transpiled by a previous plugin!)
      extensions: ['.js'], // Default: [ '.js' ]

      // if true then uses of `global` won't be dealt with by this plugin
      ignoreGlobal: false, // Default: false

      // if false then skip sourceMap generation for CommonJS modules
      sourcemap: false, // Default: true

      // explicitly specify unresolvable named exports
      // (see below for more details)
      // namedExports: { './module.js': ['foo', 'bar'] },  // Default: undefined

      // sometimes you have to leave require statements
      // unconverted. Pass an array containing the IDs
      // or a `id => boolean` function. Only use this
      // option if you know what you're doing!
      // ignore: (id) => {
      //     return id.startsWith('tslib');
      // }
    }),
  ],
}
