module.exports = {
  plugins: [
    require('babel-plugin-syntax-async-functions'),
    require('babel-plugin-syntax-async-generators'),
    require('babel-plugin-syntax-class-constructor-call'),
    require('babel-plugin-syntax-class-properties'),
    require('babel-plugin-syntax-decorators'),
    require('babel-plugin-syntax-flow'),
    require('babel-plugin-syntax-jsx'),
    require('babel-plugin-syntax-object-rest-spread'),
    require('babel-plugin-syntax-trailing-function-commas'),
    require('babel-plugin-transform-async-to-generator'),
    [require('babel-plugin-transform-async-to-module-method'), {
      'module': 'bluebird',
      'method': 'coroutine',
    }],
    require('babel-plugin-transform-class-constructor-call'),
    require('babel-plugin-transform-class-properties'),
    require('babel-plugin-transform-decorators'),
    require('babel-plugin-transform-exponentiation-operator'),
    require('babel-plugin-transform-object-rest-spread'),
    require('babel-plugin-transform-flow-strip-types'),
    require('babel-plugin-transform-react-constant-elements'),
    require('babel-plugin-transform-react-display-name'),
    require('babel-plugin-transform-react-inline-elements'),
    require('babel-plugin-transform-react-jsx'),
    require('babel-plugin-transform-eval'),
    require('babel-plugin-transform-jscript'),
    require('babel-plugin-transform-object-assign'),
    require('babel-plugin-transform-object-set-prototype-of-to-assign'),
    require('babel-plugin-transform-proto-to-assign'),
    require('babel-plugin-transform-regenerator'),
    require('babel-plugin-transform-runtime'),
    require('babel-plugin-transform-undefined-to-void'),
    require('babel-plugin-transform-es2015-arrow-functions'),
    require('babel-plugin-transform-es2015-block-scoped-functions'),
    require('babel-plugin-transform-es2015-block-scoping'),
    [require('babel-plugin-transform-es2015-classes'), { loose: true }],
    [require('babel-plugin-transform-es2015-computed-properties'), { loose: true }],
    require('babel-plugin-transform-es2015-constants'),
    [require('babel-plugin-transform-es2015-destructuring'), { loose: true }],
    [require('babel-plugin-transform-es2015-for-of'), { loose: true }],
    require('babel-plugin-transform-es2015-function-name'),
    require('babel-plugin-transform-es2015-literals'),
    require('babel-plugin-transform-es2015-object-super'),
    require('babel-plugin-transform-es2015-parameters'),
    require('babel-plugin-transform-es2015-shorthand-properties'),
    require('babel-plugin-transform-es2015-spread'),
    require('babel-plugin-transform-es2015-sticky-regex'),
    [require('babel-plugin-transform-es2015-template-literals'), { loose: true }],
    require('babel-plugin-transform-es2015-typeof-symbol'),
    require('babel-plugin-transform-es2015-unicode-regex'),
    [require('babel-plugin-transform-es2015-modules-commonjs'), { loose: true }],
  ],
};
