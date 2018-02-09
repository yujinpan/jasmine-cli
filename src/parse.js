/* jshint globalstrict: true */
'use strict';

/**
 * The expression parsing pipeline 表达式解析管道
 * "a + b" => 
 * (Lexer语法分析器) => 
 * (Tokens令牌)[
 *     {text: 'a', identifier: true},
 *     {text: '+'},
 *     {text: 'b', identifier: true}
 * ] => 
 * (AST Builder) =>
 * (Abstract Syntax Tree 抽象语法树){
 *     type: AST.binaryExpression,
 *     operator: '+',
 *     left: {
 *         type: AST.Identifier,
 *         name: 'a'
 *     },
 *     left: {
 *         type: AST.Identifier,
 *         name: 'b'
 *     }
 * } => 
 * (AST Compiler) =>
 * (Expression Function)(
 *     function(scope){ return scope.a + scope.b; }
 * )
 * 
 * Lexer => AST Build => AST Compile
 */

/**
 * 入口函数
 */
function parse(expr) {
    var lexer = new Lexer();
    var parse = new Parser(lexer);
    return parse.parse(expr);
    // return ...
}

/**
 * 辅助类
 * 
 * @param {Lexer} lexer 
 */
function Parser(lexer) {
    this.lexer = lexer;
    this.ast = new AST(this.lexer);
    this.astCompiler = new ASTCompiler(this.ast);
}
Parser.prototype.parse = function (text) {
    return this.astCompiler.compile(text);
};

// Lexer 解析器
function Lexer() { }
/**
 * @description
 * 解析text，分发不同类型的字符，生成对应的tokens数组；
 * 
 * ---- 变量 ----
 * this.index   为循环text的index下标；
 * this.ch      为当前下标的字符；
 * 
 * ---- 类型 ----
 * 1.number类型：包含小数点，科学记数法e字符，分发进入readNumber方法；
 * 2.string类型：包含单引号与双引号，分发进入readString方法；
 * 3.array与object类型：包含[]，{}和逗号与冒号符号，直接将该字符添加为tokens，在后面program处理；
 * 4.变量类型：包括小写与大写字母，下划线与$符号开头的标识符，分发进入readIdent方法；
 * 5.空白字符：将当前的index向前移动；
 * 6.其他：抛出该错误字符；
 * 
 * @param {string} text 解析的字符
 */
Lexer.prototype.lex = function (text) {
    this.text = text;
    this.index = 0;
    this.ch = undefined;
    this.tokens = [];

    while (this.index < this.text.length) {
        this.ch = this.text.charAt(this.index);
        if (this.isNumber(this.ch) ||
            (this.is('.') && this.isNumber(this.peek()))) {
            this.readNumber();
        } else if (this.is('\'"')) {
            this.readString(this.ch);
        } else if (this.is('[],{}:.')) {
            this.tokens.push({
                text: this.ch
            });
            this.index++;
        } else if (this.isIdent(this.ch)) {
            // a-z A-Z _ $
            this.readIdent();
        } else if (this.isWhitespace(this.ch)) {
            // 遇到空格字符，将当前指针向前移动
            this.index++;
        } else {
            throw 'Unexpected next character: ' + this.ch;
        }
    }

    return this.tokens;
    // Tokenization will be done here
};

/* ---------- 生成tokens ---------- */

/**
 * 生成number类型的tokens
 */
Lexer.prototype.readNumber = function () {
    var number = '';
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index).toLowerCase();
        if (ch === '.' || this.isNumber(ch)) {
            number += ch;
        } else {
            var nextch = this.peek();
            var prevch = number.charAt(number.length - 1);
            // 如果当前字符为e，下一个字符为有效的指数运算符
            if (ch === 'e' && this.isExpOperator(this.peek())) {
                number += ch;
                // 如果当前字符为+或-，前一个字符为e，下一个字符为数字
            } else if (this.isExpOperator(ch) && prevch === 'e' &&
                nextch && this.isNumber(nextch)) {
                number += ch;
                // 如果当前字符为+或-，前一个字符为e，没有下一个数字
            } else if (this.isExpOperator(ch) && prevch === 'e' &&
                (!nextch || !this.isNumber(nextch))) {
                throw "Invalid exponent";
            } else {
                break;
            }
        }
        this.index++;
    }
    this.tokens.push({
        text: number,
        value: Number(number)
    });
};

/**
 * 生成string类型的tokens
 * 
 * @param {string} quote 单引号或双引号
 */
Lexer.prototype.readString = function (quote) {
    this.index++;
    var string = '';
    var escape = false;
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index);
        if (escape) {
            if (ch === 'u') {
                var hex = this.text.substring(this.index + 1, this.index + 5);
                if (!hex.match(/[\da-f]{4}/i)) {
                    throw "Invalid unicode escape";
                }
                this.index += 4;
                string += String.fromCharCode(parseInt(hex, 16));
            } else {
                var replacement = ESCAPE[ch];
                if (replacement) {
                    string += replacement;
                } else {
                    string += ch;
                }
            }
            escape = false;
        } else if (ch === quote) {
            this.index++;
            this.tokens.push({
                text: string,
                value: string
            });
            return;
        } else if (ch === '\\') {
            escape = true;
        } else {
            string += ch;
        }
        this.index++;
    }
    throw 'Unmatched quote';
};

