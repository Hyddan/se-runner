import childProcess from 'child_process'
import glob from 'glob-all'
import path from 'path'
import Jasmine from 'jasmine-core'
import WebDriver from 'selenium-webdriver'
import Logger from './logger'
import Utils from './utils'
import Worker from './worker'

export class SeRunner {
    constructor (config) {
        this.config = Utils.extend({}, this.defaultConfig, config);
        this.config = Utils.extend(this.config, {
            basePath: process.cwd(),
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
                _onExit = function () {
                    let _workers = Utils.extend({}, _self.workers);
                    for (let worker in _workers) {
                        if (!_workers.hasOwnProperty(worker)) continue;

                        _workers[worker].done(true);
                    }
                },
                _onWorkerStopped = function () {
                    this.done();

                    _self.logger.log('Worker: ' + this.id + ' stopped');
                    delete _self.workers[this.id];

                    if (0 === Object.keys(_self.workers).length) {
                        _self.logger.log('SeRunner::run(): Done...');
                        done && done();
                    }
                };

        process.on('SIGINT', _onExit);
        process.on('exit', _onExit);

        _self.logger.log('SeRunner::run(): Starting ' + this.config.capabilities.length + ' workers...');
        for (let capabilities of this.config.capabilities) {
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

            worker.work();
        }
    }
}