import childProcess from 'child_process'
import EventEmitter from 'events'
import Logger from './logger'

export default class Worker extends EventEmitter {
    constructor (id, config, capabilities) {
        super();

        this.id = id;
        this.config = config;
        this.capabilities = capabilities;
        this.data = '';
        this.logger = new Logger(this.config.logLevel);
        this.slave = null;
        this.workArgs = null;
    }

    done (killSlave) {
        this.data && console.log('\n\n' + this.data+ '\n');
        killSlave && this.slave && this.slave.disconnect();
        this.slave = null;
    }

    work (...args) {
        let _self = this;

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
        _self.slave.on('disconnect', _self.emit.bind(_self, 'disconnect'));

        _self.slave.send({
            type: 'slave'
        });

        return _self;
    }
}