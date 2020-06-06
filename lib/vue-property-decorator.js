/** vue-property-decorator verson 9.0.0 MIT LICENSE copyright 2019 kaorun343 */
/// <reference types='reflect-metadata'/>
'use strict';
import { Options, Vue, createDecorator, mixins } from 'vue-class-component';
export { Options, Vue, mixins as Mixins };
/** Used for keying reactive provide/inject properties */
const reactiveInjectKey = '__reactiveInject__';
/**
 * decorator of an inject
 * @param from key
 * @return PropertyDecorator
 */
export function Inject(options) {
    return createDecorator((componentOptions, key) => {
        if (typeof componentOptions.inject === 'undefined') {
            componentOptions.inject = {};
        }
        if (!Array.isArray(componentOptions.inject)) {
            componentOptions.inject[key] = options || key;
        }
    });
}
/**
 * decorator of a reactive inject
 * @param from key
 * @return PropertyDecorator
 */
export function InjectReactive(options) {
    return createDecorator((componentOptions, key) => {
        if (typeof componentOptions.inject === 'undefined') {
            componentOptions.inject = {};
        }
        if (!Array.isArray(componentOptions.inject)) {
            const fromKey = !!options ? options.from || options : key;
            const defaultVal = (!!options && options.default) || undefined;
            if (!componentOptions.computed)
                componentOptions.computed = {};
            componentOptions.computed[key] = function () {
                const obj = this[reactiveInjectKey];
                return obj ? obj[fromKey] : defaultVal;
            };
            componentOptions.inject[reactiveInjectKey] = reactiveInjectKey;
        }
    });
}
function produceProvide(original) {
    let provide = function () {
        let rv = typeof original === 'function' ? original.call(this) : original;
        rv = Object.create(rv || null);
        // set reactive services (propagates previous services if necessary)
        rv[reactiveInjectKey] = this[reactiveInjectKey] || {};
        for (let i in provide.managed) {
            rv[provide.managed[i]] = this[i];
        }
        for (let i in provide.managedReactive) {
            rv[provide.managedReactive[i]] = this[i]; // Duplicates the behavior of `@Provide`
            if (!rv[reactiveInjectKey].hasOwnProperty(provide.managedReactive[i])) {
                Object.defineProperty(rv[reactiveInjectKey], provide.managedReactive[i], {
                    enumerable: true,
                    get: () => this[i],
                });
            }
        }
        return rv;
    };
    provide.managed = {};
    provide.managedReactive = {};
    return provide;
}
function needToProduceProvide(original) {
    return (typeof original !== 'function' ||
        (!original.managed && !original.managedReactive));
}
/**
 * decorator of a provide
 * @param key key
 * @return PropertyDecorator | void
 */
export function Provide(key) {
    return createDecorator((componentOptions, k) => {
        let provide = componentOptions.provide;
        if (needToProduceProvide(provide)) {
            provide = componentOptions.provide = produceProvide(provide);
        }
        provide.managed[k] = key || k;
    });
}
/**
 * decorator of a reactive provide
 * @param key key
 * @return PropertyDecorator | void
 */
export function ProvideReactive(key) {
    return createDecorator((componentOptions, k) => {
        let provide = componentOptions.provide;
        // inject parent reactive services (if any)
        if (!Array.isArray(componentOptions.inject)) {
            componentOptions.inject = componentOptions.inject || {};
            componentOptions.inject[reactiveInjectKey] = {
                from: reactiveInjectKey,
                default: {},
            };
        }
        if (needToProduceProvide(provide)) {
            provide = componentOptions.provide = produceProvide(provide);
        }
        provide.managedReactive[k] = key || k;
    });
}
/** @see {@link https://github.com/vuejs/vue-class-component/blob/master/src/reflect.ts} */
const reflectMetadataIsSupported = typeof Reflect !== 'undefined' && typeof Reflect.getMetadata !== 'undefined';
function applyMetadata(options, target, key) {
    if (reflectMetadataIsSupported) {
        if (!Array.isArray(options) &&
            typeof options !== 'function' &&
            typeof options.type === 'undefined') {
            const type = Reflect.getMetadata('design:type', target, key);
            if (type !== Object) {
                options.type = type;
            }
        }
    }
}
/**
 * decorator of model
 * @param  event event name
 * @param options options
 * @return PropertyDecorator
 */
