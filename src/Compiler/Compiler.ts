import * as AST                     from '../Parser/AST.js';
import { Parser }                   from '../Parser/index.js';
import { Tokenizer, TokenPosition } from '../Tokenizer/index.js';
import { Instruction, Opcode }      from './Opcodes.js';
import { Program }                  from './Program.js';

export class Compiler
{
    private loopStack: LoopContext[]         = [];
    private currentPos: TokenPosition | null = null;

    private program: Program = {
        instructions: [],
        metadata:     {
            functions: {},
            events:    {},
        },
    };

    public static compile(source: string): Program
    {
        const tokens = Tokenizer.tokenize(source);
        const ast    = Parser.parse(tokens);

        return new Compiler().compile(ast);
    }

    public compile(program: AST.Script): Program
    {
        this.program = {
            instructions: [],
            metadata:     {
                functions: {},
                events:    {},
            },
        };

        this.hoistFunctions(program);
        this.hoistEventHooks(program);

        for (const stmt of program.body) {
            this.visit(stmt);
        }

        this.emit(Opcode.HALT);

        return this.program;
    }

    private visit(node: AST.Stmt | AST.Expr): void
    {
        if (node.position) this.currentPos = node.position;

        switch (node.type) {
            case 'Block':
                (node as AST.Block).body.forEach(s => this.visit(s));
                break;

            case 'ExpressionStatement':
                this.visit((node as AST.ExpressionStatement).expression);
                this.emit(Opcode.POP);
                break;

            case 'ThisExpression':
                this.emit(Opcode.LOAD, 'this');
                break;

            case 'ReturnStatement':
                const ret = node as AST.ReturnStatement;
                if (ret.argument) {
                    this.visit(ret.argument);
                } else {
                    this.emit(Opcode.CONST, null); // void return.
                }
                this.emit(Opcode.RET);
                break;

            case 'IfStatement':
                this.visitIfStatement(node as AST.IfStatement);
                break;

            case 'FunctionDeclaration':
            case 'EventHook':
                // Handled in hoisting phase.
                break;
            case 'MethodDefinition':
                this.visitMethodDefinition(node as AST.MethodDefinition);
                break;

            case 'Literal':
                this.emit(Opcode.CONST, (node as AST.Literal).value);
                break;

            case 'Identifier':
                this.emit(Opcode.LOAD, (node as AST.Identifier).value);
                break;

            case 'BinaryExpression':
                this.visitBinaryExpression(node as AST.BinaryExpression);
                break;

            case 'LogicalExpression':
                this.visitLogicalExpression(node as AST.LogicalExpression);
                break;

            case 'UnaryExpression':
                this.visitUnaryExpression(node as AST.UnaryExpression);
                break;

            case 'CallExpression':
                this.visitCallExpression(node as AST.CallExpression);
                break;

            case 'ForStatement':
                this.visitForStatement(node as AST.ForStatement);
                break;

            case 'BreakStatement':
                this.visitBreakStatement(node as AST.BreakStatement);
                break;

            case 'ContinueStatement':
                this.visitContinueStatement(node as AST.ContinueStatement);
                break;

            case 'ArrayExpression':
                this.visitArrayExpression(node as AST.ArrayExpression);
                break;

            case 'ObjectExpression':
                this.visitObjectExpression(node as AST.ObjectExpression);
                break;

            case 'MemberExpression':
                this.visitMemberExpression(node as AST.MemberExpression);
                break;

            case 'AssignmentExpression':
                this.visitAssignmentExpression(node as AST.AssignmentExpression);
                break;

            default:
                throw new Error(`Compiler: Unknown node type ${node.type}`);
        }
    }

    private visitBinaryExpression(node: AST.BinaryExpression)
    {
        this.visit(node.left);
        this.visit(node.right);

        switch (node.operator) {
            case '+':
                this.emit(Opcode.ADD);
                break;
            case '-':
                this.emit(Opcode.SUB);
                break;
            case '*':
                this.emit(Opcode.MUL);
                break;
            case '/':
                this.emit(Opcode.DIV);
                break;
            case '==':
                this.emit(Opcode.EQ);
                break;
            case '!=':
                this.emit(Opcode.NEQ);
                break;
            case '>=':
                this.emit(Opcode.GTE);
                break;
            case '>':
                this.emit(Opcode.GT);
                break;
            case '<=':
                this.emit(Opcode.LTE);
                break;
            case '<':
                this.emit(Opcode.LT);
                break;
        }
    }

