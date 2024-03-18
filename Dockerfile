FROM node:21-slim

ENV NODE_ENV production
ENV GITHUB_TOKEN ''
ENV MAX_BACKUPS 3
ENV ORGANISATIONS ''
ENV AFFILIATION owner,collaborator,organization_member
ENV SCHEDULE 0 1 * * *

RUN apt-get -y update && apt-get -y install git && apt-get -y install zip

WORKDIR /home/node/app
RUN ln -s /home/node/backups /backups

COPY package.json yarn.lock .

RUN yarn install

COPY index.js .

CMD ["yarn", "start"]
