# Stage-1 dependencies
FROM node:latest as dep

RUN mkdir /sample
WORKDIR /sample

ADD package.json .
RUN ["npm", "i", "--only=production"]



FROM node:8-alpine


# Create app directory
WORKDIR /usr/src/app

RUN apk add --no-cache libstdc++ bash ca-certificates git python

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# really only doing this to make sure all will work when I run tests
RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

CMD [ "npm", "start" ]
