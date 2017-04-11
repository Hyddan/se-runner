# se-runner

> Selenium Test Runner

## Installation

```shell
npm install se-runner --save-dev
```

## NPM package
* https://npmjs.com/package/se-runner

## Why use SeRunner
SeRunner will allow you to configure multiple capabilities (browsers) to run your tests against. While there are other test runners that allow for this,
where SeRunner differ from these is that it will also inject the Selenium WebDriver into each test suite giving you the ability to control the browser from within the tests. For this to work properly, each file containing tests must
export a function used to inject a context and must call context.done() once all tests are completed, see example below.

### Examples

#### SeRunner BrowserStack Example
For a full, ready to run, example using [se-runner](https://github.com/Hyddan/se-runner#readme) with [grunt-se-runner](https://github.com/Hyddan/grunt-se-runner#readme) and [se-runner-framework-jasmine](https://github.com/Hyddan/se-runner-framework-jasmine#readme), see [se-runner-browserstack-example](https://github.com/Hyddan/se-runner-browserstack-example#readme).

#### Test
This is how a file containing tests should be structured to be used with SeRunner. This example uses Jasmine syntax for the test code.

```js
module.exports = function (context) {
    describe('A test', function () {
        beforeAll(function () {
            // Setup
        });
        
        it('Should should check smth', function () {
            expect(1).toBe(1);
        });

        afterAll(function () {
            context.done(); // Signal SeRunner that this test suite is done
        });
    });
};
```

#### Executing SeRunner
If you are using Grunt you can use the [grunt-se-runner](https://github.com/Hyddan/grunt-se-runner#readme) task. Otherwise it can be run programmatically like this.

```js
var seRunner = require('se-runner'),
        runner = seRunner.create({
            capabilities: [
                {
                    browserName: 'firefox',
                    'browserstack.user': '[UserName]',
                    'browserstack.key': '[AccessKey]'
                },
                {
                    browserName: 'chrome',
                    'browserstack.user': '[UserName]',
                    'browserstack.key': '[AccessKey]'
                }
            ],
            context: {
                url: 'http://google.com'
            },
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
            jasmine: {
                dependencies: []
            },
            tests: [
                'test/*.js'
            ]
        });

runner.run(function (data) {
    // Done callback - data.success indicates success or failure
});
```

## Api

### Setup
```js
var seRunner = require('se-runner'),
        runner = seRunner.create(options);
```

### Global Methods

#### create
* options - Object.

Creates a new instance of an SeRunner.

```js
var runner = seRunner.create(options);
```

#### Instance Methods

### run
* done - Function. Receives one argument `data` described below.
  * data - Object.
    * error - Object or null. Will be populated if SeRunner encountered an unexpected exception.
    * reports - Array of SeRunner reports. One per process.
    * success - Boolean. Indicates success or failure.

```js
runner.run(function (data) {
    // Execution complete
});
```

### Options

#### capabilities
Type: `Array`
Default value: `[]`

A list of WebDriver capabilities to start on the Selenium hub.

#### concurrency
Type: `Number`
Default value: `1`

Number of concurrent processes that will be run.

#### context
Type: `Object`
Default value: `{}`

Any values specified here will be added to the context that is passed into each test suite.

#### dependencies
Type: `Array`
Default value: `[]`

A list of dependencies to load before running the tests.

#### driverFactory.create
Type: `Function`
Default value: `See example above`

Provides a way to change how the WebDriver is instantiated or switch to a different WebDriver implementation. This function will be passed into a separate process and as such can contain no references to a different scope than its own.
You can however use the Node.Js require() function inside of the driverFactory.create function. It will also be bound to the configuration object so you will have access to any values in there through the `this` property.

#### framework
Type: `String`
Default value: `jasmine`

Which test framework to use. The test runner will load the framework adaptor: se-runner-framework-[Framework]. All framework adaptors need to be installed separately.

#### logLevel
Type: `String`
Default value: `INFO`

Possible values are: NONE, ERROR, WARNING, INFO & DEBUG.

#### tests
Type: `Array`
Default value: `[]`

A list of files or globbing patterns to find tests to be run.

#### timeout
Type: `Number`
Default value: `60000`

Default timeout in milliseconds. This value will also be passed to the framework adaptor (if not overridden in the framework specific configuration).

#### selenium.hub
Type: `String`
Default value: `http://hub.browserstack.com/wd/hub`

Url to the Selenium Hub to connect to.

#### [framework]
Type: `Object`
Default value: `{}`

Any values given here will be passed into the framework adaptor.

#### [framework].consoleReporter
Type: `Boolean`
Default value: `true`

Whether the framework adaptor should report to the console as things are happening or not.

#### [framework].dependencies
Type: `Array`
Default value: `[]`

A list of dependencies for the framework adaptor to load before running the tests.

#### [framework].timeout
Type: `Number`
Default value: `60000`

Overrides the default timeout for the framework adaptor only.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality.

## Release History

 * 2017-04-11   v1.2.3   Fixed scoping issue - copy configuration values into worker instead of passing reference.
 * 2017-04-10   v1.2.2   Added link in README to se-runner-browserstack-example.
 * 2017-04-10   v1.2.1   Handle realMobile capability.
 * 2016-12-09   v1.2.0   Compile report of each process and communicate result back to initiator.
 * 2016-08-12   v1.1.0   Adding concurrency limitation.
 * 2016-05-10   v1.0.0   Initial version.