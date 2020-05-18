const path = require("path");
const Koa = require("koa");
const app = new Koa();
const proxy = require("koa-proxies");
const static = require("koa-static");
const util = require("./common/util");
const log = require("./common/log");

const $proxy = (opt, rules) => {
    let tip = "";

    const regExpPort = /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/;

    if (!regExpPort.test(opt.listen)) {
        tip = "端口只能是大于0的整数";
    }

    if (tip !== "") {
        log.red(tip, true);
        return;
    }

    if (opt.static) {
        app.use(static(path.resolve(opt.localStaticPath)));
    }

    if (util.getDataType(rules, "object") && Object.keys(rules).length > 0) {
        Object.keys(rules).forEach(path => {
            app.use(proxy(path, rules[path]));
        });
    }
    
    app.listen(opt.listen);
};

module.exports = $proxy;
