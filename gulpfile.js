var gulp = require("gulp");
var fs = require("fs");

var package = require("./package.json");
var version = package.version.split(".").map((v) => parseInt(v) || 0);

gulp.task("bump", function(cb) {
    version[2]++;
    package.version = version.join(".");
    fs.writeFileSync("./package.json", JSON.stringify(package, null, 2), { encoding: "utf8" });
    cb();
});
gulp.task("modifyBundle", function(cb) {
    var bundle = fs.readFileSync(`./dist/lib/${package.name}.bundle.js`, "utf8");
    var bundle = bundle.replace("window, function()", `typeof(window) !== "undefined" ? window : typeof(global) !== "undefined" ? global : typeof(self) !== "undefined" ? self : undefined, function()`);
    var bundle = bundle.replace("window,function()", `typeof(window) !== "undefined" ? window : typeof(global) !== "undefined" ? global : typeof(self) !== "undefined" ? self : undefined, function()`);
    fs.writeFileSync(`./dist/lib/${package.name}.bundle.js`, bundle, { encoding: "utf8" });
    cb();
});
gulp.task("package", gulp.series("bump", function() {
    return gulp.src(["./package.json", "./README.md"])
        .pipe(gulp.dest("dist/lib"));
}));
gulp.task("copyDTS", () => {
    return gulp.src("./dts/**/*.d.ts")
        .pipe(gulp.dest("dist/lib"));
});
gulp.task("copyWebpackExternalsFn", () => {
    return gulp.src("./src/lib/webpackExternals.js")
        .pipe(gulp.dest("dist/lib"));
});
