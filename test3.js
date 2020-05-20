const Koa = require("koa");
const httpProxy = require("http-proxy");
const static = require("koa-static");

const app = new Koa();

//
// Create a proxy server with custom application logic
//
const proxy = httpProxy.createProxyServer({});

// To modify the proxy connection before data is sent, you can listen
// for the "proxyReq" event. When the event is fired, you will receive
// the following arguments:
// (http.ClientRequest proxyReq, http.IncomingMessage req,
//  http.ServerResponse res, Object options). This mechanism is useful when
// you need to modify the proxy request before the proxy connection
// is made to the target.
//
// proxy.on("proxyReq", function (proxyReq, req, res, options) {
//     proxyReq.setHeader("X-Special-Proxy-Header", "foobar");
// });

function resSendMock (opt, rules) {
    const getPostParam = (ctx) => {
        return new Promise((resolve, reject) => {
            try {
                let postData = "";
                ctx.req.addListener("data", (data) => {
                    postData += data;
                    console.log(1, postData);
                    resolve(postData);
                });
                ctx.req.addListener("end", () => {
                    console.log(2, postData);
                    resolve(postData);
                });
            } catch (e) {
                console.log("err");
                reject(e);
            }
        });
    };

    return async (ctx, next) => {
        let param = await getPostParam(ctx);
        console.log(param);

        await next();
    };
}
app.use(static("d:\\work\\web\\trunk\\tembin\\"));
app.use(resSendMock({
    a: 1
}, {
    c: 2
}));

app.use(async (ctx, next) => {
    ctx.req.headers.host = "10.67.14.6";
    ctx.req.headers.referer = "10.67.14.6";

    proxy.web(ctx.req, ctx.res, {
        target: "https://10.67.14.6",
        secure: false,
        changeOrigoin: true
    });

    await next();
});

app.listen(5050);
