FROM node:22-alpine
WORKDIR /app
COPY services/mcp/ ./
COPY web/assets/glyphs.json /web/assets/glyphs.json
CMD ["node","flowforms-mcp.js"]
