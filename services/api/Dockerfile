FROM node:22-alpine
WORKDIR /app
COPY services/api/package*.json ./
RUN npm install --omit=dev
COPY services/api/ ./
COPY cms/ /cms/
COPY web/assets/glyphs.json /cms/content/seed-glyphs.json
ENV PORT=8080 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8080
CMD ["npm","start"]
