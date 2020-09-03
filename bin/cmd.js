#!/usr/bin/env node

const program = require('commander');
const util = require('../src/common/util');
const log = require('../src/common/log');
const chalk = require('chalk');

program.version('1.0.0', '-v, --version').option('-p, --proxy [value]', 'pick proxies').option('-all', 'all proxy');

program.parse(process.argv);

if (program.proxy && !program.all) {
    const proxy = require('../src/proxy');
    const config = util.getUsrConfig().config;

    if (Object.prototype.toString.call(program.proxy) === '[object String]') {
        program.proxy.split(' ').forEach((proxyName) => {
            let data = config.proxy.find((set) => set.name === proxyName);
            const rules = JSON.parse(JSON.stringify(data.rules));

            delete data.rules;

            proxy(data, rules);
        });
    } else {
        log.time(chalk.red('Please input proxy name.'));
    }
}
