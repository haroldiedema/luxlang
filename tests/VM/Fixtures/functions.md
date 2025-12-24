# Basic Declaration and Call

The VM should be able to declare a function, call it, and handle basic parameter passing.

```
fn add(a, b):
    return a + b

out(add(10, 20))
out(add(5, 5))
```

## PASS

- 30
- 10

---

# Global Read/Write (Default Behavior)

By default, variables not marked 'local' should refer to the global scope.
The function should be able to read AND modify the global variable.

```
global_var = 10

fn modify_global():
    out(global_var)   // Should read 10
    global_var = 20   // Should update the global
    out(global_var)   // Should read 20

modify_global()
out(global_var)       // Global should remain 20
```

## PASS

- 10
- 20
- 20

---

# Local Shadowing

The `local` keyword should create a new variable in the current stack frame,
leaving the global variable of the same name untouched.

```
x = "global"

fn shadow_test():
    local x = "local"
    out(x)

shadow_test()
out(x)

```

## PASS

- local
- global

---

# Parameter Shadowing

Function parameters should implicitly act as local variables. They should not
clobber global variables with the same name.

```
n = 100

fn print_n(n):
    n = n + 1   // Should modify the parameter 'n', not global 'n'
    out(n)

print_n(5)
out(n)
```

## PASS

- 6
- 100

---

# The "Mid-Stream" Shadow

The VM should support reading a global variable, and *then* shadowing it
with a local variable later in the same function body.

```
val = 42

fn tricky_scope():
    out(val)        // 1. Read global (42)
    val = 50        // 2. Update global
    out(val)        // 3. Read updated global (50)
    
    local val = 99  // 4. Declare local, shadowing global now
    out(val)        // 5. Read local (99)
    val = 100       // 6. Update local
    
tricky_scope()
out(val)            // 7. Verify global was left at 50 (from step 2)
```

## PASS

- 42
- 50
- 99
- 50

---

# Early Return

The VM should stop execution of the function immediately upon hitting a return statement.

```
fn check_sign(n):
    if n > 0:
        return "positive"
    
    if n < 0:
        return "negative"
        
    return "zero"
    out("This should not print")

out(check_sign(10))
out(check_sign(-5))
out(check_sign(0))
```

## PASS

- positive
- negative
- zero

---

# Recursion (Fibonacci)

The VM should handle creating new stack frames for recursive calls without
variables leaking between frames.

```
fn fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

out(fib(10))
```

## PASS

- 55

---

# Expressions as Arguments

The VM should evaluate expressions passed as function arguments before
calling the function.

```
fn multiply(a, b):
    return a * b

out(multiply(5 + 5, 2 * 3))
```

## PASS

- 60

---
