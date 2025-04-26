# Use the official Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your code
COPY . .

ENV PORT=8080


# Expose the port your app runs on
EXPOSE 8080

# Start the app
CMD ["node", "index.js"]
