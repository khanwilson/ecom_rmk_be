"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mailer_service_1 = require("./mailer.service");
@(0, common_1.Global)()
@(0, common_1.Module)({
    imports: [config_1.ConfigModule],
    providers: [mailer_service_1.MailerService],
    exports: [mailer_service_1.MailerService],
})
class MailerModule {
}
exports.MailerModule = MailerModule;
