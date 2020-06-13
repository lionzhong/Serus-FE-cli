const path = require("path");
const zlib = require("zlib");
const querystring = require("querystring");
const chalk = require("chalk");
const Koa = require("koa");
const app = new Koa();
const proxy = require("koa-proxies");
const static = require("koa-static");
const _ = require("lodash");
const util = require("./common/util");
const log = require("./common/log");
const mock = require("./common/mock");

/**
 * koa-proxies主函数，使用此函数可通过配置中启动代理服务器
 * @param {object} opt - koa启动服务器的必要配置，例如，端口，项目名称，是否启用mock数据等
 * @param {object} rules - 用户自行配置的规则集合
 */
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
        // 判断是否需要加载本地数据
        app.use(resSendMock(opt, rules));

        const apiPath = Object.keys(rules).sort(apiSortCall);

        apiPath.forEach(function (path) {
            const rule = proxyGenerator(opt, _.clone(rules[path]));
            let ruleExtraProxyOpts = {};

            // 规则是否存在独立的配置
            if (rule.extraProxyOpts) {
                ruleExtraProxyOpts = rule.extraProxyOpts;
                delete rule.extraProxyOpts;
            }

            app.use(
                proxy(
                    path,
                    Object.assign(
                        {},
                        rule,
                        extendOpts(opt, rule, ruleExtraProxyOpts)
                    )
                )
            );
        });
    }

    try {
        app.listen(opt.listen);

        const tips = [
            "       Proxy enabled success!",
            "======================================",
            ` Name: ${opt.name}`,
            ` Port: ${opt.listen}`,
            ` Url : http://${util.getLocalIp()}:${opt.listen}/`
        ];

        // console.log(chalk.bgGreen(chalk.black("Proxy enabled success!  ")));
        // console.log(chalk.bgGreen(chalk.black(`Name: ${opt.name}       `)));
        // console.log(chalk.bgGreen(chalk.black(`Port: ${opt.listen}              `)));

        if (opt.mock === true) {
            tips.push(" API Storage: ON ");
            // log.blue("API Storage: ON ", false);
        }

        log.bgGreen(tips);

        Object.keys(rules).forEach((rule) => {
            log.blue(`Rule: ${rule}`, false);
            log.blue(
                `Rule Config: ${JSON.stringify(rules[rule], null, 4)}`,
                false
            );
        });

        if (opt.homepage) {
            util.openBrowser(`http://${util.getLocalIp()}:${opt.listen}/${opt.homepage}`);
        }

    } catch (error) {
        console.log(error);
    }
};

/**
 * koa中间件，当识别到用户配置的规则需要使用本地模式时，将会从已有数据中抓取数据并返回
 * @param {object} opt - koa启动服务器的必要配置，例如，端口，项目名称，是否启用mock数据等
 * @param {object} rules - 用户自行配置的规则集合
 */
function resSendMock(opt, rules) {
    const getPostParam = (ctx) => {
        const promise = new Promise((resolve, reject) => {
            let postData = "";
            try {
                ctx.req.addListener("data", (data) => {
                    postData += data;
                    // console.log(1, postData);
                });
                ctx.req.addListener("end", () => {
                    // console.log(2, postData);
                    resolve(postData);
                });
            } catch (e) {
                console.log(e);
                reject(e);
            }
        });

        return promise;
    };

    return async (ctx, next) => {
        const url = Object.keys(rules).find(($path) => $path === ctx.path);
        let ruleExtraProxyOpts;
        let param = {};

        try {
            ruleExtraProxyOpts = rules[url].extraProxyOpts || {};
        } catch (error) {
            ruleExtraProxyOpts = {};
        }

        if (
            ruleExtraProxyOpts.local === true ||
            (opt.local === true &&
                [undefined, true].includes(ruleExtraProxyOpts.local))
        ) {
            if (["POST", "PUT"].includes(ctx.req.method)) {
                param = await getPostParam(ctx);

                try {
                    param = JSON.parse(param);
                } catch (error) {
                    param = {};
                }
            } else {
                param = ctx.request.query;
            }

            ctx.body = mock.getMockData(
                ctx.path,
                ctx.req.method,
                opt.name,
                param
            );
        } else {
            await next();
        }
    };
}

