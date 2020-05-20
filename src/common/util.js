const fs = require("fs");
const moment = require("moment");
const log = require("./log");
const path = require("path");

const configFile  = "serus-config.json";

const util = {
    folder: {

        create: (path, sync = false, tip = false) => {
            if (sync === true) {
                if (!fs.existsSync(path)) {
                    fs.mkdirSync(path);

                    if (tip) {
                        log.green(`${util.getTimeNow()} 目录创建成功：${path}`);
                        console.log("\n");
                    }
                } else {
                    if (tip === true) {
                        console.log(`${util.getTimeNow()} 目录已存在：${path} `);
                        console.log("\n");
                    }
                }
            } else {
                if (!fs.existsSync(path)) {
                    fs.mkdir(path, err => {
                        if (tip === true) {
                            if (err) {
                                console.error(err);
                                console.log("\n");
                            } else {
                                log.green(`${util.getTimeNow()} 目录创建成功：${path}`);
                            }
                        }
                    });
                } else {
                    if (tip === true) {
                        console.log(`${util.getTimeNow()} 目录已存在：${path} `);
                    }
                }
            }
        },

        createConfig: async (tip = false) => {
            const create = path => {
                return new Promise((resolve, reject) => {
                    fs.mkdir(path, {}, (err) => {
                        if (!err) {
                            if (tip) {
                                log.green(`路径创建成功! ${path}`, true);
                            }
                            resolve(`路径创建成功! ${path}`);
                        } else {
                            if (tip) {
                                log.red(`路径创建失败! ${path}`, true);
                                console.error(err);
                            }

                            reject(err);

                            process.exit();
                        }
                    });
                });
            };

            const doMkdir = folderPath => {
                return new Promise((resolve) => {
                    if (!fs.existsSync(folderPath)) {
                        if (tip) {
                            log.time(`路径不存在! ${path.normalize(folderPath)} 开始创建路径`);
                        }

                        const root = path.parse(folderPath).root;

                        let folders = path.normalize(folderPath).split("\\");

                        folders.splice(0, 1);

                        folders.forEach(async (folderName, index) => {
                            const parsedPath = folders.slice(0, index + 1);
                            const currentPath = path.join(root, ...parsedPath);

                            if (!fs.existsSync(currentPath)) {
                                await create(currentPath);

                                if (index === (folders.length - 1)) {
                                    resolve();
                                }
                            } else {
                                if (index >= (folders.length - 1)) {
                                    resolve();
                                }
                            }
                        });
                    } else {
                        if (tip) {
                            log.time(`路径已存在! ${path.normalize(folderPath)}`);
                        }
                        resolve();
                    }
                });
            };

            const paths = util.folder.getProjectPath();
            const keys = Object.keys(paths);

            keys.forEach(async (key) => {
                await doMkdir(path.normalize(paths[key]));
            });

            await doMkdir(path.join(paths.project, "debug"));
        },

        getProjectPath: (config = {}) => {
            config = Object.keys(config).length === 0 ? util.getConfig() : config;

            let result = {};
            Object.keys(config.svn.folder).forEach(key => {
                if (key !== "project") {
                    result[key] = path.normalize(path.join(config.svn.folder.project, key));
                } else {
                    result[key] = config.svn.folder[key];
                }
            });

            return result;
        },

        getRoot: () => {
            return process.cwd();
        }

    },

    getRegion: (setting = false, defaultVal = false, splite = "_") => util.getDataType(setting, "object") && util.getDataType(setting.region, "string") ? `${splite}${setting.region}` : defaultVal,

    getDataType: (data, type) => {
        let result = false;
        const getType = () => Object.prototype.toString.call(data);

        switch (type) {

            case "object":
                result = getType() === "[object Object]";
                break;
            case "string":
                result = getType() === "[object String]";
                break;
            case "array":
                result = getType() === "[object Array]";
                break;
            case "function":
                result = getType() === "[object Function]";
                break;
            case "undefined":
                result = getType() === "[object Undefined]";
                break;
                
        }

        return result;
    },

    getTimeNow: () => {
        return moment(new Date().getTime()).format("YYYY-MM-DD HH:mm:ss");
    },

    repeatStr: (str, length) => {
        return new Array(length).fill(str).join("");
    },

    cutline: (str, color) => {
        color = !color ? "green" : color;

        let cut = util.repeatStr("=", 60);

        [cut, ` ${str}`, cut, "\n"].forEach(temp => log[color](temp));
    },

    parseObjField: (key, obj) => {
        let locale = obj;
        const paths = key.split(".");
        const deplength = paths.length;
        let index = 0;

        while (locale && index < deplength) {
            locale = locale[paths[index++]];
        }

        return index === deplength ? locale : undefined;
    },

    sortArrByName: (arr, field) => {
        arr.sort((a, b) => {
            let [
                nameA,
                nameB
            ] = [
                field ? util.parseObjField(field, a).toUpperCase() : a.toUpperCase(),
                field ? util.parseObjField(field, b).toUpperCase() : b.toUpperCase()
            ];

            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }

            return 0;
        });

        return arr;
    },

    output: {
        json: (path, data) => {
            fs.writeFileSync(`${path}`, JSON.stringify(data, null, 4));
        },

        tryToJson: (path, data) => {
            try {
                data = JSON.stringify(data, null, 4);
            } catch (error) {
                console.log("");
            }

            fs.writeFileSync(`${path}`, data);
        },

        config: data => {
            util.output.json(path.join(util.folder.getRoot(), "config.json"), data);
        }
    },

    array: {
        includes: (data, target) => {
            return Array.isArray(data) && data.length > 0 && data.includes(target);
        }
    },

    val: {
        inavailableArr: data => {
            return !Array.isArray(data) || data.length <= 0;
        },
        availableArr: data => {
            return Array.isArray(data) && data.length > 0;
        }
    },

    getConfig: () => {
        const program = require("commander");
        program.parse(process.argv);

        const configPath = program.config ? path.normalize(program.config) : path.join(process.cwd(), "serus-config.json");

        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath));
        } else {
            log.red(`无效配置路径！${configPath}`, true);
            process.exit();
        }
    },

    getUsrConfig: () => {
        let result = {
            config: {}
        };
        const cwd = process.env.INIT_CWD || process.cwd();
        const arr = cwd.split(path.sep);

        for (let i = arr.length; i > 0; i--) {
            const folder = arr.slice(0, i).join(path.sep);
            const filePath = path.join(folder, configFile);

            if (fs.existsSync(filePath)) {
                result = Object.assign({}, result, {
                    folder: folder,
                    filePath: filePath,
                    config: JSON.parse(fs.readFileSync(filePath))
                });
                break;
            }
        }

        return result;
    },

    tryParseJson: data => {
        try {
            return JSON.parse(data);
        } catch (error) {
            return data;
        }
    }

};

module.exports = util;
