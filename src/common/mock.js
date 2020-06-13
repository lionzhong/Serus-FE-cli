const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const CryptoJS = require("crypto-js");
const _ = require("lodash");
const util = require("./util");
const log = require("./log");
const chalk = require("chalk");
const userSetting = util.getUsrConfig();

const mockMap = {
    data: {},
    hash: ""
};

const getHashByStr = (data) => {
    return CryptoJS.SHA1(JSON.stringify(data)).toString();
};

const mock = {
    mapJsonFileName: "serus_proxy_mock_map.json",

    init() {
        let mockPath = "";

        if (
            userSetting.config["proxy-mock"] &&
            userSetting.config["proxy-mock"].path
        ) {
            mockPath = path.resolve(userSetting.config["proxy-mock"].path);
        } else {
            mockPath = userSetting.folder;
        }

        mockPath = path.join("serus-mock");

        if (!fs.existsSync(mockPath)) {
            fs.mkdirSync(mockPath);
        }

        const mapPath = path.join(mockPath, this.mapJsonFileName);

        if (!fs.existsSync(mapPath)) {
            util.output.json(mapPath, {});
            mockMap.hash = getHashByStr(mockMap.data);
        } else if (Object.keys(mockMap.data).length === 0) {
            mockMap.data = JSON.parse(fs.readFileSync(mapPath), "utf8");
            mockMap.hash = getHashByStr(mockMap.data);
        }

        return {
            mockFolder: mockPath,
            mapPath: mapPath
        };
    },

    /**
     * 写入mock数据，根据API，req.method，入参来数据生成hash值，并以此hash值来判断是否需要写入数据
     * @param {URL} __url - node URL对象
     * @param {object} data - 需要保存的mock数据
     * @param {object} params - 请求参数
     * @param {object} extra - 包含res, req, rule, ruleProxyOpt
     */
    storage(__url, data, params, extra) {
        const apiPath = __url.pathname;
        const mock = this.init();
        const ignorKey = ["random"];
        const map = Object.assign({}, mockMap.data);
        let apiInMapIndex = -1;
        let mockFileName = `${uuidv4()}.json`;

        ignorKey.forEach((key) => (params[key] ? delete params[key] : ""));

        let hashSource = {
            url: apiPath,
            method: extra.req.method,
            params: params,
            data: data.toString()
        };

        ["params", "data"].forEach((key) => {
            if (
                ["[object Object]", "[object Array]"].includes(
                    Object.prototype.toString.call(hashSource[key])
                )
            ) {
                hashSource[key] = JSON.stringify(hashSource[key]);
            }
        });

        const hash = getHashByStr(hashSource);

        if (!map[extra.opt.name] || !map[extra.opt.name][apiPath]) {
            if (!map[extra.opt.name]) {
                map[extra.opt.name] = {};
            }

            map[extra.opt.name][apiPath] = [
                {
                    method: extra.req.method,
                    params: params,
                    hash: hash,
                    mockFile: mockFileName
                }
            ];
        } else {
            // 找出相同接口，相同req.method，相同入参的接口
            const index = map[extra.opt.name][apiPath].findIndex(
                (mock) =>
                    mock.method === extra.req.method &&
                    JSON.stringify(mock.params) === JSON.stringify(params)
            );
            apiInMapIndex = index;

            if (index > -1) {
                // 如果已有数据hash跟现有一致时，不再写入数据
                if (map[extra.opt.name][apiPath][index].hash === hash) {
                    log.time(
                        `- ${extra.req.method} ${apiPath} ${chalk.blue(
                            "Ignor storage mock data, api response hash duplicated."
                        )}`
                    );
                    // log.blue(`params: ${JSON.stringify(map[extra.opt.name][apiPath][index].params, null, 4)}\n\n`);
                    return;
                }
                mockFileName = map[extra.opt.name][apiPath][index].mockFile;
            } else {
                map[extra.opt.name][apiPath].push({
                    method: extra.req.method,
                    params: params,
                    hash: hash,
                    mockFile: mockFileName
                });
            }
        }

        const projectMockFoder = path.join(
            mock.mockFolder,
            CryptoJS.SHA1(extra.opt.name).toString()
        );

        if (!fs.existsSync(projectMockFoder)) {
            fs.mkdirSync(projectMockFoder);
        }

        const fullPath = path.resolve(
            path.join(projectMockFoder, mockFileName)
        );

        util.output.tryToJson(fullPath, data.toString(), true, function () {
            log.time(
                `- ${extra.req.method} ${apiPath} ${chalk.green(
                    "mock to ->"
                )} ${fullPath}`
            );
        });

        if (getHashByStr(map) !== mockMap.hash) {
            util.output.tryToJson(path.resolve(mock.mapPath), map);

            mockMap.hash = getHashByStr(map);
            mockMap.data = map;

            log.time(
                `${chalk.green("Mock map updated ->")} ${path.resolve(
                    mock.mapPath
                )}`
            );
        } else {
            log.time(
                chalk.blue("Ignor storage mock map, file hash duplicated.")
            );
        }
    },

    getMapFile() {
        const $path = this.init();
        return util.tryParseJson(fs.readFileSync($path.mapPath, "utf8"));
    },

    /**
     * 获取Mock数据
     * @param {string} url - 请求地址
     * @param {string} method - 请求地址
     * @param {string} name - 项目名称
     * @param {object} params - 请求参数
     */
    getMockData(url, method, name, params = {}) {
        if (!url || !method) {
            return;
        }
        const [$path, map, defaultData, proxyNameHash] = [
            this.init(),
            mockMap.data,
            {
                status: 2000,
                result: {}
            },
            CryptoJS.SHA1(name).toString()
        ];

        if (map[name] && map[name][url]) {
            const mock = map[name][url].find((mockOpt) => {
                return (
                    mockOpt.method === method &&
                    _.isEqual(mockOpt.params, params)
                );
            });

            if (mock) {
                const fullPath = path.resolve(
                    path.join($path.mockFolder, proxyNameHash, mock.mockFile)
                );

                log.time(
                    `- ${method} ${url} ${chalk.green(
                        "load mock from ->"
                    )} ${fullPath}`
                );
                return util.tryParseJson(fs.readFileSync(fullPath, "utf8"));
            } else {
                return Object.assign({}, defaultData, {
                    notMatchMockFile: true
                });
            }
        } else {
            return Object.assign({}, defaultData, { noMockData: true });
        }
    }
};

module.exports = mock;
