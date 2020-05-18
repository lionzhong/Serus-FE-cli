/**
 * 使用说明
 * 
 * 此工具使用命令行操作，指令说明如下
 * 
 * 主指令
 *  =======================================
 * --deploy --update --cleanup
 * 
 * --deploy：
 * 
 * 此指令用于部署moudules，trunk，branches到对应目录，可组合使用。
 * 
 * 模块部署：
 *  =======================================
 * checkout all modules to project/modules
 * 
 *  --deploy --module
 * 
 * checkout one module to project/modules
 * 
 *  --deploy --module=nangka
 *  --deploy --module=nangka --region=ap
 * 
 * trunk平台部署:
 * =======================================
 * checkout all platforms to project/trunk
 * 
 *  --deploy --trunk
 * 
* checkout multiple platforms to project/trunk
 * 
 *  --deploy --trunk=krosa
 *  --deploy --trunk=krosa --region=ap
 * 
 *  只有填写region才会部署对应区域平台
 * 
 * branches 分支部署:
 * =======================================
 * checkout all branches to project/branches
 * 
 *  --deploy --branch
 * 
 * checkout multiple branches to project/branches
 * 
 *  --deploy --branch=krosa 不区分版本，但不包括区域的指定平台
 *  --deploy --branch=krosa --version=2.0.5.0 指定对应版本对应平台
 *  --deploy --branch=krosa --region=ap 不区分版本，包括区域的指定平台
 *  --deploy --branch=krosa --version=2.0.5.0 --region=ap 指定对应版本，对应区域，对应平台
 * 
 *  只有填写region才会部署对应区域平台
 * 
 * update/cleanup 操作
 * =======================================
 * 操作方式和trunk,branches操作完全一致，切换主指令即可
 */

const command = require("./src/command");

command();