/**
 * 生成变量名的tokens
 */
Lexer.prototype.readIdent = function () {
    var text = '';
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index);
        // 是标识符和数字
        if (this.isIdent(ch) || this.isNumber(ch)) {
            text += ch;
        } else {
            break;
        }
        this.index++;
    }
    var token = { text: text, identifier: true };
    this.tokens.push(token);
};

/* ---------- 判断类型 ---------- */

/**
 * 符号集合
 * 换行符\n, 换行符\f, 回车符\r, 水平制表符\t, 垂直制表符\v
 * 
 * 1.Unicode转义序列，以\u开头并包含四位十六进制。
 * 2.\u00A0表示一个不间断的空格字符。
 */
var ESCAPE = {
    'n': '\n', 'f': '\f', 'r': '\r', 't': '\t',
    'v': '\v', '\'': '\'', '"': '"'
};

/**
 * 判断是否为：0-9的数字字符串
 * 
 * @param {string} ch 判断的字符
 */
Lexer.prototype.isNumber = function (ch) {
    return '0' <= ch && ch <= '9';
};

/**
 * 判断是否为： + - number
 * 
 * @param {string} ch 判断的字符
 */
Lexer.prototype.isExpOperator = function (ch) {
    return ch === '+' || ch === '-' || this.isNumber(ch);
};

/**
 * 判断是否为：变量名
 * 
 * 1.小写字母 2.大写字母 3.下划线 4.美元符
 */
Lexer.prototype.isIdent = function (ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
        ch === '_' || ch === '$';
};

/**
 * 判断是否为：空格，回车，水平制表符，垂直制表符，换行符，非空格符
 */
Lexer.prototype.isWhitespace = function (ch) {
    return ch === ' ' || ch === 'r' || ch === '\t' ||
        ch === '\n' || ch === '\v' || ch === '\u00A0';
};

/**
 * 判断是否为：该字符串中是否有匹配的字符
 */
// 检测当前字符是否与该字符串中的任何字符匹配
Lexer.prototype.is = function (chs) {
    return chs.indexOf(this.ch) >= 0;
};

/**
 * 计算下一个字符，若当前为最后一个字符，返回false
 */
Lexer.prototype.peek = function () {
    return this.index < this.text.length - 1 ?
        this.text.charAt(this.index + 1) :
        false;
};


/**
 * AST Abstract Syntax Tree 抽象语法树
 * 
 * 抽象语法树类型：
 * Program：需要编制，
 * Literal：数字，
 * ArrayExpression：数组，
 * ObjectExpression：对象，
 * Property：对象属性
 * Identifier: 标识符
 */
function AST(lexer) {
    this.lexer = lexer;
}
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
AST.Property = 'Property';
AST.Identifier = 'Identifier';
AST.ThisExpression = 'ThisExpression';
AST.MemberExpression = 'MemberExpression';


/**
 * AST构建入口
 * 
 * 1.生成tokens
 * 2.解析tokens，生成语法树
 * 
 * @param {string} text 需要编译的字符
 */
AST.prototype.ast = function (text) {
    this.tokens = this.lexer.lex(text);
    return this.program();
    // AST building will be done here
};

/**
 * 生成语法树
 */
AST.prototype.program = function () {
    return { type: AST.Program, body: this.primary() };
};
// 分发不同类型的语法树生成方法
AST.prototype.primary = function () {
    var primary;
    if (this.expect('[')) {
        primary = this.arrayDeclaration();
    } else if (this.expect('{')) {
        primary = this.object();
    } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
        primary = this.constants[this.consume().text];
    } else if (this.peek().identifier) {
        primary = this.identifier();
    } else {
        primary = this.constant();
    }
    while (this.expect('.')) {
        primary = {
            type: AST.MemberExpression,
            object: primary,
            property: this.identifier()
        };
    }
    return primary;
};

// 处理数字类型的语法树
AST.prototype.constant = function () {
    return { type: AST.Literal, value: this.consume().value };
};

// 处理 null，true，false，this 类型语法树
AST.prototype.constants = {
    'null': { type: AST.Literal, value: null },
    'true': { type: AST.Literal, value: true },
    'false': { type: AST.Literal, value: false },
    'this': { type: AST.ThisExpression },
};

/**
 * 处理数组类型的语法树
 */
AST.prototype.arrayDeclaration = function () {
    var elements = [];
    if (!this.peek(']')) {
        do {
            if (this.peek(']')) {
                break;
            }
            elements.push(this.primary());
        } while (this.expect(','));
    }
    this.consume(']');
    return { type: AST.ArrayExpression, elements: elements };
};

