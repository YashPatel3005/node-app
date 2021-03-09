#this version is that version which is in docker hub images
FROM node:10

#set working directory
WORKDIR /app

#copy all packages into new directory
COPY package*.json ./


#download all deependencies that paackage file has
RUN npm install

#copy all other file which is in current directory to app directory
COPY . /app

CMD ["npm", "start"]

#this port can be difffrent from our app port 
EXPOSE 3000