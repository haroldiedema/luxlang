import { TokenPosition } from '../Tokenizer/index.js';

export type NodeType =
    | 'Script'
    | 'Block'
    | 'FunctionDeclaration'
    | 'MethodDefinition'
    | 'IfStatement'
    | 'ReturnStatement'
    | 'ExpressionStatement'
    | 'AssignmentExpression'
    | 'BinaryExpression'
    | 'LogicalExpression'
    | 'UnaryExpression'
    | 'CallExpression'
    | 'MemberExpression'
    | 'ArrayExpression'
    | 'ArrayComprehension'
    | 'ObjectExpression'
    | 'ObjectComprehension'
    | 'Property'
    | 'Identifier'
    | 'Literal'
    | 'ForStatement'
    | 'BreakStatement'
    | 'ContinueStatement'
    | 'ThisExpression'
    | 'EventHook'
    | 'ImportStatement'
    | 'WaitStatement'
    | 'BlueprintStatement'
    | 'NewExpression';

export interface BaseStmt
{
    type: NodeType;
    position: TokenPosition;
}

export interface BaseExpr
{
    type: NodeType;
    position: TokenPosition;
}

export interface Script extends BaseStmt
{
    type: 'Script';
    body: Stmt[];
}

export interface Block extends BaseStmt
{
    type: 'Block';
    body: Stmt[];
}

export interface EventHook extends BaseStmt
{
    type: 'EventHook';
    name: Identifier;
    params: Identifier[];
    body: Block;
}

export interface FunctionDeclaration extends BaseStmt
{
    type: 'FunctionDeclaration';
    name: Identifier;
    params: Identifier[];
    body: Block;
    isPublic: boolean;
}

export interface MethodDefinition extends BaseStmt
{
    type: 'MethodDefinition';
    objectName: Identifier;
    methodName: string;
    params: Identifier[];
    body: Block;
}

export interface BlueprintStatement extends BaseStmt {
    type: 'BlueprintStatement';
    name: Identifier;
    params: Identifier[]; // Primary constructor parameters
    properties: { key: Identifier, value: Expr }[];
    methods: FunctionDeclaration[];
}

export interface NewExpression extends BaseExpr
{
    type: 'NewExpression';
    className: Identifier;
    arguments: Expr[];
}

export interface IfStatement extends BaseStmt
{
    type: 'IfStatement';
    test: Expr;
    consequent: Block;
    alternate?: Block | IfStatement;
}

export interface ImportStatement extends BaseStmt
{
    type: 'ImportStatement';
    moduleName: string;
}

export interface WaitStatement extends BaseStmt
{
    type: 'WaitStatement';
    duration: Expr;
}

export interface ReturnStatement extends BaseStmt
{
    type: 'ReturnStatement';
    argument?: Expr;
}

export interface ExpressionStatement extends BaseStmt
{
    type: 'ExpressionStatement';
    expression: Expr;
}

export interface BreakStatement extends BaseStmt
{
    type: 'BreakStatement';
}

export interface ContinueStatement extends BaseStmt
{
    type: 'ContinueStatement';
}

export interface AssignmentExpression extends BaseExpr
{
    type: 'AssignmentExpression';
    left: Expr;
    operator: string;
    right: Expr;
    isPublic: boolean;
    isLocal: boolean;
}

export interface BinaryExpression extends BaseExpr
{
    type: 'BinaryExpression';
    left: Expr;
    operator: string;
    right: Expr;
}

export interface LogicalExpression extends BaseExpr
{
    type: 'LogicalExpression';
    left: Expr;
    operator: 'and' | 'or';
    right: Expr;
}

export interface UnaryExpression extends BaseExpr
{
    type: 'UnaryExpression';
    operator: string;
    argument: Expr;
}

export interface CallExpression extends BaseExpr
{
    type: 'CallExpression';
    callee: Expr;
    arguments: Expr[];
}

export interface MemberExpression extends BaseExpr
{
    type: 'MemberExpression';
    object: Expr;
    property: Expr;
    computed: boolean;
}

export interface ArrayExpression extends BaseExpr
{
    type: 'ArrayExpression';
    elements: Expr[];
}

export interface ArrayComprehension extends BaseExpr
{
    type: 'ArrayComprehension';
    expression: Expr;
    iterator: Identifier;
    collection: Expr;
}

export interface ObjectExpression extends BaseExpr
{
    type: 'ObjectExpression';
    properties: Property[];
}

export interface ObjectComprehension extends BaseExpr
{
    type: 'ObjectComprehension';
    key: Expr;            // The expression for the key (e.g. name)
    value: Expr;          // The expression for the value (e.g. len(name))
    iterator: Identifier; // The loop variable (e.g. name)
    collection: Expr;     // The array being iterated
}

export interface Property extends BaseExpr
{
    type: 'Property';
    key: Identifier;
    value: Expr;
}

export interface Identifier extends BaseExpr
{
    type: 'Identifier';
    value: string;
}

export interface ThisExpression extends BaseExpr
{
    type: 'ThisExpression';
}

export interface Literal extends BaseExpr
{
    type: 'Literal';
    value: any;
    raw: string;
}

export interface ForStatement extends BaseStmt
{
    type: 'ForStatement';
    iterator: Identifier;
    collection: Expr;
    body: Block;
}

export type Stmt =
    Script
    | Block
    | EventHook
    | FunctionDeclaration
    | MethodDefinition
    | IfStatement
    | ImportStatement
    | ReturnStatement
    | ExpressionStatement
    | ForStatement
    | BreakStatement
    | ContinueStatement
    | WaitStatement
    | BlueprintStatement;

export type Expr =
    AssignmentExpression
    | BinaryExpression
    | LogicalExpression
    | UnaryExpression
    | CallExpression
    | MemberExpression
    | ArrayExpression
    | ArrayComprehension
    | ObjectExpression
    | ObjectComprehension
    | Identifier
    | Literal
    | ThisExpression
    | NewExpression;
