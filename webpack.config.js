const path = require('path');

module.exports = {
    mode: 'production',
    target: 'node',
    entry: path.resolve(__dirname, 'index.ts'),
    output: { 
        filename: 'index.js' 
    },
    module: { 
        rules: 
        [
            { 
                test: /\.ts$/i,
                use: 'ts-loader',
                exclude: ['/node_modules/'],
            }
        ]
    },
    resolve: { 
        extensions: ['.js', '.ts']
    },
    externals: [
        {
            'utf-8-validate': 'commonjs utf-8-validate',
            bufferutil: 'commonjs bufferutil',
        },
    ],
}
