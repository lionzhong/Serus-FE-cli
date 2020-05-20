// const Koa = require("koa");
// const proxy = require("koa-proxies");
// const path = require("path");
// const static = require("koa-static");

// const app = new Koa();
// const test = async (ctx, next) => {
//     await next();
//     const rt = ctx.response.get('X-Response-Time');
//     console.log(`${ctx.method} ${ctx.url} - ${rt}`);
// };

// app.use(async ctx => {
//     ctx.body = {"Hello World": 1};
// });
// app.listen(4000);

const a = [
    {
        "target": "1.1.1.2221"
    }, 
    {
        "target": "1.1.1.1"
    }, 
    {
        "target": "1.1.1.1"
    }
];
const b = (arg1) => (arg2) => {
    console.log("arg1", arg1);    
    console.log("arg1", arg2);    
};

a.forEach(val => {
    b(val.target);
});
