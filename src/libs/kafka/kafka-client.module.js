"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaClientModule = void 0;
const microservices_1 = require("@nestjs/microservices");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
@(0, common_1.Module)({
    imports: [
        microservices_1.ClientsModule.registerAsync([
            {
                name: 'KAFKA_CLIENT',
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    transport: microservices_1.Transport.KAFKA,
                    options: {
                        client: {
                            clientId: 'ecom-rmk-producer',
                            brokers: [configService.get('KAFKA_BROKER', 'kafka:9092')],
                        },
                    },
                }),
            },
        ]),
    ],
    exports: [microservices_1.ClientsModule],
})
class KafkaClientModule {
}
exports.KafkaClientModule = KafkaClientModule;
