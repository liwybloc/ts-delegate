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

### Marking methods for delegation
Methods can be marked for delegation with @DelegateMethod(omitFirst?)

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

### Marking fields for delegation
Fields can be marked for delegation with @DelegateField(get?, set?)<br>
Get and set default to true. When true, it allows that functonality.<br>
If get is false, the field will return undefined. If set is false, the field can't be changed by the instance delegating the field.<br>
The functionality is identical for static fields.

```ts
class MyClass {
    // this can be read and edited by the delegating class
    @DelegateField()
    field: number = 100;

    // this cannot be changed by the delegating class
    @DelegateField(true, false)
    constant: number = 9458694;

    @DelegateField()
    static STATIC_CONSTANT: string = "hello world!";
}
```

#### Instance

### Implementing delegated values
You can delegate with a delegation function and a type implement
#### Instance
For delegating instances, you do Delegate<[array of classes]> and delegate(this, [array of instances]);
```ts
class OtherClass {
    @DelegateMethod()
    myMethod() {
        ...
    }
    @DelegateField()
    field: number = 100;
}
class MyClass implements Delegate<[OtherClass]> {
    constructor() {
        delegate(this, [new OtherClass()]);

        this.myMethod();
        console.log(this.field);
    }

    // This will confirm to typescript that it exists and will clone the structure of the other method, this still retains JSDoc and all functionality
    declare myMethod: OtherClass['myMethod'];

    // reading this will print the field from the OtherClass instance
    // setting will change it on both
    declare field: OtherClass['field'];
}
```
#### Static
For delegating static classes, you do DelegateStatic<[array of classes], (this)> with (this) as the class implementing it, and delegateStatic(this, [array of classes]);
```ts
class StaticClass {
    // delegating will add this.add(a, b);
    @DelegateMethod()
    static add(a: number, b: number): number {
        return a + b;
    }

    // This will omit the first argument and it will be called with `this` in MyClass
    // This is useful if you want to have helper classes in different files that can interact with your class without requiring an instance of the helper class to be made
    // delegating will then add this.change(to); without 'myClass'
    @DelegateMethod(true)
    static change(myClass: MyClass, to: number): void {
        myClass.value = to;
    }

    // field can be read and changed through anything delegating this
    @DelegateField()
    static field: number = 9548693458;
}
class MyClass implements DelegateStatic<[StaticClass], MyClass> {
    value: number = 0;

    constructor() {
        delegateStatic(this, [StaticClass]);

        console.log(this.add(5, 10)) // 15

        // first argument is omitted and replaced with `this`
        this.change(100);
        console.log(this.value); // 100

        // will read from the static
        console.log(this.field); // 9548693458

        this.field = 10;
        console.log(StaticClass.field); // 10
    }

    // declare for static requires typeof
    declare add: typeof StaticClass.add;
    // OmitFirst<> to omit the first argument for this
    declare change: OmitFirst<typeof StaticClass.change>;
    // the field will be accessible and writable
    declare field: typeof StaticClass.field;
}
```
#### Instance