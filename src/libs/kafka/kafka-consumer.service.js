"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaConsumerService = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
@(0, common_1.Injectable)()
class KafkaConsumerService {
    redisService;
    logger = new common_1.Logger(KafkaConsumerService.name);
    constructor(redisService) {
        this.redisService = redisService;
    }
    @(0, microservices_1.EventPattern)('order.created')
    async handleOrderCreated(
    @(0, microservices_1.Payload)()
    data, 
    @(0, microservices_1.Ctx)()
    context) {
        const originalMessage = context.getMessage();
        const { key, attributes, offset } = originalMessage;
        const userId = data.userId || 'unknown';
        const rateLimitKey = `consumer:order:${userId}`;
        const rateLimit = await this.redisService.checkRateLimit(rateLimitKey, 5, 60);
        if (!rateLimit.allowed) {
            this.logger.warn(`⚠️ Rate limit exceeded for user ${userId} - skipping order event`);
            return;
        }
        this.logger.log('📥 [Kafka Consumer] Received order.created event');
        this.logger.log(`   key: ${key}, attributes: ${attributes}, Offset: ${offset}`);
        this.logger.log(`   Data:`, data);
        this.logger.log(`   Rate limit remaining: ${rateLimit.remaining}`);
        await this.processOrder(data);
    }
    @(0, microservices_1.EventPattern)('user.registered')
    async handleUserRegistered(
    @(0, microservices_1.Payload)()
    data, 
    @(0, microservices_1.Ctx)()
    context) {
        const { key } = context.getMessage();
        const userId = data.userId || data.email || 'unknown';
        const debounceKey = `debounce:welcome:${userId}`;
        const allowed = await this.redisService.debounce(debounceKey, 300);
        if (!allowed) {
            this.logger.warn(`⚠️ Debounced welcome email for user ${userId}`);
            return;
        }
        this.logger.log('📥 [Kafka Consumer] Received user.registered event');
        this.logger.log(`   key: ${key}`);
        this.logger.log(`   Data:`, data);
        await this.sendWelcomeEmail(data);
    }
    @(0, microservices_1.EventPattern)('test-topic')
    async handleTestEvent(
    @(0, microservices_1.Payload)()
    data) {
        console.log('📥 [Kafka Consumer] Received test event:', data);
    }
    async processOrder(orderData) {
        console.log('   Processing order:', orderData.orderId || 'N/A');
    }
    async sendWelcomeEmail(userData) {
        console.log('   Sending welcome email to:', userData.email || 'N/A');
    }
}
exports.KafkaConsumerService = KafkaConsumerService;
