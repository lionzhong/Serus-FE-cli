const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const _ = require("lodash");
const util = require("./util");
const log = require("./log");
const chalk = require("chalk");
const userSetting = util.getUsrConfig();

const mock = {

    mapJsonFileName: "serus_proxy_mock_map.json",

    init () {
        let mockPath = "";
        
        if (userSetting.config["proxy-mock"] && userSetting.config["proxy-mock"].path) {
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
        }
    
        return {
            mockFolder: mockPath,
            mapPath: mapPath
        };
    },

    /**
     * 
     * @param {URL} __url - node URL对象
     * @param {object} data - 需要保存的mock数据
     * @param {object} params - 请求参数
     * @param {object} extra - 包含res, req, rule, ruleProxyOpt
     */
    storage (__url, data, params, extra) {
        const apiPath = __url.pathname;
        const mock = this.init();
        const map = JSON.parse(fs.readFileSync(mock.mapPath));
        const ignorKey = ["random"];
    
        ignorKey.forEach(key => params[key] ? delete params[key] : "");
    
        let writeMap = true;
        let mockFileName = `${uuidv4()}.json`;
    
        if (!map[extra.opt.name] || !map[extra.opt.name][apiPath]) {
            if (!map[extra.opt.name]) {
                map[extra.opt.name] = {};
            }

            map[extra.opt.name][apiPath] = [{
                method: extra.req.method,
                params: params,
                mockFile: mockFileName
            }];
        } else {
            const index = map[extra.opt.name][apiPath].findIndex(mock => mock.method === extra.req.method && JSON.stringify(mock.params) === JSON.stringify(params));
    
            if (index > -1) {
                mockFileName = map[extra.opt.name][apiPath][index].mockFile;
                writeMap = false;
            } else {
                map[extra.opt.name][apiPath].push({
                    method: extra.req.method,
                    params: params,
                    mockFile: mockFileName
                });
            }
        }
    
        const fullPath = path.resolve(path.join(mock.mockFolder, mockFileName));

        util.output.tryToJson(fullPath, data.toString());

        log.time(`- ${extra.req.method} ${apiPath} mock to -> ${chalk.green(fullPath)}`);
    
        if (writeMap) {
            util.output.tryToJson(path.resolve(mock.mapPath), map);
            log.time(`Mock map updated -> ${chalk.green(path.resolve(mock.mapPath))}`);
        }
    },

    getMapFile () {
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
    getMockData (url, method, name, params = {}) {
        if (!url || !method) {
            return;
        }
        const [
            $path,
            map, 
            defaultData
        ] = [
            this.init(),
            this.getMapFile(),
            {
                status: 2000,
                result: {}
            }
        ];

        if (map[name] && map[name][url]) {
            const mock = map[name][url].find(mockOpt => {
                return mockOpt.method === method && _.isEqual(mockOpt.params, params);
            });

            if (mock) {
                const fullPath = path.resolve(path.join($path.mockFolder, mock.mockFile));

                log.time(`- ${method} ${url} load mock from -> ${chalk.green(fullPath)}`);
                return util.tryParseJson(fs.readFileSync(fullPath, "utf8"));
            } else {
                return Object.assign({}, defaultData, { notMatchMockFile: true });
            }
        } else {
            return Object.assign({}, defaultData, { noMockData: true });
        }
    }
};

module.exports = mock;
