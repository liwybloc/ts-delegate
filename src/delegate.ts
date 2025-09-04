/**
 * Adds Intellisense and JSDoc when implemented. This delegates instanced methods from a class.
 * 
 * For the generic, an array of classes should be supplied and the types will be added from them.
 * 
 * @example
 * ```ts
 * class ClassOne {
 *   value: number;
 * 
 *   constructor() {
 *     this.value = 0;
 *   }
 * 
 *   @DelegateMethod()
 *   doSomething() {
 *     this.value++;
 *   }
 * }
 * class ClassTwo implements Delegate<[ClassOne]> {
 *   value: number = 0;
 *   constructor() {
 *     delegate(this, [new ClassOne()]);
 * 
 *     this.doSomething();
 *   }
 * 
 *   // Confirms to typescript that it exists
 *   declare doSomething: ClassOne['doSomething'];
 * }
 * ```
 */
export type Delegate<T extends any[]> = T extends [infer First, ...infer Rest]
  ? Partial<{ [K in keyof First]: First[K]; }> & Delegate<Rest>
  : {};

type IsExactly<T, U> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2) ? true : false;

/**
 * Omits the first argument from a function
 */
export type OmitFirst<F> =
  F extends (arg: any, ...rest: infer R) => infer Ret
    ? (...args: R) => Ret
    : F;

type OmitFirstIfSelf<F, Self> =
  F extends (arg: infer First, ...rest: any[]) => any
    ? IsExactly<First, Self> extends true
      ? OmitFirst<F>
      : F
    : F;

type DelegateFromCtor<C, Self> = Partial<{
  [K in keyof C as C[K] extends (...args: any[]) => any ? K : never]: OmitFirstIfSelf<C[K], Self>
}>;

/**
 * Adds Intellisense and JSDoc when implemented. This delegates static methods from a class.
 * 
 * For the first generic, an array of classes should be supplied and the types will be added from them.
 * 
 * And for the second generic, it is the current class itself. This will then omit the first argument of any functions that take self first.
 * 
 * @example
 * ```ts
 * class ClassOne {
 *   @DelegateMethod(true)
 *   static doSomething(two: ClassTwo, amount: number) {
 *     two.value += amount;
 *   }
 * }
 * class ClassTwo implements DelegateStatic<[ClassOne], ClassTwo> {
 *   value: number = 0;
 *   constructor() {
 *     delegateStatic(this, [ClassOne]);
 * 
 *     this.doSomething(10); // first argument is omitted and will call with 'this'
 *   }
 * 
 *   // This confirms to typescript that it exists
 *   // In this case since omitFirst is true, the type here needs to omit the first one to be accurate for the instanced delegated function
 *   declare doSomething: OmitFirst<ClassOne['doSomething']>;
 * }
 * ```
 */
export type DelegateStatic<T extends readonly any[], Self> =
  T extends [infer First, ...infer Rest]
    ? First extends abstract new (...args: any) => any
      ? DelegateFromCtor<First, Self> & DelegateStatic<Rest, Self>
      : DelegateStatic<Rest, Self>
    : {};

/**
 * Adds instanced delegated methods to a class; called during runtime
 * @param self Instance to add delegated methods to
 * @param delegateCandidates Array of instances for delegation
 * 
 * @example
 * ```ts
 * class ClassOne {
 *   n: number;
 *   constructor() {
 *     this.n = Math.random();
 *   }
 *   @DelegateMethod()
 *   myMethod(): void {
 *     console.log("Hello world!", this.n);
 *   }
 * }
 * class ClassTwo implements Delegate<[ClassOne]> {
 *   constructor() {
 *     delegateStatic(this, [new ClassOne()]);
 *   }
 *   
 *   // This will copy over type safety and JSDoc
 *   declare myMethod: ClassOne['myMethod'];
 * }
 * ```
 */
export function delegate(self: any, delegateCandidates: any[]) {
    for(const candidate of delegateCandidates) {
        for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(candidate))) {
            if(!candidate[key].isDelegated) continue;
            self[key] = candidate[key].bind(candidate);
        }
    }
}

/**
 * Adds static delegate methods to a class; called during runtime
 * @param self Instance to add delegated methods to
 * @param delegateCandidates Array of classes for delegation, this is the name of the class and not with .prototype or typeof
 * 
 * @example
 * ```ts
 * class ClassOne {
 *   @DelegateMethod()
 *   static myMethod(): void {
 *     console.log("Hello world!");
 *   }
 * }
 * class ClassTwo implements DelegateStatic<[ClassOne], ClassTwo> {
 *   constructor() {
 *     delegateStatic(this, [ClassOne]);
 *   }
 *   
 *   // This will copy over type safety and JSDoc
 *   declare myMethod: ClassOne['myMethod'];
 * }
 * ```
 */
export function delegateStatic(self: any, delegateCandidates: any[]) {
    for(const candidate of delegateCandidates) {
        for (const key in candidate) {
            const val = candidate[key];
            if (typeof val != "function" || !val.isDelegated) continue;

            self[key] = (...args: any[]) => val.apply(candidate, val.omitFirst ? [self, ...args] : args);
        }
    }
}

/**
 * Annotate methods with this to set them to delegate into other methods
 * @param omitFirst If true, the first argument of this method will be omitted when delegating
 *                  to the target method. It will be replaced with the instance of the class that delegated it.
 *                  This only applies for static methods.
 * 
 * @example
 * ```ts
 * class Example {
 *   @DelegateMethod() // an instance delegating this method will be able to use this.exampleMethod(a, b);
 *   exampleMethod(a: number, b: number): number {
 *     return a + b;
 *   }
 *   @DelegateMethod(true) // an instance delegating this method will be able to use this.editSelf();
 *   static editSelf(self: any): void {
 *     self.something = Math.random();
 *   }
 * }
 * ```
 */
export function DelegateMethod(omitFirst: boolean = false): MethodDecorator {
    return (_: Object, __: string | symbol, descriptor: PropertyDescriptor) => {
        (descriptor.value as any).isDelegated = true;
        (descriptor.value as any).omitFirst = omitFirst;
    };
}