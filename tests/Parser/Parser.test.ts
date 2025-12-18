import { describe, expect, it } from 'vitest';
import { Tokenizer }            from '../../dist/Tokenizer/index.js';
import { Parser }               from '../../dist/Parser/Parser.js';
import type * as AST            from '../../dist/Parser/AST.js';

describe('Parser', () => {

    it('should parse a basic function declaration', () => {
        const source  = `
fn greet:
    print("Hello")
    return 1
`;
        const tokens  = Tokenizer.tokenize(source);
        const parser  = new Parser(tokens);
        const program = parser.parse();

        // 1. Check Root
        expect(program.type).toBe('Program');
        expect(program.body.length).toBe(1);

        // 2. Check Function Declaration
        const func = program.body[0] as AST.FunctionDeclaration;
        expect(func.type).toBe('FunctionDeclaration');
        expect(func.name.value).toBe('greet');
        expect(func.params.length).toBe(0);

        // 3. Check Block Body
        expect(func.body.type).toBe('Block');
        expect(func.body.body.length).toBe(2);

        // 4. Check 'print("Hello")'
        const stmt1 = func.body.body[0] as AST.ExpressionStatement;
        expect(stmt1.type).toBe('ExpressionStatement');

        const call = stmt1.expression as AST.CallExpression;
        expect(call.type).toBe('CallExpression');
        expect((call.callee as AST.Identifier).value).toBe('print');
        expect(call.arguments.length).toBe(1);
        expect((call.arguments[0] as AST.Literal).value).toBe('Hello');

        // 5. Check 'return 1'
        const stmt2 = func.body.body[1] as AST.ReturnStatement;
        expect(stmt2.type).toBe('ReturnStatement');
        expect((stmt2.argument as AST.Literal).value).toBe(1);
        // Note: Tokenizer currently returns numbers as strings in 'value',
        // you might parse them to real numbers in the Parser if desired.
    });

    it('should parse if/else blocks correctly', () => {
        const source  = `
if is_ready:
    start_game()
else:
    wait()
`;
        const tokens  = Tokenizer.tokenize(source);
        const parser  = new Parser(tokens);
        const program = parser.parse();

        const ifStmt = program.body[0] as AST.IfStatement;

        expect(ifStmt.type).toBe('IfStatement');

        // Check Condition
        expect((ifStmt.test as AST.Identifier).value).toBe('is_ready');

        // Check 'Consequent' (The 'if' block)
        expect(ifStmt.consequent.body.length).toBe(1);
        const ifCall = (ifStmt.consequent.body[0] as AST.ExpressionStatement).expression as AST.CallExpression;
        expect((ifCall.callee as AST.Identifier).value).toBe('start_game');

        // Check 'Alternate' (The 'else' block)
        expect(ifStmt.alternate).toBeDefined();
        const elseBlock = ifStmt.alternate as AST.Block;
        expect(elseBlock.type).toBe('Block');
        const elseCall = (elseBlock.body[0] as AST.ExpressionStatement).expression as AST.CallExpression;
        expect((elseCall.callee as AST.Identifier).value).toBe('wait');
    });

    it('should handle nested blocks', () => {
        const source  = `
fn check:
    if true:
        if true:
            return 1
`;
        const tokens  = Tokenizer.tokenize(source);
        const parser  = new Parser(tokens);
        const program = parser.parse();

        const func       = program.body[0] as AST.FunctionDeclaration;
        const outerIf    = func.body.body[0] as AST.IfStatement;
        const outerBlock = outerIf.consequent;
        const innerIf    = outerBlock.body[0] as AST.IfStatement;
        const innerBlock = innerIf.consequent;
        const ret        = innerBlock.body[0] as AST.ReturnStatement;

        expect(ret.type).toBe('ReturnStatement');
    });
});

