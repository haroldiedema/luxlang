# Basic Module Access

The VM should be able to import a module and access its functions and variables.

```
import "math_module"

out(math_module.pi)
out(math_module.square(5))
```

## Module: math_module

```
public pi = 3.14159
public fn square(x):
    return x * x
```

## PASS

- 3.14159
- 25

---

# Private Module Members

The VM should respect module member visibility. Private members should not be accessible from outside the module.

```
import "math_module"

out(math_module.pi)

// The following line should raise an error due to private access
out(math_module.secret_value)
```

## Module: math_module

```
public pi = 3.14159

// Variables and functions not marked 'public' are private to the module by default.
secret_value = 42
```

## FAIL

```
The property "secret_value" does not exist on "math_module".

Source:
   3| out(math_module.pi)
   4|
   5| // The following line should raise an error due to private access
>> 6| out(math_module.secret_value)
```

---
