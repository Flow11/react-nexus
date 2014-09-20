module.exports = function(R) {
    var _ = require("lodash");
    var assert = require("assert");
    var autoprefixer = require("autoprefixer-core");

    var Stylesheet = function Stylesheet() {
        this._rules = [];
    };

    _.extend(Stylesheet.prototype, /** @lends R.Stylesheet.prototype */ {
        _isStylesheet_: true,
        registerRule: function registerRule(selector, style) {
            console.warn("registerRule", selector, style);
            R.Debug.dev(function() {
                assert(_.isPlainObject(style), "R.Stylesheet.registerClassName(...).style: expecting Object.");
            });
            this._rules.push({
                selector: selector,
                style: style,
            });
        },
        slowlyExportToCSS: function slowlyExportToCSS(indent, shouldAutoPrefix) {
            if(_.isUndefined(indent)) {
                indent = "  ";
            }
            if(_.isUndefined(shouldAutoPrefix)) {
                shouldAutoPrefix = true;
            }
            var unprefixedCSS = _.map(this._rules, function(style, selector) {
                return selector + " {\n" + R.Style.fromReactStyleToCSS(style) + "}\n\n";
            }).join("");
            console.warn("unprefixedCSS", unprefixedCSS);
            if(!shouldAutoPrefix) {
                return unprefixedCSS;
            }
            else {
                var prefixedCSS = autoprefixer.process(unprefixedCSS).css;
                console.warn("prefixedCSS", prefixedCSS);
                return prefixedCSS;
            }
        },
    });

    R.Stylesheet = Stylesheet;
    return R;
};
