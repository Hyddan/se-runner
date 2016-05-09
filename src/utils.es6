class Utils {
    constructor() {}

    static enumerate (obj, func) {
        let prop = null,
                result = null;

        if ('function' === typeof (func)) {
            for (prop in obj) {
                if (!obj.hasOwnProperty(prop)) continue;

                result = func(obj[prop], prop);

                if (result) {
                    return result;
                }
            }
        }
    }

    static extend (...args) {
        let toStr = Object.prototype.toString,
                arrayStr = toStr.call([]),
                current = null,
                newProperty = null,
                i = 0,
                _args = [...args],
                base = args[0];

        for (i = 1; i < _args.length; i += 1) {
            current = _args[i];

            Utils.enumerate(current, function (val, arg) {
                if (Utils.isObject(val) && Utils.isObject(base[arg]) && !(val instanceof Date)) {
                    newProperty = (toStr.call(val) === arrayStr) ? [] : {};
                    base[arg] = Utils.extend(base[arg] || newProperty, val);
                }
                else {

                    base[arg] = 'undefined' !== typeof (val) ? val : base[arg];
                }
            });
        }

        return base;
    }

    static guid (format) {
        return (format || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0;

            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    static isObject (obj) {
        return 'object' === typeof (obj) && null !== obj;
    }
}

export default Utils