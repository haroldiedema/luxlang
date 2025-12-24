# Pass string literals

The VM should be able to handle string literals correctly. This test focuses
on passing a simple string literal to a native function.

```
out("Hello, World!")
```

## PASS

Hello, World!

---

# Concatenate string literals

The VM should be able to handle string concatenation correctly. This test focuses
on concatenating two string literals and passing the result to a native function.

```
out("Hello, " + "World!")
```

## PASS

Hello, World!

---

# String concatenation with variables

The VM should be able to handle string interpolation correctly. This test focuses
on interpolating variables into a string and passing the result to a native function.

```
name = "World"
out("Hello, " + name + "!")
```

## PASS

Hello, World!

---

# Multi-line string literals

The VM should be able to handle multi-line string literals correctly. This test focuses
on passing a multi-line string literal to a native function.

```
out("
    Hello,
    World!
")
```

## PASS

Hello,
World!

---

# Interpolation with variables

The VM should be able to handle string interpolation correctly. This test focuses
on interpolating variables into a string and passing the result to a native function.

```
name = "Alice"
greeting = "Hello, {name}!"

out(greeting)
```

## PASS

Hello, Alice!

---

# Interpolation with expressions

The VM should be able to handle string interpolation with expressions correctly. This test focuses
on interpolating expressions into a string and passing the result to a native function.

```
a = 5
b = 10
result = "The sum of {a} and {b} is {a + b}."

out(result)
```

## PASS

The sum of 5 and 10 is 15.

---

# Interpolation with escaped braces

The tokenizer must distinguish between an interpolation start `{` and a literal escaped brace `\{`.

```
out("This is a literal \{ brace }")
out("This is \{not} interpolated")
val = 10
out("Value: \{val} vs {val}")
```

## PASS

```json
[
  "This is a literal { brace }",
  "This is {not} interpolated",
  "Value: {val} vs 10"
]

```

---

# Interpolation with Strings Inside Expressions

The tokenizer must be smart enough to ignore braces that appear inside strings *within* the interpolation expression. If it fails, it will think the string's `}` is the end of the interpolation.

```
// The tokenizer should not stop at the "}" inside the string
out("Status: { "Done (Success)" }")
out("Mixed: { "\{" + "\}" }")
```

## PASS

```json
[
  "Status: Done (Success)",
  "Mixed: {}"
]
```

---

# Interpolation with Nested Structures (Objects)

Similar to the above, the tokenizer must handle nested braces (like object literals) inside the interpolation without closing the interpolation early.

```
// Accessing a property of an inline object
out("User: { {name: "Admin", id: 1}.name }")

// Array access
nums = [10, 20]
out("First: { nums[0] }")
```

## PASS

```json
[
  "User: Admin",
  "First: 10"
]
```

---

# Adjacent & Empty Interpolation

Test how the tokenizer handles back-to-back interpolations and empty edge cases.

```
a = "A"
b = "B"
// Adjacent
out("{a}{b}")

// Surrounded by spaces
out("  {a}  ")

// Expression evaluating to empty string (if supported) or just basic math
out("Math: { 10 * 10 }{ 5 + 5 }")
```

## PASS

```json
[
  "AB",
  "  A  ",
  "Math: 10010"
]
```

---

# Multi-line Interpolation

The tokenizer must handle multi-line strings with interpolations correctly.

```
user = "Alice"
score = 500

msg = "
    Player: {user}
    Score:  {score}!
"

out(msg)
```

## PASS

```
Player: Alice
Score:  500!
```

---
