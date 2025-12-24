# 1. Prototype Pollution Attempt

This test checks if the guest can access the JavaScript prototype chain of a host-provided object to modify the behavior of the host environment.

```
// 'an_object' is a host object {key: "value"}
p = sandbox.an_object.constructor.prototype
p.polluted = "yes"
```

## FAIL

Access to property "constructor" is forbidden.

---

# 2. Function Constructor Escape (RCE)

The most dangerous exploit. If the guest can reach a host function's constructor, they can generate and execute raw JavaScript.

```
// 'sandbox.an_object' is a host object
f = sandbox.an_object.constructor("return process.env")()
```

## FAIL

The function "undefined" does not exist.

---

# 3. Hidden Property Access (Proto)

Even if you block "constructor", many JS engines allow access to `__proto__`. The VM must explicitly blacklist this.

```
proto = sandbox.an_object.__proto__
out(proto)
```

## FAIL

Access to property "__proto__" is forbidden.

---

# 4. Host Global Leakage via Functions

Sometimes functions bound to the host can leak the global `this` (window or
global) if called in a specific way. This test should fail because we treat
the left hand side of a method call as a variable. In this case "out" is a
function, so this won't run at all.

```
// Attempting to see if the host 'out' function reveals its parent context
host_context = out.bind(null)
```

## FAIL

The variable "out" is not defined.

---

# 5. Global Scope Injection

The program should be able to mutate existing variables in the `sandbox` object
if permitted, but it should not be able to "break out" and define new variables
in the host's global namespace.

```
// sandbox is a host-injected object
sandbox.new_secret = "hacked"
```

## FAIL

Cannot create new property "new_secret" on host-provided object.

---

# 6. Array Constructor Abuse

Checking if the native array can be used to reach the host's Array constructor.

```
// an_array is [1, 2, 3]
arr_constructor = sandbox.an_array.constructor
new_arr = new arr_constructor(10)
```

## FAIL

Access to property "constructor" is forbidden.

---

# 7. Null Pointer / Prototype Nulling

An attempt to crash the VM or bypass checks by accessing properties on `null` which is a host-injected value.

```
// a_null is null
val = sandbox.a_null.toString()
```

## FAIL

Attempt to call method 'toString' on an undefined value.

---
