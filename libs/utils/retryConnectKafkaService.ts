export async function retryConnectKafkaService(connectRetry: () => Promise<any>, maxRetries = 5, initialDelay = 2000): Promise<void> {
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      await connectRetry();
      console.log(`✅ Kafka microservice (ServerKafka) started successfully on attempt ${attempt}`);
      return;
    } catch (error: any) {
      const isRetriable = error?.retriable !== false &&
        (error?.type === 'UNKNOWN_TOPIC_OR_PARTITION' ||
          error?.code === 3 ||
          error?.message?.includes('topic-partition') ||
          error?.message?.includes('ECONNREFUSED'));

      if (attempt === maxRetries || !isRetriable) {
        console.error(`❌ Failed to start Kafka microservice (ServerKafka) after ${attempt} attempts:`, error?.message || error);
        if (attempt === maxRetries) {
          throw error;
        }
      }

      // Calculate delay with exponential backoff, then wait before next attempt
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️  Kafka microservice (ServerKafka) startup failed (attempt ${attempt}/${maxRetries}), waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      attempt++; // Move to next attempt after delay
    }
  }
}