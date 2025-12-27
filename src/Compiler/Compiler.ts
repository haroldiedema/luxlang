import * as AST                     from '../Parser/AST.js';
import { Parser }                   from '../Parser/index.js';
import { Tokenizer, TokenPosition } from '../Tokenizer/index.js';
import { Instruction, Opcode }      from './Opcodes.js';
import { Program }                  from './Program.js';

export class Compiler
{
    private loopStack: LoopContext[]               = [];
    private currentPos: TokenPosition | null       = null;
    private pendingCalls: Record<string, number[]> = {};
    private currentBlueprintName: string | null    = null;

    private program: Program = {
        hash:         '',
        source:       '',
        moduleName:   undefined,
        instructions: [],
        references:   {
            functions: {},
            events:    {},
        },
        exported:     {
            functions: [],
            variables: [],
        },
    };

    public static compile(source: string, moduleName?: string): Program
    {
        const tokens = Tokenizer.tokenize(source);
        const ast    = Parser.parse(tokens);

        return new Compiler().compile(moduleName, source, ast);
    }

    private compile(moduleName: string | undefined, source: string, program: AST.Script): Program
    {
        this.program.moduleName = moduleName;
        this.program.source     = source;

        this.hoistFunctions(program);
        this.hoistEventHooks(program);

        for (const stmt of program.body) {
            this.visit(stmt);
        }

        this.emit(Opcode.RET);

        this.program.hash = this.createHash();

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

            case 'ImportStatement': {
                const moduleName = (node as AST.ImportStatement).moduleName;
                this.emit(Opcode.IMPORT, moduleName); // Import the module.
                this.emit(Opcode.STORE, [moduleName]);  // Store the public exports of the module in a variable.
                break;
            }

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

            case 'WaitStatement':
                this.visit((node as AST.WaitStatement).duration);
                this.emit(Opcode.WAIT);
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

            case 'WhileStatement':
                this.visitWhileStatement(node as AST.WhileStatement);
                break;

            case 'DoWhileStatement':
                this.visitDoWhileStatement(node as AST.DoWhileStatement);
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

            case 'ArrayComprehension':
                this.visitArrayComprehension(node as AST.ArrayComprehension);
                break;

            case 'ObjectExpression':
                this.visitObjectExpression(node as AST.ObjectExpression);
                break;

            case 'ObjectComprehension':
                this.visitObjectComprehension(node as AST.ObjectComprehension);
                break;

            case 'MemberExpression':
                this.visitMemberExpression(node as AST.MemberExpression);
                break;

            case 'AssignmentExpression':
                this.visitAssignmentExpression(node as AST.AssignmentExpression);
                break;

            case 'BlueprintStatement':
                this.visitBlueprintStatement(node as AST.BlueprintStatement);
                break;

            case 'NewExpression':
                this.visitNewExpression(node as AST.NewExpression);
                break;

            case 'ParentMethodCallExpression':
                this.visitParentMethodCallExpression(node as AST.ParentMethodCallExpression);
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
            case '%':
                this.emit(Opcode.MOD);
                break;
            case '^':
                this.emit(Opcode.EXP);
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
            case 'in':
                this.emit(Opcode.IN);
                break;
            case 'not in':
                this.emit(Opcode.IN);
                this.emit(Opcode.NOT);
                break;
            case '..':
                this.emit(Opcode.MAKE_RANGE);
                break;
            default:
                throw new Error(`Compiler: Unknown binary operator ${node.operator}`);
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
            this.emit(Opcode.STORE, [node.params[i].value]);
        }

