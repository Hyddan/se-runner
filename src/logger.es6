export default class Logger {
    constructor (logLevel) {
        let noop = function () {},
                LogLevel = {
                    NONE: 0,
                    ERROR: 1,
                    WARNING: 2,
                    INFO: 3,
                    DEBUG: 5
                },
                _logLevel = 'undefined' !== typeof (LogLevel[logLevel.toUpperCase()]) ? LogLevel[logLevel.toUpperCase()] : LogLevel['INFO'];

        this.error = (_logLevel >= LogLevel.ERROR) ? console.log.bind(console) : noop;
        this.warning = (_logLevel >= LogLevel.WARNING) ? console.log.bind(console) : noop;
        this.log = (_logLevel >= LogLevel.INFO) ? console.log.bind(console) : noop;
        this.debug = (_logLevel >= LogLevel.DEBUG) ? console.log.bind(console) : noop;
    }
}