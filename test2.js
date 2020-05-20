#!/usr/bin/env node
const util = require("./src/common/util");

const proxy = require("./src/proxy");
const config = util.getUsrConfig().config;

let data = config.proxy.find((set) => set.name === "tembinTrunk");
const rules = JSON.parse(JSON.stringify(data.rules));

delete data.rules;

proxy(data, rules);
