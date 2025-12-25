"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaModule = void 0;
const common_1 = require("@nestjs/common");
const kafka_client_module_1 = require("./kafka-client.module");
const kafka_controller_1 = require("./kafka.controller");
const kafka_consumer_service_1 = require("./kafka-consumer.service");
@(0, common_1.Module)({
    imports: [kafka_client_module_1.KafkaClientModule],
    controllers: [kafka_controller_1.KafkaController],
    providers: [kafka_consumer_service_1.KafkaConsumerService],
    exports: [kafka_client_module_1.KafkaClientModule],
})
class KafkaModule {
}
exports.KafkaModule = KafkaModule;
