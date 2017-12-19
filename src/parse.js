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

function parse(expr) {
    var lexer = new Lexer();
    var parse = new Parser(lexer);
    return parse.parse(expr);
    // return ...
}

// Lexer 解析器
function Lexer() {

}
Lexer.prototype.lex = function (text) {
    this.text = text;
    this.index = 0;
    this.ch = undefined;
    this.tokens = [];

    while (this.index < this.text.length) {
        this.ch = this.text.charAt(this.index);
        if (this.isNumber(this.ch)) {
            this.readNumber();
        } else {
            throw 'Unexpected next character: ' + this.ch;
        }
    }

    return this.tokens;
    // Tokenization will be done here
};
Lexer.prototype.isNumber = function (ch) {
    return '0' <= ch && ch <= '9';
};
Lexer.prototype.readNumber = function () {
    var number = '';
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index);
        if (this.isNumber(ch)) {
            number += ch;
        } else {
            break;
        }
        this.index++;
    }
    this.tokens.push({
        text: number,
        value: Number(number)
    });
};

// AST Abstract Syntax Tree 抽象语法树
function AST(lexer) {
    this.lexer = lexer;
}
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.prototype.ast = function (text) {
    this.tokens = this.lexer.lex(text);
    return this.program();
    // AST building will be done here
};
AST.prototype.program = function () {
    return { type: AST.Program, body: this.constant() };
};
AST.prototype.constant = function () {
    return { type: AST.Literal, value: this.tokens[0].value };
};

// ASTCompiler
function ASTCompiler(astBuilder) {
    this.astBuilder = astBuilder;
}
ASTCompiler.prototype.compile = function (text) {
    var ast = this.astBuilder.ast(text);
    this.state = { body: [] };
    this.recurse(ast);
    // 这里取消jshint的报错（W054）
    /* jshint -W054 */
    return new Function(this.state.body.join(''));
    /* jshint +W054 */
    // AST compilation will be done here
};
ASTCompiler.prototype.recurse = function(ast) {
    switch(ast.type){
    case AST.Program:
        this.state.body.push('return ', this.recurse(ast.body), ';');
        break;
    case AST.Literal:
        return ast.value;
    }
};

// Parser
function Parser(lexer) {
    this.lexer = lexer;
    this.ast = new AST(this.lexer);
    this.astCompiler = new ASTCompiler(this.ast);
}
Parser.prototype.parse = function (text) {
    return this.astCompiler.compile(text);
};