    private visitLogicalExpression(node: AST.LogicalExpression)
    {
        this.visit(node.left);
        this.emit(Opcode.DUP);

        if (node.operator === 'or') {
            const jumpIndex = this.emit(Opcode.JMP_IF_TRUE, -1);

            this.emit(Opcode.POP);
            this.visit(node.right);

            this.patch(jumpIndex, this.program.instructions.length);
        } else if (node.operator === 'and') {
            const jumpIndex = this.emit(Opcode.JMP_IF_FALSE, -1);

            this.emit(Opcode.POP);
            this.visit(node.right);

            this.patch(jumpIndex, this.program.instructions.length);
        }
    }

    private visitUnaryExpression(node: AST.UnaryExpression)
    {
        this.visit(node.argument);

        switch (node.operator) {
            case 'not':
            case '!':
                this.emit(Opcode.NOT);
                break;
            case '-':
                this.emit(Opcode.NEG);
                break;
            default:
                throw new Error(`Compiler: Unknown unary operator ${node.operator}`);
        }
    }

    private visitMethodDefinition(node: AST.MethodDefinition)
    {
        const jumpOver  = this.emit(Opcode.JMP, 0); // Skip body during execution
        const funcStart = this.program.instructions.length;

        for (let i = node.params.length - 1; i >= 0; i--) {
            this.emit(Opcode.STORE, node.params[i].value);
        }

        this.visit(node.body);
        this.emit(Opcode.CONST, null);
        this.emit(Opcode.RET);
        this.patch(jumpOver, this.program.instructions.length);
        this.emit(Opcode.LOAD, node.objectName.value);
        this.emit(Opcode.CONST, node.methodName);
        this.emit(Opcode.MAKE_FUNCTION, {name: node.methodName, addr: funcStart, args: node.params.length});
        this.emit(Opcode.SET_PROP);
    }

    private visitIfStatement(node: AST.IfStatement)
    {
        // 1. Compile Condition
        this.visit(node.test);

        // 2. Emit Jump-If-False (Placeholder)
        const jumpToElseIndex = this.emit(Opcode.JMP_IF_FALSE, -1);

        // 3. Compile "Then" Block
        this.visit(node.consequent);

        // 4. Emit Jump to End (to skip the Else block)
        const jumpToEndIndex = this.emit(Opcode.JMP, -1);

        // 5. Patch the JMP_IF_FALSE to point to here (Start of Else)
        this.patch(jumpToElseIndex, this.program.instructions.length);

        // 6. Compile "Else" Block (if it exists)
        if (node.alternate) {
            this.visit(node.alternate);
        }

        // 7. Patch the JMP to point to here (End of If/Else)
        this.patch(jumpToEndIndex, this.program.instructions.length);
    }

    private visitCallExpression(node: AST.CallExpression)
    {
        if (node.callee.type === 'MemberExpression') {
            const propName = (node.callee.property as AST.Identifier).value;
            node.arguments.forEach(arg => this.visit(arg));
            this.visit((node.callee as AST.MemberExpression).object);
            this.emit(Opcode.CALL_METHOD, {
                name: propName,
                args: node.arguments.length,
            });
            return;
        }

        node.arguments.forEach(arg => this.visit(arg));

        if (node.callee.type !== 'Identifier') {
            throw new Error('Dynamic function calls not supported yet');
        }

        const funcName = (node.callee as AST.Identifier).value;
        const funcAddr = this.program.metadata.functions[funcName];

        this.emit(Opcode.CALL, {name: funcName, addr: funcAddr?.address, args: node.arguments.length});
    }

    private visitArrayExpression(node: AST.ArrayExpression)
    {
        for (const element of node.elements) {
            this.visit(element);
        }

        this.emit(Opcode.MAKE_ARRAY, node.elements.length);
    }

    private visitObjectExpression(node: AST.ObjectExpression)
    {
        for (const prop of node.properties) {
            this.emit(Opcode.CONST, prop.key.value);
            this.visit(prop.value);
        }

        this.emit(Opcode.MAKE_OBJECT, node.properties.length);
    }

    private visitMemberExpression(node: AST.MemberExpression)
    {
        this.visit(node.object);

        if (node.computed) {
            this.visit(node.property);
        } else {
            if (node.property.type !== 'Identifier') {
                throw new Error('Dot notation requires an identifier.');
            }

            this.emit(Opcode.CONST, (node.property as AST.Identifier).value);
        }

        let debugName: string | undefined = undefined;
        if (node.object.type === 'Identifier') {
            debugName = (node.object as AST.Identifier).value;
        }

        this.emit(Opcode.GET_PROP, debugName);
    }

