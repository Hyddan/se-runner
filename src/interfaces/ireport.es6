export default class IReport {
    constructor () {
        this.metrics = {
            specs: {
                failed: 0,
                pending: 0,
                succeeded: 0,
                total: 0
            },
            suites: {
                failed: 0,
                succeeded: 0,
                total: 0
            }
        };
        this.duration = 0;
        this.result = {};
        this.success = true;
    }
}