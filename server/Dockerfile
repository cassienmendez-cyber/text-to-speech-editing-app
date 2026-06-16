FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY signaling.js ./
ENV PORT=4444
EXPOSE 4444
CMD ["node", "signaling.js"]
