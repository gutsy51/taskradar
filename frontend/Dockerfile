FROM oven/bun:1.2

WORKDIR /app

COPY bun.lock package.json ./
RUN bun install

COPY . .
RUN bun run build

CMD bun start