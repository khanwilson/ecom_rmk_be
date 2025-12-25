"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
@(0, swagger_1.ApiTags)('kafka')
@(0, common_1.Controller)('kafka')
class KafkaController {
    kafkaClient;
    redisService;
    constructor(
    @(0, common_1.Inject)('KAFKA_CLIENT')
    kafkaClient, redisService) {
        this.kafkaClient = kafkaClient;
        this.redisService = redisService;
    }
    async onModuleInit() {
        await this.kafkaClient.connect();
        console.log('✅ Kafka Producer connected');
    }
    @(0, common_1.Post)('send')
    @(0, swagger_1.ApiOperation)({ summary: 'Send an event to Kafka topic with rate limiting' })
    @(0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                topic: { type: 'string', example: 'order.created' },
                message: {
                    type: 'object',
                    example: { orderId: '123', userId: '456', total: 99.99 },
                },
            },
        },
    })
    async sendEvent(
    @(0, common_1.Body)()
    body, 
    @(0, common_1.Ip)()
    ip) {
        const { topic, message } = body;
        const rateLimitKey = `rate:kafka:send:${ip}`;
        const rateLimit = await this.redisService.checkRateLimit(rateLimitKey, 5, 60);
        if (!rateLimit.allowed) {
            throw new common_1.HttpException({
                message: 'Too many Kafka events sent',
                retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        this.kafkaClient.emit(topic, message);
        console.log(`📤 [Kafka Producer] Event emitted to topic: ${topic}`);
        console.log(`   Rate limit remaining: ${rateLimit.remaining}`);
        return {
            success: true,
            message: `Event sent to topic: ${topic}`,
            timestamp: new Date().toISOString(),
            rateLimit: {
                remaining: rateLimit.remaining,
                resetAt: new Date(rateLimit.resetAt).toISOString(),
            },
        };
    }
    @(0, common_1.Get)('health')
    @(0, swagger_1.ApiOperation)({ summary: 'Check Kafka connection health' })
    healthCheck() {
        return {
            status: 'ok',
            kafka: 'connected (NestJS Microservices)',
            mode: 'KRaft (no Zookeeper)',
            timestamp: new Date().toISOString(),
        };
    }
}
exports.KafkaController = KafkaController;