        this.visit(node.body);
        this.emit(Opcode.CONST, null);
        this.emit(Opcode.RET);
        this.patch(jumpOver, this.program.instructions.length);
        this.emit(Opcode.LOAD, node.objectName.value);
        this.emit(Opcode.CONST, node.methodName);
        this.emit(Opcode.MAKE_FUNCTION, {name: node.methodName, addr: funcStart, args: node.params.length});
        this.emit(Opcode.SET_PROP);
        this.emit(Opcode.POP);
    }

    private visitIfStatement(node: AST.IfStatement)
    {
        this.visit(node.test);

        const jumpToElseIndex = this.emit(Opcode.JMP_IF_FALSE, -1);

        this.visit(node.consequent);

        const jumpToEndIndex = this.emit(Opcode.JMP, -1);

        this.patch(jumpToElseIndex, this.program.instructions.length);

        if (node.alternate) {
            this.visit(node.alternate);
        }

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

        const funcName = (node.callee as AST.Identifier).value;
        const funcRef  = this.program.references.functions[funcName];

        // 1. Get address (or -1 if not compiled yet, or null if dynamic/unknown)
        const initialAddr = funcRef ? funcRef.address : null;

        // 2. Emit CALL
        const instrIndex = this.emit(Opcode.CALL, {
            name: funcName,
            addr: initialAddr,
            args: node.arguments.length,
        });

        // 3. Register for Phase 3 Resolution if needed
        if (funcRef && funcRef.address === -1) {
            if (! this.pendingCalls[funcName]) {
                this.pendingCalls[funcName] = [];
            }
            this.pendingCalls[funcName].push(instrIndex);
        }
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

    private visitObjectComprehension(node: AST.ObjectComprehension)
    {
        // 1. Unique Iterator Name
        const uniqueIterName = `$comp_${this.program.instructions.length}`;

        // 2. Clone expressions for variable renaming
        const patchedKey   = structuredClone(node.key);
        const patchedValue = structuredClone(node.value);

        this.replaceIdentifier(patchedKey, node.iterator.value, uniqueIterName);
        this.replaceIdentifier(patchedValue, node.iterator.value, uniqueIterName);

        // 3. Setup Accumulator
        this.emit(Opcode.MAKE_OBJECT);
        this.emit(Opcode.STORE, ['$comp_obj_result', true]);

        // 4. Loop Setup
        this.visit(node.collection);
        this.emit(Opcode.ITER_INIT);

        const iterNextIndex = this.program.instructions.length;
        const jumpToExit    = this.emit(Opcode.ITER_NEXT, -1);

        this.emit(Opcode.STORE, [uniqueIterName, true]);

        // 5. Body: Set Property
        this.emit(Opcode.LOAD, '$comp_obj_result'); // Target Object

        this.visit(patchedKey);                     // Key (Evaluated!)
        this.visit(patchedValue);                   // Value (Evaluated!)

        this.emit(Opcode.SET_PROP);                 // Stack: [Obj, Key, Val] -> [Obj]
        this.emit(Opcode.POP);
        this.emit(Opcode.JMP, iterNextIndex);

        // 6. Cleanup
        const loopEndIndex = this.program.instructions.length;
        this.patch(jumpToExit, loopEndIndex);
        this.emit(Opcode.POP);

        // 7. Result
        this.emit(Opcode.LOAD, '$comp_obj_result');
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
            this.emit(Opcode.DUP); // Duplicate value for STORE and possible EXPORT

            const operand: any = [(node.left as AST.Identifier).value];

            if (node.isLocal) {
                operand.push(true);
            }

            this.emit(Opcode.STORE, operand);

            if (node.isPublic) {
                const varName: string = (node.left as AST.Identifier).value;
                this.program.exported.variables.push(varName);

                this.emit(Opcode.CONST, varName); // Internal variable name
                this.emit(Opcode.CONST, varName); // External export name
                this.emit(Opcode.EXPORT);
            }
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

    private visitArrayComprehension(node: AST.ArrayComprehension)
    {
        const uniqueIterName    = `$comp_${this.program.instructions.length}`;
        const patchedExpression = structuredClone(node.expression);

        this.replaceIdentifier(patchedExpression, node.iterator.value, uniqueIterName);

        this.emit(Opcode.MAKE_ARRAY, 0);
        this.emit(Opcode.STORE, ['$comp_result', true]);

        this.visit(node.collection);

        this.emit(Opcode.ITER_INIT);

        const iterNextIndex = this.program.instructions.length;
        const jumpToExit    = this.emit(Opcode.ITER_NEXT, -1);

        this.emit(Opcode.STORE, [uniqueIterName, true]);
        this.emit(Opcode.LOAD, '$comp_result');

        this.visit(patchedExpression);

        this.emit(Opcode.ARRAY_PUSH);
        this.emit(Opcode.JMP, iterNextIndex);

        const loopEndIndex = this.program.instructions.length;
        this.patch(jumpToExit, loopEndIndex);

        this.emit(Opcode.POP);
        this.emit(Opcode.LOAD, '$comp_result');
    }

    private visitForStatement(node: AST.ForStatement)
    {
        const uniqueIterName = `$loop_${node.iterator.value}_${this.program.instructions.length}`;

        this.visit(node.collection);
        this.emit(Opcode.ITER_INIT);

        const iterNextIndex = this.program.instructions.length;

        this.loopStack.push({
            type:            'for',
            continueAddress: iterNextIndex,
            breakPatchList:  [],
        });

        const jumpToExitIndex = this.emit(Opcode.ITER_NEXT, -1);

        this.emit(Opcode.STORE, [uniqueIterName, true]);

        const bodyClone = structuredClone(node.body);

        this.replaceIdentifier(bodyClone, node.iterator.value, uniqueIterName);

        this.visit(bodyClone);

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

    private visitWhileStatement(node: AST.WhileStatement)
    {
        const startAddress = this.program.instructions.length;

        this.visit(node.condition);
        const exitJump = this.emit(Opcode.JMP_IF_FALSE, 0);

        // Push loop context
        this.loopStack.push({
            type:            'while',
            continueAddress: startAddress,
            breakPatchList:  [],
        });

        this.visit(node.body);

        const loopCtx = this.loopStack.pop()!;
        this.emit(Opcode.JMP, startAddress);

        // Patch the main exit jump
        this.patch(exitJump, this.program.instructions.length);

        // Patch all 'break' statements found inside the loop
        for (const breakIndex of loopCtx.breakPatchList) {
            this.patch(breakIndex, this.program.instructions.length);
        }
    }

    private visitDoWhileStatement(node: AST.DoWhileStatement)
    {
        const startAddress     = this.program.instructions.length;
        const ctx: LoopContext = {
            continueAddress:   -1,
            breakPatchList:    [],
            continuePatchList: [],
            type:              'do-while',
        };
        this.loopStack.push(ctx);

        this.visit(node.body);

        // NOW we know where the condition is
        const conditionAddress = this.program.instructions.length;

        // Patch all 'continue' jumps to point here
        for (const patchIdx of ctx.continuePatchList ?? []) {
            this.patch(patchIdx, conditionAddress);
        }

        this.visit(node.condition);
        this.emit(Opcode.JMP_IF_TRUE, startAddress);

        this.loopStack.pop();

        // Patch all 'break' jumps to point to the instruction AFTER the loop
        const exitAddress = this.program.instructions.length;
        for (const patchIdx of ctx.breakPatchList) {
            this.patch(patchIdx, exitAddress);
        }
    }

    private visitBreakStatement(node: AST.BreakStatement)
    {
        if (this.loopStack.length === 0) {
            throw new Error('Compiler Error: \'break\' used outside of loop');
        }

        const ctx = this.loopStack[this.loopStack.length - 1];

        // Only POP if we are breaking out of a 'for' loop that has an iterator on stack
        if (ctx.type === 'for') {
            this.emit(Opcode.POP);
        }

        const index = this.emit(Opcode.JMP, -1);
        ctx.breakPatchList.push(index);
    }

    private visitContinueStatement(node: AST.ContinueStatement)
    {
        if (this.loopStack.length === 0) {
            throw new Error('Compiler Error: \'continue\' used outside of loop');
        }

        const ctx = this.loopStack[this.loopStack.length - 1];

        if (ctx.type === 'do-while') {
            const index = this.emit(Opcode.JMP, -1);
            if (! ctx.continuePatchList) {
                ctx.continuePatchList = [];
            }

            ctx.continuePatchList.push(index);
        } else {
            this.emit(Opcode.JMP, ctx.continueAddress);
        }
    }

    private visitBlueprintStatement(node: AST.BlueprintStatement)
    {
        const jumpIndex             = this.emit(Opcode.JMP, 0);
        const constructorStartIndex = this.program.instructions.length;

        this.currentBlueprintName = node.name.value;

        let constructorParams = node.params;

        const initMethod    = node.methods.find(m => m.name.value === 'init');
        const useInitParams = node.params.length === 0 && initMethod;

        // AMBIGUITY CHECK
        if (node.params.length > 0 && initMethod && initMethod.params.length > 0) {
            throw new Error(
                `Blueprint '${node.name.value}' has an ambiguous constructor definition.\n\n` +
                `It defines parameters in the blueprint header (${node.params.length}) AND in the 'init' method (${initMethod.params.length}).\n` +
                `Please use only one style:\n` +
                `  1. Header params: blueprint ${node.name.value}(...) + fn init()\n` +
                `  2. Init params:   blueprint ${node.name.value} + fn init(...)`,
            );
        }

        if (useInitParams) {
            constructorParams = initMethod.params;
        }

        for (let i = constructorParams.length - 1; i >= 0; i--) {
            this.emit(Opcode.STORE, [constructorParams[i].value, true]);
        }

        // Call Parent Constructor if applicable.
        if (node.parent) {
            this.emit(Opcode.LOAD, 'this'); // Push 'this'
            for (const arg of node.parentArgs ?? []) {
                this.visit(arg); // Push Args
            }

            this.visit(node.parent);
            this.emit(Opcode.CALL_PARENT, node.parentArgs?.length ?? 0);
            this.emit(Opcode.POP); // Pop the 'this' returned by RET
        }

        // Initialize properties.
        for (const prop of node.properties) {
            this.emit(Opcode.LOAD, 'this');          // 1. Object
            this.emit(Opcode.CONST, prop.key.value); // 2. Key (Emit this BEFORE visiting value)
            this.visit(prop.value);                  // 3. Value
            this.emit(Opcode.SET_PROP);               // or SET_PROP
            this.emit(Opcode.POP);
        }

        if (initMethod) {
            let argCount = constructorParams.length;

            if (useInitParams) {
                for (const param of constructorParams) {
                    this.emit(Opcode.LOAD, param.value);
                }
                argCount = constructorParams.length;
            }

            this.emit(Opcode.LOAD, 'this');
            this.emit(Opcode.CALL_METHOD, {
                name: 'init',
                args: argCount,
            });

            this.emit(Opcode.POP); // Discard init return value.
        }

        this.emit(Opcode.LOAD, 'this');
        this.emit(Opcode.RET);

        const constructorEndIndex = this.program.instructions.length;
        this.patch(jumpIndex, constructorEndIndex);

        // Push the parent (or NULL) on the stack. Consumed by MAKE_BLUEPRINT.
        if (node.parent) {
            this.visit(node.parent);
            // this.emit(Opcode.LOAD, node.parent.value);
        } else {
            this.emit(Opcode.CONST, null);
        }

        this.emit(Opcode.MAKE_BLUEPRINT, [node.name.value, constructorStartIndex, constructorParams.length]);
        this.emit(Opcode.STORE, [node.name.value]);

        // Attach methods.
        for (const method of node.methods) {
            const methodJump = this.emit(Opcode.JMP, 0);
            const methodAddr = this.program.instructions.length;

            // ... Method Preamble (Store Params) ...
            for (let i = method.params.length - 1; i >= 0; i--) {
                this.emit(Opcode.STORE, [method.params[i].value, true]);
            }

            this.visit(method.body);

            // Ensure void return
            if (this.program.instructions[this.program.instructions.length - 1].op !== Opcode.RET) {
                this.emit(Opcode.CONST, 0); // Void return
                this.emit(Opcode.RET);
            }

            const methodEnd = this.program.instructions.length;
            this.patch(methodJump, methodEnd);

            // Attach Method to Blueprint
            this.emit(Opcode.LOAD, node.name.value); // Load Blueprint
            this.emit(Opcode.MAKE_FUNCTION, {name: method.name.value, addr: methodAddr, args: method.params.length});
            this.emit(Opcode.MAKE_METHOD); // Pulls MAKE_FUNCTION & bp from the stack and glue it to the blueprint.
        }

        // Clear current blueprint context.
        this.currentBlueprintName = null;

        if (node.isPublic) {
            this.program.exported.functions.push(node.name.value);
            this.emit(Opcode.CONST, node.name.value); // Internal
            this.emit(Opcode.CONST, node.name.value); // External
            this.emit(Opcode.EXPORT);
        }
    }

    private visitNewExpression(node: AST.NewExpression)
    {
        for (const arg of node.arguments) {
            this.visit(arg);
        }

        this.visit(node.className);
        this.emit(Opcode.NEW, node.arguments.length);
    }

    private visitParentMethodCallExpression(node: AST.ParentMethodCallExpression)
    {
        this.emit(Opcode.LOAD, 'this');

        for (const arg of node.arguments) {
            this.visit(arg);
        }

        this.emit(Opcode.SUPER, {
            name:   node.methodName.value,
            args:   node.arguments.length,
            callee: this.currentBlueprintName,
        });
    }

    private hoistFunctions(program: AST.Script)
    {
        const functions = program.body.filter(s => s.type === 'FunctionDeclaration') as AST.FunctionDeclaration[];
        if (functions.length === 0) return;

        this.currentPos     = {lineStart: 1, lineEnd: 1, columnStart: 1, columnEnd: 3};
        const jumpOverIndex = this.emit(Opcode.JMP, -1);

        for (const func of functions) {
            this.program.references.functions[func.name.value] = {
                address: -1,
                numArgs: func.params.length,
            };

            if (func.isPublic) {
                this.program.exported.functions.push(func.name.value);
            }
        }

        for (const func of functions) {
            const funcName = func.name.value;
            const addr     = this.program.instructions.length;

            this.program.references.functions[funcName].address = addr;

            this.currentPos = func.position;

            const params: string[] = [];
            const instrStartIndex  = this.program.instructions.length;

            for (let i = func.params.length - 1; i >= 0; i--) {
                const paramName = func.params[i].value;
                params.push(paramName);
                this.emit(Opcode.STORE, [paramName, true]);
            }

            this.visit(func.body);

            this.program.instructions[instrStartIndex].comment = `DECL ${funcName}(${params.reverse().join(', ')})`;

            const lastStmt = func.body.body[func.body.body.length - 1];
            if (! lastStmt || lastStmt.type !== 'ReturnStatement') {
                this.emit(Opcode.CONST, null);
                this.emit(Opcode.RET);
            }
        }

        for (const [funcName, instructionIndices] of Object.entries(this.pendingCalls)) {
            const realAddr = this.program.references.functions[funcName].address;

            if (realAddr === -1) {
                throw new Error(`Compiler Error: Function '${funcName}' was called but never defined.`);
            }

            for (const index of instructionIndices) {
                this.program.instructions[index].arg.addr = realAddr;
            }
        }

        this.pendingCalls = {};

        this.patch(jumpOverIndex, this.program.instructions.length);

        for (const func of functions) {
            if (! func.isPublic) continue;
            const funcName = func.name.value;
            const ref      = this.program.references.functions[funcName];

            this.emit(Opcode.MAKE_FUNCTION, {name: funcName, addr: ref.address, args: ref.numArgs});
            this.emit(Opcode.DUP);
            this.emit(Opcode.STORE, [funcName]);

            this.emit(Opcode.CONST, funcName);   // Internal
            this.emit(Opcode.CONST, funcName);   // External
            this.emit(Opcode.EXPORT);
        }
    }

    private hoistEventHooks(program: AST.Script)
    {
        const hooks = program.body.filter(s => s.type === 'EventHook') as AST.EventHook[];

        if (hooks.length === 0) {
            return;
        }

        const jumpOverIndex = this.emit(Opcode.JMP, -1);

        for (const hook of hooks) {
            this.program.references.events[hook.name.value] = {
                address: this.program.instructions.length,
                numArgs: hook.params.length,
            };

            const params: string[] = [];
            const instrStartIndex  = this.program.instructions.length;

            for (let i = hook.params.length - 1; i >= 0; i--) {
                const paramName = hook.params[i].value;
                params.push(paramName);
                this.emit(Opcode.STORE, [paramName]);
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

    private replaceIdentifier(node: any, oldName: string, newName: string): void
    {
        if (! node || typeof node !== 'object') return;

        if (node.type === 'ForStatement' && node.iterator?.value === oldName) {
            this.replaceIdentifier(node.collection, oldName, newName);
            return;
        }

        if ((node.type === 'FunctionDeclaration' || node.type === 'ScriptFunction') &&
            node.params?.some((p: any) => p.value === oldName)) {
            return;
        }

        if (node.type === 'Identifier' && node.value === oldName) {
            node.value = newName;
            return;
        }

        for (const key in node) {
            if (key === 'position') continue;

            if (node.type === 'MemberExpression' && key === 'property' && ! node.computed) {
                continue;
            }

            if (node.type === 'Property' && key === 'key') {
                continue;
            }

            const child = node[key];

            if (Array.isArray(child)) {
                child.forEach(c => this.replaceIdentifier(c, oldName, newName));
            } else if (typeof child === 'object') {
                this.replaceIdentifier(child, oldName, newName);
            }
        }
    }

    /**
     * Creates a 32-character hash of the program source.
     *
     * @private
     */
    private createHash(): string
    {
        const str = (this.program.moduleName || '<main>') + this.program.source;

        let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;

        for (let i = 0, k; i < str.length; i++) {
            k  = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }

        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

        return [h1, h2, h3, h4]
            .map(h => (h >>> 0).toString(16).padStart(8, '0'))
            .join('');
    }
}

interface LoopContext
{
    type?: string;
    continueAddress: number;
    breakPatchList: number[];
    continuePatchList?: number[];
}