/**
 * 处理对象类型的语法树
 */
AST.prototype.object = function () {
    var properties = [];
    if (!this.peek('}')) {
        do {
            var property = { type: AST.Property };
            if (this.peek().identifier) {
                property.key = this.identifier();
            } else {
                property.key = this.constant();
            }
            this.consume(':');
            property.value = this.primary();
            properties.push(property);
        } while (this.expect(','));
    }
    this.consume('}');
    return { type: AST.ObjectExpression, properties: properties };
};

/**
 * 处理标识符类型的语法树
 */
AST.prototype.identifier = function () {
    return { type: AST.Identifier, name: this.consume().text };
};

/**
 * 判断是否为：
 * 下一个token的text值是否为e，
 * 如果是则返回该token，并从原数组中删除该token
 * 如果否则抛出错误
 */
AST.prototype.consume = function (e) {
    var token = this.expect(e);
    if (!token) {
        throw 'Unexpected Expecting: ' + e;
    }
    return token;
};

/**
 * 判断是否为：
 * 下一个token的text值是否为e或是否有e值，
 * 如果是则返回该token
 * 如果否则返回undefined
 */
AST.prototype.peek = function (e) {
    if (this.tokens.length > 0) {
        var text = this.tokens[0].text;
        if (text === e || !e) {
            return this.tokens[0];
        }
    }
};

/**
 * 判断是否为：
 * 下一个token的text值是否为e，
 * 如果是则返回该token，并从原数组中删除该token
 * 如果否则返回undefined
 */
AST.prototype.expect = function (e) {
    var token = this.peek(e);
    if (token) {
        return this.tokens.shift();
    }
};


/**
 * AST编译
 * 
 * @param {object} astBuilder 
 */
function ASTCompiler(astBuilder) {
    this.astBuilder = astBuilder;
}

/**
 * AST编译入口
 * 1.生成ast
 * 2.解析ast，返回生成编译结果的执行函数
 * 
 * @param {string} text 需要编译的字符
 */
ASTCompiler.prototype.compile = function (text) {
    var ast = this.astBuilder.ast(text);
    this.state = { body: [], nextId: 0, vars: [] };
    this.recurse(ast);
    // 这里取消jshint的报错（W054）
    /* jshint -W054 */
    return new Function('s', (
        this.state.vars.length ?
            'var ' + this.state.vars.join(',') + ';' : ''
    ) + this.state.body.join(''));
    /* jshint +W054 */
    // AST compilation will be done here
};
// 解析ast的动作，分发不同类型的处理方法
ASTCompiler.prototype.recurse = function (ast) {
    var self = this, intoId;
    switch (ast.type) {
        case AST.Program:
            this.state.body.push('return ', this.recurse(ast.body), ';');
            break;
        case AST.Literal:
            return this.escape(ast.value);
        case AST.ArrayExpression:
            var elements = _.map(ast.elements, function (element) {
                return self.recurse(element);
            });
            return '[' + elements.join(',') + ']';
        case AST.ObjectExpression:
            var properties = _.map(ast.properties, function (property) {
                var key = property.key.type === AST.Identifier ?
                    property.key.name : self.escape(property.key.value);
                var value = self.recurse(property.value);
                return key + ':' + value;
            });
            return '{' + properties.join(',') + '}';
        case AST.Identifier:
            intoId = this.nextId();
            this.if_('s', this.assign(intoId, this.nonComputedMember('s', ast.name)));
            return intoId;
        case AST.ThisExpression:
            return 's';
        case AST.MemberExpression:
            intoId = this.nextId();
            var left = this.recurse(ast.object);
            this.if_(left, this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
            return intoId;
    }
};

// 匹配所有除字母数字之外的字符
ASTCompiler.prototype.stringEscapeRegex = /[^a-zA-Z0-9]/g;
ASTCompiler.prototype.stringEscapeFn = function (c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
};
// 格式为可执行的字符串
ASTCompiler.prototype.escape = function (value) {
    if (_.isString(value)) {
        return '\'' +
            value.replace(this.stringEscapeRegex, this.stringEscapeFn) +
            '\'';
    } else if (_.isNull(value)) {
        return 'null';
    } else {
        return value;
    }
};

// 生成属性查找语句：left.right
ASTCompiler.prototype.nonComputedMember = function (left, right) {
    return '(' + left + ').' + right;
};

// 生成判断语句：test通过，则执行consequent
ASTCompiler.prototype.if_ = function (test, consequent) {
    this.state.body.push('if(', test, '){', consequent, '}');
};

// 辅助函数：变量赋值
ASTCompiler.prototype.assign = function (id, value) {
    return id + '=' + value + ';';
};

// 辅助函数：递增生成比变量名
ASTCompiler.prototype.nextId = function () {
    var id = 'v' + (this.state.nextId++);
    this.state.vars.push(id);
    return id;
};
