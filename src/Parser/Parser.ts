import {Punctuation, Token, TokenPosition, TokenStream, TokenType} from '../Tokenizer/index.js';
import type * as AST                                               from './AST.js';

export class Parser
{
    private stream: TokenStream;

    public static parse(tokens: TokenStream): AST.Program
    {
        return new Parser(tokens).parse();
    }

    constructor(stream: TokenStream)
    {
        this.stream = stream;
    }

    public parse(): AST.Program
    {
        const statements: AST.Stmt[] = [];
        while (!this.stream.isEof) {
            if (this.match(TokenType.NEWLINE)) continue;
            statements.push(this.parseStatement());
        }
        return {
            type:     'Program',
            body:     statements,
            position: {
                lineStart:   1,
                lineEnd:     1,
                columnStart: 1,
                columnEnd:   1,
            },
        };
    }

    private parseStatement(): AST.Stmt
    {
        const token = this.stream.peek();
        if (!token) throw new Error('Unexpected EOF');

        if (token.type === TokenType.KEYWORD) {
            switch (token.value) {
                case 'fn':
                    return this.parseFunctionDeclaration();
                case 'return':
                    return this.parseReturnStatement();
                case 'if':
                    return this.parseIfStatement();
                case 'for':
                    return this.parseForStatement();
                case 'break':
                    return this.parseBreakStatement();
                case 'continue':
                    return this.parseContinueStatement();
            }
        }
        return this.parseExpressionStatement();
    }

