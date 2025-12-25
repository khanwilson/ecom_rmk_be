# ===== Identity =====
NODE_ENV = dev
IDENTITY_PORT = 3100

# Mongo (Prisma/MongoDB) - Identity DB (override nếu khác DB shared)
DB_USERNAME = ecom-rmk
DB_PASSWORD = conthanlan%40nlv # %40 = @
DB_HOST = ecom-rmk.x1maxn0.mongodb.net
DB_APP_NAME = ecom-rmk
DB_NAME = identity-db
DB_URI = mongodb://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}?appName=${DB_APP_NAME}

# Auth / JWT / Bcrypt
JWT_ACCESS_SECRET = conthanlan_nlv_as
JWT_REFRESH_SECRET = conthanlan_nlv_rf
ACCESS_TOKEN_EXPIRES_IN = 24h
REFRESH_TOKEN_EXPIRES_IN = 7d
BCRYPT_SALT_ROUNDS = 12

# OTP / Mail (dự phòng cho tính năng gửi mã)
OTP_TTL_SECONDS = 300
OTP_MAX_PER_WINDOW = 5
OTP_WINDOW_SECONDS = 3600
MAIL_HOST = smtp.example.com
MAIL_PORT = 587
MAIL_USER = mailer@example.com
MAIL_PASSWORD = mailer_password
MAIL_FROM = "Ecom Identity <no-reply@example.com>"