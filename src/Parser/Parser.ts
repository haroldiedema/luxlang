import { Punctuation, Token, TokenPosition, TokenStream, TokenType } from '../Tokenizer/index.js';
import { Expr }                                                      from './AST.js';
import type * as AST                                                 from './AST.js';

export class Parser
{
    private stream: TokenStream;

    public static parse(tokens: TokenStream): AST.Script
    {
        return new Parser(tokens).parse();
    }

    constructor(stream: TokenStream)
    {
        this.stream = stream;
    }

    public parse(): AST.Script
    {
        const statements: AST.Stmt[] = [];
        while (! this.stream.isEof) {
            if (this.match(TokenType.NEWLINE)) continue;
            statements.push(this.parseStatement());
        }
        return {
            type:     'Script',
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
        if (! token) throw new Error('Unexpected EOF');

        let isPublic = false,
            isLocal  = false;

        // 1. Consume modifiers
        if (this.match(TokenType.KEYWORD, 'public')) {
            isPublic = true;
        }

        if (this.match(TokenType.KEYWORD, 'local')) {
            isLocal = true;
        }

        // 2. Handle Functions (Supported: public fn, fn. Invalid: local fn)
        if (this.check(TokenType.KEYWORD, 'fn')) {
            if (isLocal) {
                throw new Error('Functions cannot be declared as \'local\'. They are local by default unless marked \'public\'.');
            }
            return this.parseFunctionDeclaration(isPublic);
        }

        if (this.check(TokenType.KEYWORD, 'blueprint')) {
            if (isLocal) {
                throw new Error('Blueprints cannot be declared as \'local\'. They are local by default unless marked \'public\'.');
            }
            return this.parseBlueprintStatement(isPublic);
        }

        // If public or local are set, we know we are parsing an assignment expression.
        if (isPublic || isLocal) {
            return this.parseExpressionStatement(isPublic, isLocal);
        }

        if (token.type === TokenType.KEYWORD) {
            switch (token.value) {
                case 'import':
                    return this.parseImportStatement();
                case 'wait':
                    return this.parseWaitStatement();
                case 'on':
                    return this.parseEventHook();
                case 'return':
                    return this.parseReturnStatement();
                case 'if':
                    return this.parseIfStatement();
                case 'for':
                    return this.parseForStatement();
                case 'while':
                    return this.parseWhileStatement();
                case 'do':
                    return this.parseDoWhileStatement();
                case 'break':
                    return this.parseBreakStatement();
                case 'continue':
                    return this.parseContinueStatement();
            }
        }

        // 3. Default: Expression Statement
        return this.parseExpressionStatement();
    }

    private parseEventHook(): AST.EventHook
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'on');

        const name = this.parseIdentifier();

        const params: AST.Identifier[] = [];

        if (this.match(TokenType.PUNCTUATION, '(')) {
            if (! this.check(TokenType.PUNCTUATION, ')')) {
                do {
                    params.push(this.parseIdentifier());
                } while (this.match(TokenType.PUNCTUATION, ','));
            }
            this.consume(TokenType.PUNCTUATION, ')');
        }
        this.consume(TokenType.PUNCTUATION, ':');

        const body = this.parseBlock();

