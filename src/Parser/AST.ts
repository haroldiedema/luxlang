import {TokenPosition} from '../Tokenizer/index.js';

export type NodeType =
    | 'Script' | 'Block' | 'FunctionDeclaration' | 'MethodDefinition' | 'IfStatement' | 'ReturnStatement'
    | 'ExpressionStatement' | 'AssignmentExpression' | 'BinaryExpression' | 'LogicalExpression' | 'UnaryExpression'
    | 'CallExpression' | 'MemberExpression' | 'ArrayExpression' | 'ObjectExpression' | 'Property'
    | 'Identifier' | 'Literal' | 'ForStatement' | 'BreakStatement' | 'ContinueStatement' | 'ThisExpression' | 'EventHook';

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
}

export interface MethodDefinition extends BaseStmt
{
    type: 'MethodDefinition';
    objectName: Identifier;
    methodName: string;
    params: Identifier[];
    body: Block;
}

export interface IfStatement extends BaseStmt
{
    type: 'IfStatement';
    test: Expr;
    consequent: Block;
    alternate?: Block | IfStatement;
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

export interface ObjectExpression extends BaseExpr
{
    type: 'ObjectExpression';
    properties: Property[];
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
    | ReturnStatement
    | ExpressionStatement
    | ForStatement
    | BreakStatement
    | ContinueStatement;

export type Expr =
    AssignmentExpression
    | BinaryExpression
    | LogicalExpression
    | UnaryExpression
    | CallExpression
    | MemberExpression
    | ArrayExpression
    | ObjectExpression
    | Identifier
    | Literal
    | ThisExpression;
