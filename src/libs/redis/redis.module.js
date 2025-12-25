"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const redis_controller_1 = require("./redis.controller");
const redis_service_1 = require("./redis.service");
@(0, common_1.Global)()
@(0, common_1.Module)({
    imports: [config_1.ConfigModule],
    controllers: [redis_controller_1.RedisController],
    providers: [redis_service_1.RedisService],
    exports: [redis_service_1.RedisService],
})
class RedisModule {
}
exports.RedisModule = RedisModule;