/**
 *
 * @param {object} opt - koa启动服务器的必要配置，例如，端口，项目名称，是否启用mock数据等
 * @param {object} rule - 用户自行配置的一条规则
 * @param {object} extraProxyOpt - 用户自定义配置规则中的代理额外配置，会覆盖项目的全局配置
 */
function extendOpts(opt, rule, extraProxyOpt = {}) {
    let postParams;

    return {
        events: {
            error(err, req, res) {
                console.log(err);
            },
            proxyReq(proxyReq, req, res) {
                let data = "";

                if (rule.header) {
                    Object.keys(rule.header).forEach((key) =>
                        proxyReq.setHeader(key, rule.header[key])
                    );
                }

                req.on("data", (chunk) => {
                    data = chunk.toString();
                });
                req.on("end", () => {
                    postParams = decodeURI(data);
                });
            },
            proxyRes(proxyRes, req, res) {
                let body = [];
                const extra = {
                    res: res,
                    req: req,
                    rule: rule,
                    ruleProxyOpt: extraProxyOpt,
                    opt: opt
                };

                proxyRes.on("data", (chunk) => body.push(chunk));
                proxyRes.on("end", () => {
                    // 没有启用本地模式，全局设置了保存mock数据，或规则中设置了额外的配置保存mock数据（覆盖全局）
                    if (
                        !opt.local &&
                        !extraProxyOpt.local &&
                        ((opt.mock && extraProxyOpt.mock === undefined) ||
                            extraProxyOpt.mock)
                    ) {
                        const _targetUrl = new URL(`${rule.target}${req.url}`);

                        let params;

                        if (!["POST", "PUT"].includes(req.method)) {
                            params = querystring.parse(
                                _targetUrl.searchParams.toString()
                            );
                        } else {
                            try {
                                params =
                                    postParams === ""
                                        ? {}
                                        : JSON.parse(postParams);
                            } catch (error) {
                                params = postParams;
                            }
                        }

                        if (
                            ![200, 301, 302].includes(res.statusCode) ||
                            !/^\/api\//.test(_targetUrl.pathname) ||
                            extraProxyOpt.mock === false
                        ) {
                            console.log("ignor storage mock data");
                            return;
                        }

                        switch (proxyRes.headers["content-encoding"]) {
                            case "gzip":
                                zlib.gunzip(
                                    Buffer.concat(body),
                                    (err, data) => {
                                        if (!err) {
                                            mock.storage(
                                                _targetUrl,
                                                data,
                                                params,
                                                extra
                                            );
                                        } else {
                                            console.log(err);
                                        }
                                    }
                                );
                                break;
                            default:
                                mock.storage(_targetUrl, body, params, extra);
                        }
                    }
                });
            }
        }
    };
}

function apiSortCall(a, b) {
    if (a === b) {
        return 0;
    }

    if (a.indexOf(b) === 0) {
        return -1;
    }

    if (b.indexOf(a) === 0) {
        return 1;
    }
}

function proxyGenerator(opt, userSet = {}) {
    const keys = ["target", "header", "changeOrigin", "secure", "logs"];
    const defaultKoaProxySet = {
        changeOrigin: true,
        secure: false,
        logs: (ctx, target) => {
            console.log(
                `%s - %s %s ${chalk.green("proxy to ->")} %s`,
                log.getTimeNow(),
                ctx.req.method,
                ctx.req.oldPath,
                new URL(ctx.req.url, target)
            );
        },
        extraProxyOpts: {}
    };

    keys.forEach((key) => {
        if (opt[key]) {
            defaultKoaProxySet[key] = opt[key];
        }
    });

    return Object.assign({}, defaultKoaProxySet, userSet);
}

module.exports = $proxy;