    private parseFunctionDeclaration(): AST.FunctionDeclaration | AST.MethodDefinition
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'fn');

        const name = this.parseIdentifier();
        let methodName = null;
        if (this.match(TokenType.PUNCTUATION, Punctuation.MEMBER_ACCESS)) {
            methodName = this.consume(TokenType.IDENTIFIER).value;
        }

        const params: AST.Identifier[] = [];

        if (this.match(TokenType.PUNCTUATION, '(')) {
            if (!this.check(TokenType.PUNCTUATION, ')')) {
                do {
                    params.push(this.parseIdentifier());
                } while (this.match(TokenType.PUNCTUATION, ','));
            }
            this.consume(TokenType.PUNCTUATION, ')');
        }
        this.consume(TokenType.PUNCTUATION, ':');
        const body = this.parseBlock();

        return methodName
            ? {type: 'MethodDefinition', objectName: name, methodName, params, body, position}
            : {type: 'FunctionDeclaration', name, params, body, position};
    }

    private parseBlock(): AST.Block
    {
        this.consume(TokenType.NEWLINE);
        const position = this.currentPos();
        this.consume(TokenType.INDENT);
        const statements: AST.Stmt[] = [];
        while (!this.check(TokenType.DEDENT) && !this.stream.isEof) {
            if (this.match(TokenType.NEWLINE)) continue;
            statements.push(this.parseStatement());
        }
        this.consume(TokenType.DEDENT);
        return {type: 'Block', body: statements, position};
    }

    private parseReturnStatement(): AST.ReturnStatement
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'return');
        let argument: AST.Expr | undefined;
        if (!this.check(TokenType.NEWLINE)) argument = this.parseExpression();
        this.consume(TokenType.NEWLINE);
        return {type: 'ReturnStatement', argument, position};
    }

    private parseIfStatement(): AST.IfStatement
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'if');
        const test = this.parseExpression();
        this.consume(TokenType.PUNCTUATION, ':');
        const consequent = this.parseBlock();
        let alternate: AST.Block | AST.IfStatement | undefined;
        if (this.match(TokenType.KEYWORD, 'else')) {
            this.consume(TokenType.PUNCTUATION, ':');
            alternate = this.parseBlock();
        }
        return {type: 'IfStatement', test, consequent, alternate, position};
    }

    private parseForStatement(): AST.ForStatement
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'for');

        const hasParen = this.match(TokenType.PUNCTUATION, '(');
        const iterator = this.parseIdentifier();

        if (!this.match(TokenType.KEYWORD, 'in')) {
            throw new Error('Expected \'in\' after for-loop iterator');
        }

        const collection = this.parseExpression();

        if (hasParen) {
            this.consume(TokenType.PUNCTUATION, ')');
        }

        this.consume(TokenType.PUNCTUATION, ':');
        const body = this.parseBlock();

        return {type: 'ForStatement', iterator, collection, body, position};
    }

    private parseBreakStatement(): AST.BreakStatement
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'break');

        if (!this.stream.isEof) this.match(TokenType.NEWLINE);
        return {type: 'BreakStatement', position};
    }

    private parseContinueStatement(): AST.ContinueStatement
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'continue');

        if (!this.stream.isEof) this.match(TokenType.NEWLINE);
        return {type: 'ContinueStatement', position};
    }

    private parseExpressionStatement(): AST.ExpressionStatement
    {
        const position   = this.currentPos();
        const expression = this.parseExpression();
        if (!this.stream.isEof) this.consume(TokenType.NEWLINE);
        return {type: 'ExpressionStatement', expression, position};
    }

    private parseExpression(): AST.Expr
    {
        let left = this.parseLogicalOr();

        if (this.match(TokenType.OPERATOR, '=')) {
            const right = this.parseExpression();
            return {
                type:     'AssignmentExpression',
                left:     left,
                operator: '=',
                right:    right,
            } as AST.AssignmentExpression;
        }

        return left;
    }

    private parseLogicalOr(): AST.Expr
    {
        let left = this.parseLogicalAnd();

        while (this.match(TokenType.KEYWORD, 'or')) {
            const right = this.parseLogicalAnd();
            left        = {type: 'LogicalExpression', operator: 'or', left, right} as AST.LogicalExpression;
        }
        return left;
    }

    private parseLogicalAnd(): AST.Expr
    {
        let left = this.parseEquality();

        while (this.match(TokenType.KEYWORD, 'and')) {
            const right = this.parseEquality();
            left        = {type: 'LogicalExpression', operator: 'and', left, right} as AST.LogicalExpression;
        }
        return left;
    }

    private parseEquality(): AST.Expr
    {
        let left = this.parseRelational();

        while (this.check(TokenType.OPERATOR, '==') || this.check(TokenType.OPERATOR, '!=')) {
            const operator = this.stream.consume().value;
            const right    = this.parseRelational();
            left           = {type: 'BinaryExpression', left, operator, right} as AST.BinaryExpression;
        }

        return left;
    }

    private parseRelational(): AST.Expr
    {
        let left = this.parseAdditive();

        while (this.check(TokenType.OPERATOR, '<') || this.check(TokenType.OPERATOR, '>') ||
        this.check(TokenType.OPERATOR, '<=') || this.check(TokenType.OPERATOR, '>=')) {
            const operator = this.stream.consume().value;
            const right    = this.parseAdditive();
            left           = {type: 'BinaryExpression', left, operator, right} as AST.BinaryExpression;
        }

        return left;
    }

    private parseAdditive(): AST.Expr
    {
        let left = this.parseMultiplicative();

        while (this.check(TokenType.OPERATOR, '+') || this.check(TokenType.OPERATOR, '-')) {
            const operator = this.stream.consume().value;
            const right    = this.parseMultiplicative();
            left           = {type: 'BinaryExpression', left, operator, right} as AST.BinaryExpression;
        }

        return left;
    }

    private parseMultiplicative(): AST.Expr
    {
        let left = this.parseUnary();

        while (this.check(TokenType.OPERATOR, '*') || this.check(TokenType.OPERATOR, '/') || this.check(TokenType.OPERATOR, '%')) {
            const operator = this.stream.consume().value;
            const right    = this.parseUnary();
            left           = {type: 'BinaryExpression', left, operator, right} as AST.BinaryExpression;
        }

        return left;
    }

    private parseUnary(): AST.Expr
    {
        if (this.match(TokenType.KEYWORD, 'not') || this.match(TokenType.PUNCTUATION, '!')) {
            const argument = this.parseUnary();
            return {type: 'UnaryExpression', operator: 'not', argument} as AST.UnaryExpression;
        }

        if (this.match(TokenType.OPERATOR, '-')) {
            const argument = this.parseUnary();
            return {type: 'UnaryExpression', operator: '-', argument} as AST.UnaryExpression;
        }

        return this.parsePostfix();
    }

    private parsePostfix(): AST.Expr
    {
        let left = this.parsePrimary();

        while (true) {
            if (this.match(TokenType.PUNCTUATION, '(')) {
                const args: AST.Expr[] = [];
                if (!this.check(TokenType.PUNCTUATION, ')')) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.match(TokenType.PUNCTUATION, ','));
                }
                this.consume(TokenType.PUNCTUATION, ')');
                left = {type: 'CallExpression', callee: left, arguments: args} as AST.CallExpression;
            } else if (this.match(TokenType.PUNCTUATION, '.')) {
                const property = this.parseIdentifier();
                left           = {
                    type:     'MemberExpression',
                    object:   left,
                    property: property,
                    computed: false,
                } as AST.MemberExpression;
            } else if (this.match(TokenType.PUNCTUATION, '[')) {
                const property = this.parseExpression();
                this.consume(TokenType.PUNCTUATION, ']');
                left = {
                    type:     'MemberExpression',
                    object:   left,
                    property: property,
                    computed: true,
                } as AST.MemberExpression;
            } else {
                break;
            }
        }

        return left;
    }

    private parsePrimary(): AST.Expr
    {
        const token = this.stream.peek();

        if (token?.type === TokenType.NUMBER) {
            this.stream.consume();
            return {
                type:  'Literal',
                value: Number(token.value),
                raw:   token.value,
            } as AST.Literal;
        }

        if (token?.type === TokenType.STRING) {
            this.stream.consume();
            return {
                type:  'Literal',
                value: token.value,
                raw:   token.value,
            } as AST.Literal;
        }

        if (token?.type === TokenType.KEYWORD) {
            if (token.value === 'this') {
                this.stream.consume();
                return {type: 'ThisExpression'} as AST.ThisExpression;
            }
            if (token.value === 'true') {
                this.stream.consume();
                return {type: 'Literal', value: true, raw: 'true'} as AST.Literal;
            }
            if (token.value === 'false') {
                this.stream.consume();
                return {type: 'Literal', value: false, raw: 'false'} as AST.Literal;
            }
            if (token.value === 'null') {
                this.stream.consume();
                return {type: 'Literal', value: null, raw: 'null'} as AST.Literal;
            }
        }

        if (this.match(TokenType.PUNCTUATION, '[')) {
            return this.parseArrayExpression();
        }

        if (this.match(TokenType.PUNCTUATION, '{')) {
            return this.parseObjectExpression();
        }

        if (token?.type === TokenType.IDENTIFIER) {
            return this.parseIdentifier();
        }

        if (this.match(TokenType.PUNCTUATION, '(')) {
            const expr = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ')');
            return expr;
        }

        throw new Error(`Unexpected token in Expression: ${token?.value}`);
    }

    private skipFormatting()
    {
        while (
            this.match(TokenType.NEWLINE) ||
            this.match(TokenType.INDENT) ||
            this.match(TokenType.DEDENT)
            ) {
        }
    }

    private parseArrayExpression(): AST.ArrayExpression
    {
        const elements: AST.Expr[] = [];

        this.skipFormatting();
        const position = this.currentPos();

        if (!this.check(TokenType.PUNCTUATION, ']')) {
            do {
                this.skipFormatting();
                if (this.check(TokenType.PUNCTUATION, ']')) break;

                elements.push(this.parseExpression());

                this.skipFormatting();

            } while (this.match(TokenType.PUNCTUATION, ','));
        }

        this.consume(TokenType.PUNCTUATION, ']');
        return {type: 'ArrayExpression', elements, position};
    }

    private parseObjectExpression(): AST.ObjectExpression
    {
        const properties: AST.Property[] = [];

        this.skipFormatting();
        const position = this.currentPos();

        if (!this.check(TokenType.PUNCTUATION, '}')) {
            do {
                this.skipFormatting();
                if (this.check(TokenType.PUNCTUATION, '}')) break;

                const key = this.parseIdentifier();
                this.consume(TokenType.PUNCTUATION, ':');
                const value = this.parseExpression();

                properties.push({type: 'Property', key, value, position});

                this.skipFormatting();

            } while (this.match(TokenType.PUNCTUATION, ','));
        }

        this.consume(TokenType.PUNCTUATION, '}');
        return {type: 'ObjectExpression', properties, position};
    }

    private parseIdentifier(): AST.Identifier
    {
        const position = this.currentPos();
        const token    = this.consume(TokenType.IDENTIFIER);
        return {type: 'Identifier', value: token.value, position};
    }

    private consume(type: keyof typeof TokenType, value?: string): Token
    {
        const token = this.stream.peek();

        if (!token || token.type !== type || (value && token.value !== value)) {
            const msg = `Parse Error: Expected ${type} ${value || ''}, but found ${token?.type} ${token?.value}`;
            let pos = '';
            if (token?.position) {
                pos = ` at line ${token.position.lineStart}, column ${token.position.columnStart}`;
            }

            throw new Error(msg + pos);
        }

        return this.stream.consume();
    }

    private match(type: keyof typeof TokenType, value?: string): boolean
    {
        if (this.check(type, value)) {
            this.stream.consume();

            return true;
        }

        return false;
    }

    private check(type: keyof typeof TokenType, value?: string): boolean
    {
        const token = this.stream.peek();

        if (!token || token.type !== type) {
            return false;
        }

        return !(value && token.value !== value);
    }

    private currentPos(): TokenPosition
    {
        const token: Token | null = this.stream.peek();

        return token
            ? token.position
            : {
                lineStart:   0,
                lineEnd:     0,
                columnStart: 0,
                columnEnd:   0,
            };
    }
}
