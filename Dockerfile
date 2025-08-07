# Use the official Apify base image with Node.js and Puppeteer
FROM apify/actor-node-puppeteer-chrome:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm i --only=production

# Copy source code
COPY . ./

# Run the scraper
CMD npm start