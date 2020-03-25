# Stage-1 dependencies
FROM node:12 as dep

# Create app directory
WORKDIR /usr/src/app

COPY package.json .
RUN npm i



FROM node:12-alpine


# Create app directory
WORKDIR /usr/src/app

RUN apk add --no-cache libstdc++ bash ca-certificates git python build-base openssl

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# really only doing this to make sure all will work when I run tests
RUN ["npm", "i", "--only=production"]
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
# COPY . .

CMD [ "npm", "start" ]