export function Model(event, options = {}) {
    return (target, key) => {
        applyMetadata(options, target, key);
        createDecorator((componentOptions, k) => {
            ;
            (componentOptions.props || (componentOptions.props = {}))[k] = options;
            componentOptions.model = { prop: k, event: event || k };
        })(target, key);
    };
}
/**
 * decorator of a prop
 * @param  options the options for the prop
 * @return PropertyDecorator | void
 */
export function Prop(options = {}) {
    return (target, key) => {
        applyMetadata(options, target, key);
        createDecorator((componentOptions, k) => {
            ;
            (componentOptions.props || (componentOptions.props = {}))[k] = options;
        })(target, key);
    };
}
/**
 * decorator of a synced prop
 * @param propName the name to interface with from outside, must be different from decorated property
 * @param options the options for the synced prop
 * @return PropertyDecorator | void
 */
export function PropSync(propName, options = {}) {
    // @ts-ignore
    return (target, key) => {
        applyMetadata(options, target, key);
        createDecorator((componentOptions, k) => {
            ;
            (componentOptions.props || (componentOptions.props = {}))[propName] = options;
            (componentOptions.computed || (componentOptions.computed = {}))[k] = {
                get() {
                    return this[propName];
                },
                set(value) {
                    // @ts-ignore
                    this.$emit(`update:${propName}`, value);
                },
            };
        })(target, key);
    };
}
/**
 * decorator of a watch function
 * @param  path the path or the expression to observe
 * @param  WatchOption
 * @return MethodDecorator
 */
export function Watch(path, options = {}) {
    const { deep = false, immediate = false } = options;
    return (target, key, index) => (createDecorator((componentOptions, handler) => {
        if (typeof componentOptions.watch !== 'object') {
            componentOptions.watch = Object.create(null);
        }
        const watch = componentOptions.watch;
        if (typeof watch[path] === 'object' && !Array.isArray(watch[path])) {
            watch[path] = [watch[path]];
        }
        else if (typeof watch[path] === 'undefined') {
            watch[path] = [];
        }
        watch[path].push({ handler: target[handler], deep, immediate });
    }))(target, key, index);
}
// Code copied from Vue/src/shared/util.js
const hyphenateRE = /\B([A-Z])/g;
const hyphenate = (str) => str.replace(hyphenateRE, '-$1').toLowerCase();
/**
 * decorator of an event-emitter function
 * @param  event The name of the event
 * @return MethodDecorator
 */
export function Emit(event) {
    return function (_target, propertyKey, descriptor) {
        const key = hyphenate(propertyKey);
        const original = descriptor.value;
        descriptor.value = function emitter(...args) {
            const emit = (returnValue) => {
                const emitName = event || key;
                if (returnValue === undefined) {
                    if (args.length === 0) {
                        this.$emit(emitName);
                    }
                    else if (args.length === 1) {
                        this.$emit(emitName, args[0]);
                    }
                    else {
                        this.$emit(emitName, args);
                    }
                }
                else {
                    this.$emit(emitName, returnValue);
                }
            };
            const returnValue = original.apply(this, args);
            if (isPromise(returnValue)) {
                returnValue.then(returnValue => {
                    emit(returnValue);
                });
            }
            else {
                emit(returnValue);
            }
            return returnValue;
        };
    };
}
/**
 * decorator of a ref prop
 * @param refKey the ref key defined in template
 */
export function Ref(refKey) {
    return createDecorator((options, key) => {
        options.computed = options.computed || {};
        options.computed[key] = {
            cache: false,
            get() {
                return this.$refs[refKey || key];
            },
        };
    });
}
function isPromise(obj) {
    return obj instanceof Promise || (obj && typeof obj.then === 'function');
}
