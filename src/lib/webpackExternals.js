function libraryExternalsFactory() {

    return function libraryExternals(context, request, callback) {

        if (request.startsWith('goodtap/')) {
            return callback(null, {
                root: "goodtap",
                commonjs: request,
                commonjs2: request,
                amd: request
            });
        }

        callback();

    };

}
module.exports = libraryExternalsFactory;