describe('Parser - Arrays and Objects', () => {
    it('should parse array declaration', () => {
        // Source: myArray = [1, "foo", true]
        const source = `myArray = [1, "foo", true]`;
        const tokens = Tokenizer.tokenize(source);
        const parser = new Parser(tokens);
        const program = parser.parse();

        const assign = (program.body[0] as AST.ExpressionStatement).expression as AST.AssignmentExpression;

        // Check Array Type
        expect(assign.right.type).toBe('ArrayExpression');
        const arrayNode = assign.right as AST.ArrayExpression;

        // Check Elements
        expect(arrayNode.elements.length).toBe(3);
        expect((arrayNode.elements[0] as AST.Literal).value).toBe(1);
        expect((arrayNode.elements[1] as AST.Literal).value).toBe('foo');
        expect((arrayNode.elements[2] as AST.Literal).value).toBe(true);
    });

    it('should parse array access', () => {
        // Source: print(myArray[1])
        const source = `print(myArray[1])`;
        const tokens = Tokenizer.tokenize(source);
        const parser = new Parser(tokens);
        const program = parser.parse();

        const call = (program.body[0] as AST.ExpressionStatement).expression as AST.CallExpression;
        const arg = call.arguments[0] as AST.MemberExpression;

        expect(arg.type).toBe('MemberExpression');
        expect(arg.computed).toBe(true); // Bracket notation = computed
        expect((arg.object as AST.Identifier).value).toBe('myArray');
        expect((arg.property as AST.Literal).value).toBe(1);
    });

    it('should parse object declaration', () => {
        // Source: myObject = {foo: 42}
        const source = `myObject = {foo: 42}`;
        const tokens = Tokenizer.tokenize(source);
        const parser = new Parser(tokens);
        const program = parser.parse();

        const assign = (program.body[0] as AST.ExpressionStatement).expression as AST.AssignmentExpression;
        const objNode = assign.right as AST.ObjectExpression;

        expect(objNode.type).toBe('ObjectExpression');
        expect(objNode.properties.length).toBe(1);
        expect(objNode.properties[0].key.value).toBe('foo');
        expect((objNode.properties[0].value as AST.Literal).value).toBe(42);
    });

    it('should parse object access (dot notation)', () => {
        const source = `print(myObject.foo)`;
        const tokens = Tokenizer.tokenize(source);
        const parser = new Parser(tokens);
        const program = parser.parse();

        const call = (program.body[0] as AST.ExpressionStatement).expression as AST.CallExpression;
        const member = call.arguments[0] as AST.MemberExpression;

        expect(member.type).toBe('MemberExpression');
        expect(member.computed).toBe(false); // Dot notation = not computed
        expect((member.object as AST.Identifier).value).toBe('myObject');
        expect((member.property as AST.Identifier).value).toBe('foo');
    });

    it('should parse complex chaining', () => {
        const source = `data[0].users.get(1)`;
        const parser = new Parser(Tokenizer.tokenize(source));
        const program = parser.parse();

        // This is a deep structure, let's verify top-down
        // 1. Top is CallExpression: .get(1)
        const call = (program.body[0] as AST.ExpressionStatement).expression as AST.CallExpression;
        expect(call.type).toBe('CallExpression');

        // 2. Callee is MemberExpression: .users.get (accessing 'get' on '.users')
        const dotAccess = call.callee as AST.MemberExpression;
        expect(dotAccess.computed).toBe(false);
        expect((dotAccess.property as AST.Identifier).value).toBe('get');

        // 3. Object is MemberExpression: data[0].users (accessing 'users' on data[0])
        const usersAccess = dotAccess.object as AST.MemberExpression;
        expect(usersAccess.computed).toBe(false);
        expect((usersAccess.property as AST.Identifier).value).toBe('users');

        // 4. Object is MemberExpression: data[0]
        const arrayAccess = usersAccess.object as AST.MemberExpression;
        expect(arrayAccess.computed).toBe(true);
        expect((arrayAccess.property as AST.Literal).value).toBe(0);
        expect((arrayAccess.object as AST.Identifier).value).toBe('data');
    });
});
