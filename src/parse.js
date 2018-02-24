/* jshint globalstrict:true */
'use strict';

function parse(expr) {
    var parse = new Parse();
    return parse.parse(expr);
}
function Parse() {
    var lexer = new Lexer();
    var ast = new AST(lexer);
    this.astCompile = new ASTCompile(ast);
}
Parse.prototype.parse = function (text) {
    return this.astCompile.compile(text);
};


function Lexer() { }
// 生成tokens
Lexer.prototype.lex = function (text) {
    this.text = text;
    this.ch = undefined;
    this.index = 0;
    this.tokens = [];
    while (this.index < this.text.length) {
        this.ch = this.text.charAt(this.index);
        if (this.isNumber(this.ch)) {
            this.readNumber();
        } else {
            throw 'Is not a Number.';
        }
        this.index++;
    }
    return this.tokens;
};
Lexer.prototype.isNumber = function (ch) {
    return ch > '0' && ch < '9';
};
Lexer.prototype.readNumber = function () {
    var number = '';
    while (this.index < this.text.length) {
        this.ch = this.text.charAt(this.index);
        if (this.isNumber(this.ch)) {
            number += this.ch;
        } else {
            break;
        }
        this.index++;
    }
    this.tokens.push({
        text: this.text,
        value: Number(number)
    });
};


function AST(lexer) {
    this.lexer = lexer;
}
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.prototype.ast = function (text) {
    this.tokens = this.lexer.lex(text);
    return this.program();
};
AST.prototype.program = function () {
    return { type: AST.Program, body: this.constant() };
};
AST.prototype.constant = function () {
    return { type: AST.Literal, value: this.tokens[0].value };
};


function ASTCompile(ast) {
    this.astBuilder = ast;
}
ASTCompile.prototype.compile = function (text) {
    var ast = this.astBuilder.ast(text);
    this.state = { body: [] };
    this.recurse(ast);
    /* jshint -W054 */
    return new Function(this.state.body.join(''));
    /* jshint +W054 */
};
ASTCompile.prototype.recurse = function (ast) {
    switch (ast.type) {
        case AST.Program:
            this.state.body.push('return ' + this.recurse(ast.body) + ';');
            break;
        case AST.Literal:
            return ast.value;
    }
};