        return {type: 'EventHook', name, params, body, position};
    }

    private parseBlueprintStatement(isPublic: boolean = false): AST.BlueprintStatement
    {
        const startPos = this.currentPos();
        this.consume(TokenType.KEYWORD, 'blueprint');
        const name = this.parseIdentifier();

        // 1. Check for Primary Constructor Parameters "(name, age)"
        const params: AST.Identifier[] = [];
        if (this.match(TokenType.PUNCTUATION, '(')) {
            if (! this.check(TokenType.PUNCTUATION, ')')) {
                do {
                    params.push(this.parseIdentifier());
                } while (this.match(TokenType.PUNCTUATION, ','));
            }
            this.consume(TokenType.PUNCTUATION, ')');
        }

        let parent: AST.Identifier | undefined,
            parentArgs: AST.Expr[] = [];

        // Check for extends.
        if (this.match(TokenType.KEYWORD, 'extends')) {
            parent = this.parseIdentifier();

            if (this.match(TokenType.PUNCTUATION, '(')) {
                if (! this.check(TokenType.PUNCTUATION, ')')) {
                    do {
                        parentArgs.push(this.parseExpression());
                    } while (this.match(TokenType.PUNCTUATION, ','));
                }
                this.consume(TokenType.PUNCTUATION, ')');
            }
        }

        // Body is optional.
        if (! this.check(TokenType.PUNCTUATION, ':')) {
            return {
                type:       'BlueprintStatement',
                name,
                properties: [],
                params,
                methods:    [],
                position:   startPos,
                isPublic,
                parent,
                parentArgs,
            };
        }

        this.consume(TokenType.PUNCTUATION, ':');
        this.consume(TokenType.NEWLINE);
        this.consume(TokenType.INDENT);

        const properties: { key: AST.Identifier, value: AST.Expr }[] = [];
        const methods: AST.FunctionDeclaration[]                     = [];

        while (! this.match(TokenType.DEDENT) && ! this.stream.isEof) {
            if (this.match(TokenType.NEWLINE)) {
                continue;
            }

            // 2. Handle Methods
            if (this.check(TokenType.KEYWORD, 'fn')) {
                const method = this.parseFunctionDeclaration(false);
                if (method.type !== 'FunctionDeclaration') {
                    throw new Error('Methods inside blueprints cannot be defined as method definitions.');
                }
                methods.push(method);
                continue;
            }

            // 3. Handle Properties
            if (this.check(TokenType.IDENTIFIER)) {
                const key = this.parseIdentifier();

                if (this.match(TokenType.PUNCTUATION, ':')) {
                    const value = this.parseExpression();
                    properties.push({key, value});

                    if (this.check(TokenType.NEWLINE)) {
                        this.consume(TokenType.NEWLINE);
                    }

                    continue;
                } else {
                    throw new Error(`Expected ':' for property definition...`);
                }
            }

            throw new Error('Expected \'fn\' or property definition inside blueprint body');
        }

        return {
            type:     'BlueprintStatement',
            name,
            properties,
            params,
            methods,
            position: startPos,
            isPublic,
            parent,
            parentArgs,
        };
    }

    private parseFunctionDeclaration(isPublic: boolean = false): AST.FunctionDeclaration | AST.MethodDefinition
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'fn');

        const name                    = this.parseIdentifier();
        let methodName: string | null = null;
        if (this.match(TokenType.PUNCTUATION, Punctuation.MEMBER_ACCESS)) {
            methodName = this.consume(TokenType.IDENTIFIER).value;
        }

        const params: AST.Identifier[] = [];

        if (this.match(TokenType.PUNCTUATION, '(')) {
            if (! this.check(TokenType.PUNCTUATION, ')')) {
                do {
                    params.push(this.parseIdentifier());
                } while (this.match(TokenType.PUNCTUATION, ','));
            }
            this.consume(TokenType.PUNCTUATION, ')');
        }
        this.consume(TokenType.PUNCTUATION, ':');

        const body = this.parseBlock();

        if (methodName && isPublic) {
            throw new Error('Method definitions cannot be public. You should mark the object as public instead.');
        }

        return methodName
            ? {type: 'MethodDefinition', objectName: name, methodName, params, body, position}
            : {type: 'FunctionDeclaration', name, params, body, position, isPublic};
    }

    private parseBlock(): AST.Block
    {
        this.consume(TokenType.NEWLINE);

        if (! this.check(TokenType.INDENT)) {
            // Block is empty.
            const position = this.currentPos();
            return {type: 'Block', body: [], position};
        }

        const position = this.currentPos();
        this.consume(TokenType.INDENT);
        const statements: AST.Stmt[] = [];
        while (! this.check(TokenType.DEDENT) && ! this.stream.isEof) {
            if (this.match(TokenType.NEWLINE)) continue;
            statements.push(this.parseStatement());
        }
        this.consume(TokenType.DEDENT);
        return {type: 'Block', body: statements, position};
    }

    private parseImportStatement(): AST.ImportStatement
    {
        const position = this.currentPos();

        this.consume(TokenType.KEYWORD, 'import');
        const moduleNameToken = this.consume(TokenType.STRING);
        const moduleName      = moduleNameToken.value;
        this.consume(TokenType.NEWLINE);

        return {type: 'ImportStatement', moduleName, position};
    }

    private parseWaitStatement(): AST.WaitStatement
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'wait');
        const duration = this.parseExpression();
        this.consume(TokenType.NEWLINE);
        return {type: 'WaitStatement', duration, position};
    }

    private parseReturnStatement(): AST.ReturnStatement
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'return');
        let argument: AST.Expr | undefined;
        if (! this.check(TokenType.NEWLINE)) argument = this.parseExpression();
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

        if (! this.match(TokenType.KEYWORD, 'in')) {
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

    private parseWhileStatement(): AST.WhileStatement
    {
        const startPos = this.currentPos();

        this.consume(TokenType.KEYWORD, 'while');
        const condition = this.parseExpression();
        this.consume(TokenType.PUNCTUATION, ':');

        const body = this.parseBlock();

        return {type: 'WhileStatement', condition, body, position: startPos};
    }

    private parseDoWhileStatement(): AST.DoWhileStatement
    {
        const startPos = this.currentPos();

        this.consume(TokenType.KEYWORD, 'do');
        this.consume(TokenType.PUNCTUATION, ':');

        const body = this.parseBlock();

        this.consume(TokenType.KEYWORD, 'while');
        const condition = this.parseExpression();

        return {type: 'DoWhileStatement', body, condition, position: startPos};
    }

    private parseBreakStatement(): AST.BreakStatement
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'break');

        if (! this.stream.isEof) this.match(TokenType.NEWLINE);

        return {type: 'BreakStatement', position};
    }

    private parseContinueStatement(): AST.ContinueStatement
    {
        const position = this.currentPos();
        this.consume(TokenType.KEYWORD, 'continue');

        if (! this.stream.isEof) this.match(TokenType.NEWLINE);
        return {type: 'ContinueStatement', position};
    }

    private parseExpressionStatement(isPublic: boolean = false, isLocal: boolean = false): AST.ExpressionStatement
    {
        const position   = this.currentPos();
        const expression = this.parseExpression(isPublic, isLocal);
        if (! this.stream.isEof) this.consume(TokenType.NEWLINE);
        return {type: 'ExpressionStatement', expression, position};
    }

    private parseExpression(isPublic: boolean = false, isLocal: boolean = false): AST.Expr
    {
        let left = this.parseLogicalOr();

        if (isPublic || isLocal) {
            if (left.type !== 'Identifier') {
                throw new Error('Only identifiers can be marked as public or local in assignments.');
            }

            if (! this.check(TokenType.OPERATOR, '=')) {
                throw new Error(`Expected assignment operator '=' after public/local identifier "${left.value}".`);
            }
        }

        if (this.match(TokenType.OPERATOR, '=')) {
            const right = this.parseExpression();
            return {
                type:     'AssignmentExpression',
                left:     left,
                operator: '=',
                right:    right,
                isPublic,
                isLocal,
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
        let left = this.parseRange();

        while (
            this.check(TokenType.OPERATOR, '<') ||
            this.check(TokenType.OPERATOR, '>') ||
            this.check(TokenType.OPERATOR, '<=') ||
            this.check(TokenType.OPERATOR, '>=') ||
            this.check(TokenType.KEYWORD, 'in') ||
            this.check(TokenType.KEYWORD, 'not')
            ) {
            // 2. Handle 'not in' specifically
            if (this.match(TokenType.KEYWORD, 'not')) {
                if (! this.match(TokenType.KEYWORD, 'in')) {
                    throw new Error('Unexpected token \'not\'. Did you mean \'not in\'?');
                }

                const operator = 'not in';
                const right    = this.parseAdditive();
                left           = {type: 'BinaryExpression', left, operator, right} as AST.BinaryExpression;
                continue;
            }

            // Standard operators
            const token    = this.stream.consume();
            const operator = token.value;
            const right    = this.parseAdditive();

            left = {type: 'BinaryExpression', left, operator, right} as AST.BinaryExpression;
        }

        return left;
    }

    private parseRange(): AST.Expr
    {
        let left = this.parseAdditive();

        while (this.check(TokenType.OPERATOR, '..')) {
            const operator = this.stream.consume().value; // Consumes ".."
            const right    = this.parseAdditive();

            left = {
                type: 'BinaryExpression',
                left,
                operator,
                right,
            } as AST.BinaryExpression;
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

        return this.parseExponentiation();
    }

    private parseExponentiation(): AST.Expr
    {
        const left = this.parsePostfix();

        if (this.match(TokenType.OPERATOR, '^')) {
            const operator = '^';
            // Recursively call parseUnary to handle:
            // 1. Right Associativity: 2^3^4 -> 2^(3^4)
            // 2. Unary in exponent: 2^-5
            const right = this.parseUnary();
            return {type: 'BinaryExpression', left, operator, right} as AST.BinaryExpression;
        }

        return left;
    }

    private parsePostfix(): AST.Expr
    {
        let left = this.parsePrimary();

        while (true) {
            if (this.match(TokenType.PUNCTUATION, '(')) {
                const args: AST.Expr[] = [];
                if (! this.check(TokenType.PUNCTUATION, ')')) {
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
            if (token.value === 'parent') {
                this.stream.consume();
                const startPos = this.currentPos();
                this.consume(TokenType.PUNCTUATION, '.');
                const method = this.parseIdentifier();

                const args: Expr[] = [];
                this.consume(TokenType.PUNCTUATION, '(');
                if (! this.check(TokenType.PUNCTUATION, ')')) { // Peek for ')'
                    do {
                        args.push(this.parseExpression());
                    } while (this.match(TokenType.PUNCTUATION, ','));
                }
                this.consume(TokenType.PUNCTUATION, ')'); // consume ')'

                return {
                    type:       'ParentMethodCallExpression',
                    methodName: method,
                    arguments:  args,
                    position:   startPos,
                };
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
            if (token.value === 'new') {
                this.stream.consume();
                const startPos = this.currentPos();

                let className: AST.Identifier | AST.MemberExpression = this.parseIdentifier();

                while (this.match(TokenType.PUNCTUATION, '.')) {
                    const property = this.parseIdentifier();
                    className      = {
                        type:     'MemberExpression',
                        object:   className,
                        property: property,
                        computed: false,
                    } as AST.MemberExpression;
                }

                // Arguments are optional.
                const args: Expr[] = [];
                if (this.match(TokenType.PUNCTUATION, '(')) { // test & consume '('
                    if (! this.check(TokenType.PUNCTUATION, ')')) { // Peek for ')'
                        do {
                            args.push(this.parseExpression());
                        } while (this.match(TokenType.PUNCTUATION, ','));
                    }
                    this.consume(TokenType.PUNCTUATION, ')'); // consume ')'
                }

                return {
                    type:      'NewExpression',
                    className: className,
                    arguments: args,
                    position:  startPos,
                };
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

    private parseArrayExpression(): AST.ArrayExpression | AST.ArrayComprehension
    {
        this.skipFormatting();
        const position = this.currentPos();

        // Early exit on empty array []
        if (this.check(TokenType.PUNCTUATION, ']')) {
            this.consume(TokenType.PUNCTUATION, ']');
            return {type: 'ArrayExpression', elements: [], position};
        }

        // Parse the first element/expression
        const firstExpr = this.parseExpression();
        this.skipFormatting();

        // Is this an Array Comprehension? Syntax: [ expr FOR i IN collection ]
        if (this.match(TokenType.KEYWORD, 'for')) {
            const iteratorToken = this.consume(TokenType.IDENTIFIER);
            this.consume(TokenType.KEYWORD, 'in');
            const collection = this.parseExpression();

            this.skipFormatting();
            this.consume(TokenType.PUNCTUATION, ']');

            return {
                type:       'ArrayComprehension',
                expression: firstExpr,
                iterator:   {
                    type:     'Identifier',
                    value:    iteratorToken.value,
                    position: iteratorToken.position,
                },
                collection: collection,
                position,
            } satisfies AST.ArrayComprehension;
        }

        // Standard Array List;  We already have the first element, now look for commas
        const elements: AST.Expr[] = [firstExpr];

        while (this.match(TokenType.PUNCTUATION, ',')) {
            this.skipFormatting();

            // Handle trailing comma: [1, 2, ]
            if (this.check(TokenType.PUNCTUATION, ']')) break;

            elements.push(this.parseExpression());
            this.skipFormatting();
        }

        this.consume(TokenType.PUNCTUATION, ']');

        return {type: 'ArrayExpression', elements, position};
    }

    private parseObjectExpression(): AST.ObjectExpression | AST.ObjectComprehension
    {
        this.skipFormatting();
        const startPos = this.currentPos();

        // Early exit on empty objects.
        if (this.check(TokenType.PUNCTUATION, '}')) {
            this.consume(TokenType.PUNCTUATION, '}');
            return {type: 'ObjectExpression', properties: [], position: startPos};
        }

        // Parse the first Key-Value pair
        const firstKey = this.parseIdentifier();
        this.consume(TokenType.PUNCTUATION, ':');
        const firstValue = this.parseExpression();

        // Is this a Comprehension?
        if (this.match(TokenType.KEYWORD, 'for')) {
            const iterator = this.parseIdentifier();
            this.consume(TokenType.KEYWORD, 'in');
            const collection = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, '}');

            return {
                type:       'ObjectComprehension',
                key:        firstKey,
                value:      firstValue,
                iterator:   iterator,
                collection: collection,
                position:   startPos,
            };
        }

        const properties: AST.Property[] = [];

        properties.push({
            type:     'Property',
            key:      firstKey,
            value:    firstValue,
            position: startPos,
        });

        while (! this.check(TokenType.PUNCTUATION, '}')) {
            this.match(TokenType.PUNCTUATION, ',');
            this.skipFormatting();

            if (this.check(TokenType.PUNCTUATION, '}')) break;

            const key = this.parseIdentifier();
            this.consume(TokenType.PUNCTUATION, ':');
            const value = this.parseExpression();

            properties.push({type: 'Property', key, value, position: this.currentPos()});
        }

        this.consume(TokenType.PUNCTUATION, '}');
        return {type: 'ObjectExpression', properties, position: startPos};
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

        if (! token || token.type !== type || (value && token.value !== value)) {
            const msg = `Parse Error: Expected ${type} ${value || ''}, but found ${token?.type} ${token?.value}`;
            let pos   = '';
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

        if (! token || token.type !== type) {
            return false;
        }

        return ! (value && token.value !== value);
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
