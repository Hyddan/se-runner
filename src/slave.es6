import path from 'path'
import Utils from './utils'

class Slave {
    constructor () {
        let _self = this,
                _args = process.argv.splice(2),
                _resolveRequire = function (str) {
                    var result = str,
                            match,
                            pattern = /require\(['|"]([^',^"]*)['|"]\)/gi;
                    while (match = pattern.exec(str)) {
                        if (!_self.config.driverFactory.variables[match[1]]) {
                            _self.config.driverFactory.variables[match[1]] = require(match[1]);

                            let regex = new RegExp('require\\([\'|"]' + match[1] + '[\'|"]\\)', 'i');
                            result = result.replace(regex, 'this.driverFactory.variables[\'' + match[1] + '\']');
                        }
                    }

                    return result;
                },
                _waitForExit = function (counter) {
                    if (_self.driver && 10 > counter) {
                        setTimeout(function () {
                            _waitForExit(++counter);
                        }, 1000);

                        return;
                    }

                    process.kill(process.pid);
                },
                _onExit = function () {
                    if (!_self.driver || !_self.driver.quit) {
                        process.kill(process.pid);

                        return;
                    }

                    _self.driver.quit().then(function () {
                        _self.driver = null;
                        process.kill(process.pid);
                    });

                    _waitForExit(0);
                };

        _self.pid = process.pid;
        _self.config = JSON.parse(_args[0]);
        _self.capabilities = JSON.parse(_args[1]);
        _self.args = _args.splice(2);

        _self.config.driverFactory.variables = {};
        _self.config.driverFactory.create = new Function('return ' + _resolveRequire(_self.config.driverFactory.create))().bind(_self.config);

        _self.driver = null;

        _self.framework = new (require('se-runner-framework-' + _self.config.framework))().initialize(Utils.extend({
            basePath: _self.config.basePath,
            timeout: _self.config.timeout
        }, _self.config[_self.config.framework], {
            done: function (report) {
                process.send({
                    type: 'report',
                    report: _self.report = report,
                    pid: _self.pid
                });
            }
        }));

        process.on('message', function (e) {
            switch (e.type) {
                case 'slave':
                    _self.slave();
                    break;
            }
        });

        process.on('SIGINT', _onExit);
        process.on('disconnect', _onExit);

        process.send({
            type: 'created',
            pid: _self.pid
        });
    }

    createDriver (capabilities) {
        return this.config.driverFactory.create(capabilities);
    }

    log (logLevel, message) {
        process.send({
            type: 'log',
            logLevel: logLevel,
            message: message,
            pid: this.pid
        });
    }

    slave () {
        let _self = this,
                tests = _self.config.tests,
                runner = _self.framework.createRunner();

        _self.driver = _self.createDriver(_self.capabilities);
        _self.log('debug', 'Slave: ' + _self.pid + ' connecting to Selenium Hub');
        _self.driver.getSession().then(function (session) {
            let testCount = tests.length,
                    _tests = [],
                    _sessionId = session.getId(),
                    callback = function () {
                        if (--testCount === 0) {
                            _self.log('debug', 'All test suites done for browser: ' + _self.capabilities.browserName);
                            _self.driver.quit().then(function () {
                                _self.log('debug', 'Slave: ' + _self.pid + ' disconnected from Selenium Hub, sessionId: ' + _sessionId);
                                _self.driver = null;
                                process.kill(_self.pid);
                            });
                        }
                    };

            _self.log('debug', 'Slave: ' + _self.pid + ' connected to Selenium Hub, sessionId: ' + _sessionId);

            for (let testPath of tests) {
                let test = require(path.join(_self.config.basePath, testPath));

                _tests.push(test(Utils.extend({}, _self.config.context, {
                    requestedCapabilities: _self.capabilities,
                    driver: _self.driver,
                    done: callback,
                    sessionId: _sessionId
                })));
            }

            try {
                console.log(_self.config.description + ', sessionId: ' + _sessionId + '\n');
                runner.run();
            }
            catch (e) {
                process.send({
                    type: 'error',
                    message: _self.config.framework.charAt(0).toUpperCase() + _self.config.framework.slice(1) + ' error',
                    error: e,
                    pid: _self.pid,
                    stack: e.stack
                });

                _self.driver.quit().then(function () {
                    process.kill(_self.pid);
                });
            }
        }).catch(function (e) {
            process.send({
                type: 'error',
                message: 'WebDriver error',
                error: e,
                pid: _self.pid,
                stack: e.stack
            });

            process.disconnect();
        });
    }
}

export default new Slave()