    private visitAssignmentExpression(node: AST.AssignmentExpression)
    {
        if (node.left.type === 'Identifier') {
            this.visit(node.right);
            this.emit(Opcode.STORE, (node.left as AST.Identifier).value);
            return;
        }

        if (node.left.type === 'MemberExpression') {
            const member = node.left as AST.MemberExpression;

            this.visit(member.object);

            if (member.computed) {
                this.visit(member.property);
            } else {
                this.emit(Opcode.CONST, (member.property as AST.Identifier).value);
            }

            this.visit(node.right);

            this.emit(Opcode.SET_PROP);
            return;
        }

        throw new Error('Invalid assignment target');
    }

    private visitForStatement(node: AST.ForStatement)
    {
        this.visit(node.collection);
        this.emit(Opcode.ITER_INIT);

        const iterNextIndex = this.program.instructions.length;

        this.loopStack.push({
            continueAddress: iterNextIndex,
            breakPatchList:  [],
        });

        const jumpToExitIndex = this.emit(Opcode.ITER_NEXT, -1);

        this.emit(Opcode.STORE, node.iterator.value);
        this.visit(node.body);

        this.emit(Opcode.JMP, iterNextIndex);

        const loopEndIndex = this.program.instructions.length;
        this.patch(jumpToExitIndex, loopEndIndex);

        const context = this.loopStack.pop();
        if (context) {
            for (const breakIndex of context.breakPatchList) {
                this.patch(breakIndex, loopEndIndex);
            }
        }
    }

    private visitBreakStatement(node: AST.BreakStatement)
    {
        if (this.loopStack.length === 0) {
            throw new Error('Compiler Error: \'break\' used outside of loop');
        }

        const index = this.emit(Opcode.JMP, -1);

        this.loopStack[this.loopStack.length - 1].breakPatchList.push(index);
    }

    private visitContinueStatement(node: AST.ContinueStatement)
    {
        if (this.loopStack.length === 0) {
            throw new Error('Compiler Error: \'continue\' used outside of loop');
        }

        const ctx = this.loopStack[this.loopStack.length - 1];
        this.emit(Opcode.JMP, ctx.continueAddress);
    }

    private hoistFunctions(program: AST.Script)
    {
        const functions = program.body.filter(s => s.type === 'FunctionDeclaration') as AST.FunctionDeclaration[];

        if (functions.length === 0) {
            return;
        }

        const jumpOverIndex = this.emit(Opcode.JMP, -1);

        for (const func of functions) {
            this.program.metadata.functions[func.name.value] = {
                address: this.program.instructions.length,
                numArgs: func.params.length,
            };

            const params: string[] = [];
            const instrStartIndex  = this.program.instructions.length;

            for (let i = func.params.length - 1; i >= 0; i--) {
                const paramName = func.params[i].value;
                params.push(paramName);
                this.emit(Opcode.STORE, paramName);
            }

            this.visit(func.body);

            this.program.instructions[instrStartIndex].comment = `DECL ${func.name.value}(${params.reverse().join(', ')})`;

            const lastStmt = func.body.body[func.body.body.length - 1];
            if (! lastStmt || lastStmt.type !== 'ReturnStatement') {
                this.emit(Opcode.CONST, null);
                this.emit(Opcode.RET);
            }
        }

        this.patch(jumpOverIndex, this.program.instructions.length);
    }

    private hoistEventHooks(program: AST.Script)
    {
        const hooks = program.body.filter(s => s.type === 'EventHook') as AST.EventHook[];

        if (hooks.length === 0) {
            return;
        }

        const jumpOverIndex = this.emit(Opcode.JMP, -1);

        for (const hook of hooks) {
            this.program.metadata.events[hook.name.value] = {
                address: this.program.instructions.length,
                numArgs: hook.params.length,
            };

            const params: string[] = [];
            const instrStartIndex  = this.program.instructions.length;

            for (let i = hook.params.length - 1; i >= 0; i--) {
                const paramName = hook.params[i].value;
                params.push(paramName);
                this.emit(Opcode.STORE, paramName);
            }

            this.visit(hook.body);

            this.program.instructions[instrStartIndex].comment = `HOOK ${hook.name.value}(${params.reverse().join(', ')})`;

            const lastStmt = hook.body.body[hook.body.body.length - 1];
            if (! lastStmt || lastStmt.type !== 'ReturnStatement') {
                this.emit(Opcode.CONST, null);
                this.emit(Opcode.RET);
            }
        }

        this.patch(jumpOverIndex, this.program.instructions.length);
    }

    private emit(op: Opcode, arg: any = null): number
    {
        const instr: Instruction = {op, arg, pos: this.currentPos ? {...this.currentPos} : undefined};
        this.program.instructions.push(instr);

        return this.program.instructions.length - 1;
    }

    private patch(index: number, value: any)
    {
        this.program.instructions[index].arg = value;
    }
}

interface LoopContext
{
    continueAddress: number;
    breakPatchList: number[];
}
