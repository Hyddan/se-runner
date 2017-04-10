import childProcess from 'child_process'
import EventEmitter from 'events'
import Logger from './logger'
import WorkerState from './worker-state'

export default class Worker extends EventEmitter {
    constructor (id, config, capabilities) {
        super();

        let _buildCapabilitiesDescription = function (capabilities) {
            let device = capabilities.device ? 'Device: ' + capabilities.device : '',
                    realMobile = 'boolean' === typeof (capabilities.realMobile) ? capabilities.realMobile : 'boolean' === typeof (capabilities.real_mobile) ? capabilities.real_mobile : false,
                    os = capabilities.os ? 'Os: ' + capabilities.os + ', ' : '',
                    osVersion = 'Os Version: ' + (capabilities.os_version ? capabilities.os_version : 'Latest') + ', ',
                    browser = capabilities.browserName ? 'Browser: ' + capabilities.browserName + ', ' : '',
                    browserVersion = 'Browser Version: ' + (capabilities.browser_version ? capabilities.browser_version : 'Latest');

            return ('Testing on ' + (device ? (realMobile ? 'Real ' : 'Simulated ') + device + ', ' : '') + os + osVersion + browser + browserVersion);
        };

        this.id = id;
        this.config = config;
        this.capabilities = capabilities;
        this.data = '';
        this.description = _buildCapabilitiesDescription(this.capabilities);
        this.config.description = this.description;
        this.logger = new Logger(this.config.logLevel);
        this.slave = null;
        this.state = WorkerState.Pending;
        this.workArgs = null;
    }

    done (killSlave) {
        this.data && console.log('\n\n' + this.data+ '\n');
        killSlave && this.slave && this.slave.disconnect();
        this.slave = null;
        this.state = WorkerState.Done;
    }

    work (...args) {
        let _self = this;

        _self.state = WorkerState.Working;
        _self.workArgs = [...args];
        _self.slave = childProcess.fork(__dirname + '/slave', [JSON.stringify(_self.config), JSON.stringify(_self.capabilities)].concat(_self.workArgs), {
            silent: true
        });

        _self.slave.stdout.on('data', function (data) {
            _self.data += data;
        });

        _self.slave.stderr.on('data', function (data) {
            _self.logger.error('' + data);
        });

        _self.slave.on('message', _self.emit.bind(_self, 'message'));
        _self.slave.on('error', _self.emit.bind(_self, 'error'));
        _self.slave.on('exit', _self.emit.bind(_self, 'exit'));

        _self.slave.send({
            type: 'slave'
        });

        return _self;
    }
}