#!/usr/bin/env node

const program = require("commander");
const util = require("../src/common/util");

program
    .version("1.0.0", "-V, --version")
    .option("-p, --proxy [value]", "proxy")
    .option("-all", "all proxy");

program.parse(process.argv);

if (program.proxy && !program.all) {
    const proxy = require("../src/proxy");
    const config = util.getUsrConfig().config;

    let data = config.proxy.find((set) => set.name === program.proxy);
    const rules = JSON.parse(JSON.stringify(data.rules));

    delete data.rules;

    proxy(data, rules);
}
