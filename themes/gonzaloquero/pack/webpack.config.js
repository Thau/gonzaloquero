const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    resolve: {
	modules: [path.resolve(__dirname, 'node_modules')]
    },
    entry: './src/css/site.sass',
    output: {
	filename: 'main.css',
	path: path.resolve(__dirname, '..', 'static', 'css')
    },
    module: {
	rules: [
	    {
		test: /\.sass$/,
		use: ExtractTextPlugin.extract({
		    fallback: "style-loader",
		    use: "css-loader!sass-loader"
		})
	    }
	]
    },
    plugins: [
	new ExtractTextPlugin("main.css"),
    ]
};
