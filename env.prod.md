NODE_ENV = prod
PORT = 3000

DB_USERNAME = ecom-rmk
DB_PASSWORD = conthanlan@nlv
DB_HOST = ecom-rmk.x1maxn0.mongodb.net
DB_APP_NAME = ecom-rmk
DB_URI = mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}/?appName=${DB_APP_NAME}

# Redis (prefer 3-master cluster)
REDIS_CLUSTER_NODES = redis-node-1:6379,redis-node-2:6379,redis-node-3:6379,redis-node-4:6379,redis-node-5:6379,redis-node-6:6379
REDIS_HOST = redis
REDIS_PORT = 6379

# Kafka
KAFKA_BROKER = kafka:9092
KAFKAJS_NO_PARTITIONER_WARNING = 1