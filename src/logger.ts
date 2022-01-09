import bunyan from "bunyan";

export const logger = bunyan.createLogger({
  name: "stormlight-api",
  src: process.env.NODE_ENV === "production" ? false : true,
  serializers: {
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res,
  },
});
