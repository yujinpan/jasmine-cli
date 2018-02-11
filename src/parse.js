/**
 * 几行JavaScript实现大部分的表达式系统
 * function parse(expr) {
 *  return function(scope) {
 *      with(scope) {
 *          return eval(expr);
 *      }
 *  }
 * }
 */