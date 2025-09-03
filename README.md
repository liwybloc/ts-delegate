# ts-delegate
 Helper annotations, types, and methods for type-safe and JSDoc-preserving delegation in TypeScript

## Installation
Run command: `npm i ts-delegate`<br>
<br>
This library also requires these options in tsconfig.json<br>
```json
{
    "compilerOptions": {
        ...
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    },
    ...
}
```
### Without annotations:
If you can't use annotations, you can replace any documented case of @DelegateMethod() with this:
```ts
class MyClass {
    method() {
        ...
    }
    static method2() {
        ...
    }
    constructor() {
        // this.method() will now be delegated when delegate() is used on this class
        (this.method as any).isDelegated = true;
    }
}
// for static methods
(typeof MyClass.method2).isDelegated = true;
(typeof MyClass.method2).omitFirst = true;
```

## What It Does
`ts-delegate` helps you:

- Delegate methods from other classes without duplicating JSDoc or type definitions.
- Preserve type safety for delegated methods.
- Delegate static methods into instances and optionally omit the first argument to pass `this`.

## Usage

### Marking for delegation
Methods can be marked for delegation with @DelegateMethod()

#### Instance
Does not need any arguments; supplying them won't do anything
```ts
class MyClass {
    // when doing Delegate<[MyClass]> this will be delegated
    @DelegateMethod()
    method() {
        ...
    }
    // but this one will not
    thisWontBeDelegated() {
        ...
    }
}
```
#### Static
For static functions, you can do the same, and optionally add `true` for omitting the first argument
```ts
class Static {
    @DelegateMethod()
    static method1() {
        ...
    }

    // when this method is called in delegated method MyClass#method2, it will call with the MyClass instance as the first argument
    @DelegateMethod(true)
    static method2(other: MyClass) {
        ...
    }
}
```

### Implementing delegated functions
You can delegate with functions and a type
#### Instance
For delegating instances, you do Delegate<[array of classes]> and delegate(this, [array of instances]);
```ts
class OtherClass {
    @DelegateMethod()
    myMethod() {
        ...
    }
}
class MyClass implements Delegate<[OtherClass]> {
    constructor() {
        delegate(this, [new OtherClass()]);

        this.myMethod();
    }

    // This will confirm to typescript that it exists and will clone the structure of the other method, this still retains JSDoc and all functionality
    declare myMethod: OtherClass['myMethod'];
}
```
#### Static
For delegating static classes, you do DelegateStatic<[array of classes], (this)> with (this) as the class implementing it, and delegateStatic(this, [array of classes]);
```ts
class StaticClass {
    @DelegateMethod()
    static add(a: number, b: number): number {
        return a + b;
    }

    // This will omit the first argument and it will be called with `this` in MyClass
    // This is useful if you want to have helper classes in different files that can interact with your class without requiring an instance of the helper class to be made
    @DelegateMethod(true)
    static change(myClass: MyClass, to: number): void {
        myClass.value = to;
    }
}
class MyClass implements DelegateStatic<[StaticClass], MyClass> {
    value: number = 0;

    constructor() {
        delegateStatic(this, [StaticClass]);

        console.log(this.add(5, 10)) // 15

        // first argument is omitted and replaced with `this`
        this.change(100);
        console.log(this.value); // 100
    }

    // declare for static requires typeof
    declare add: typeof StaticClass.add;
    // OmitFirst<> to omit the first argument for this
    declare change: OmitFirst<typeof StaticClass.change>;
}
```