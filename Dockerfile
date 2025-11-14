FROM public.ecr.aws/docker/library/node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .


FROM public.ecr.aws/docker/library/node:18-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=builder /app/package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/*.js ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
