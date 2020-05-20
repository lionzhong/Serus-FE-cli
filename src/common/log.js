const chalk = require("chalk");
const moment = require("moment");

const log = {
    getTimeNow: () => {
        return `[${moment(new Date().getTime()).format(
            "YYYY-MM-DD HH:mm:ss"
        )}]`;
    },

    done: (str) => {
        console.log(
            "====================================================================="
        );
        console.log(` ${log.getTimeNow()} - ${str}`);
        console.log(
            "====================================================================="
        );
        console.log("\n");
    },

    color: (str, color, time, op) => {
        str = time ? `${log.getTimeNow()} ${str}` : str;

        console.log(chalk.bold[color](`${str}`), op && op.blank ? "\n" : "");
    },

    green: (str, time, op) => {
        log.color(str, "green", time, op);
    },

    yellow: (str, time, op) => {
        log.color(str, "yellow", time, op);
    },

    red: (str, time, op) => {
        log.color(str, "red", time, op);
    },

    blue: (str, time, op) => {
        log.color(str, "blue", time, op);
    },

    warn: (str, time, op) => {
        log.color(str, "yellow", time, op);
    },

    error: (str, time, op) => {
        log.color(str, "red", time, op);
    },

    gray: (str, time, op) => {
        log.color(str, "gray", time, op);
    },

    json: (data, time) => {
        if (time) {
            console.log(log.getTimeNow());
        }
        console.log(JSON.stringify(data, null, 2));
    },

    time: (str, op) => {
        console.log(`${log.getTimeNow()} ${str}`, op && op.blank ? "\n" : "");
    }
};

module.exports = log;
