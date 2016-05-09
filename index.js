module.exports = {
    create: function (config) {
        return new (require('./lib/se-runner').SeRunner)(config);
    }
};