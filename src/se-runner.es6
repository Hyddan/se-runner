import glob from 'glob-all'
import Logger from './logger'
import Utils from './utils'
import Worker from './worker'
import WorkerState from './worker-state'

export class SeRunner {
    constructor (config) {
        this.config = Utils.extend({}, this.defaultConfig, config);
        this.config = Utils.extend(this.config, {
            basePath: process.cwd(),
            concurrency: Math.min(this.config.capabilities.length, this.config.concurrency),
            driverFactory: {
                create: this.config.driverFactory.create.toString()
            },
            tests: this.config.tests ? glob.sync(this.config.tests) : []
        });

        for (let d of this.config.dependencies) {
            require(d);
        }

        this.logger = new Logger(this.config.logLevel);
        this.workers = {};
    }

    get defaultConfig () {
        return {
            basePath: process.cwd(),
            capabilities: [],
            concurrency: 1,
            context: {},
            dependencies: [],
            driverFactory: {
                create: function (capabilities) {
                    return new (require('selenium-webdriver')).Builder()
                                .usingServer(this.selenium.hub)
                                .withCapabilities(capabilities)
                                .build();
                }
            },
            framework: 'jasmine',
            logLevel: 'INFO',
            selenium: {
                hub: 'http://hub.browserstack.com/wd/hub'
            },
            tests: [],
            timeout: 60000,
            jasmine: {
                dependencies: [],
                timeout: 60000
            }
        };
    }

    run (done) {
        let _self = this,
                _workers = function (state = WorkerState.Working) {
                    let _workers = [];
                    for (let worker in _self.workers) {
                        if (!_self.workers.hasOwnProperty(worker)) continue;

                        if (state === _self.workers[worker].state) {
                            _workers.push(_self.workers[worker]);
                        }
                    }

                    return _workers;
                },
                _onExit = function () {
                    let _workers = Utils.extend({}, _self.workers);
                    for (let worker in _workers) {
                        if (!_workers.hasOwnProperty(worker)) continue;

                        if (WorkerState.Done !== _workers[worker].state) {
                            _workers[worker].done(true);
                        }
                    }
                },
                _onWorkerStopped = function () {
                    if (WorkerState.Done !== this.state) {
                        this.done();
                    }

                    _self.logger.log('Worker: ' + this.id + ' stopped');

                    if (_workers(WorkerState.Done).length !== Object.keys(_self.workers).length) {
                        let _pendingWorkers = _workers(WorkerState.Pending);
                        for (let worker in _pendingWorkers) {
                            if (!_pendingWorkers.hasOwnProperty(worker)) continue;

                            if (_self.config.concurrency > _workers(WorkerState.Working).length) {
                                _pendingWorkers[worker].work();
                            }
                        }

                        return;
                    }

                    _self.logger.log('SeRunner::run(): Done...');
                    done && done();
                };

        process.on('SIGINT', _onExit);
        process.on('exit', _onExit);

        _self.logger.log('SeRunner::run(): Starting ' + _self.config.capabilities.length + ' workers, maximum ' + _self.config.concurrency + ' at the time...');
        for (let capabilities of _self.config.capabilities) {
            let worker = new Worker(Utils.guid(), _self.config, capabilities);

            worker.on('message', function (e) {
                switch (e.type) {
                    case 'created':
                        _self.logger.log('Worker: ' + this.id + ' started, slave process id: ' + this.slave.pid);
                        break;
                    case 'data':
                        break;
                    case 'error':
                        break;
                    case 'exit':
                        _onWorkerStopped.call(worker);
                        break;
                    case 'log':
                        _self.logger[e.logLevel](e.message);
                        break;

                }
            });

            worker.on('error', _onWorkerStopped.bind(worker));
            worker.on('exit', _onWorkerStopped.bind(worker));

            this.workers[worker.id] = worker;

            if (_self.config.concurrency > _workers(WorkerState.Working).length) {
                worker.work();
            }
        }
    }
}