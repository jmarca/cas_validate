FROM node:18-alpine


# working in /usr/src/dev
WORKDIR /usr/src/dev

RUN apk add --no-cache libxml2 libxml2-dev libstdc++ bash ca-certificates git python3 build-base openssl \
    && npm install -g npm \
    && npm install -g node-gyp

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY .snyk ./
RUN npm i

# really only doing this to make sure all will work when I run tests
RUN ["npm", "i", "--only=production"]
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
# COPY . .

# CMD [ "npm", "start" ]
