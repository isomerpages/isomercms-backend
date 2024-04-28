# FROM ruby:3.3.1-alpine3.19 AS main

# RUN apk add --no-cache libcurl xz-libs \
#  && apk add --no-cache --virtual tmp build-base libxml2-dev libxslt-dev gcompat \
#  && gem install nokogiri \
#  && gem install html-proofer  \
#  && apk del tmp

# WORKDIR /src

# ENTRYPOINT [ "htmlproofer" ]


# FROM main AS ci

# ENTRYPOINT [ "" ]
# # keep this docker alive
# CMD [ "tail", "-f", "/dev/null" ]
# # CMD [ "htmlproofer" ]

# FROM ruby:3-alpine

# RUN apk add --no-cache build-base libcurl gcompat && gem install html-proofer -v 4.4.1 && apk del build-base

# CMD ["htmlproofer","--help"]

# FROM ruby:3-alpine


FROM ruby:3.0-alpine

RUN apk add --no-cache build-base libxml2-dev libxslt-dev
RUN gem install nokogiri --platform=ruby -- --use-system-libraries

RUN apk add --no-cache build-base libcurl && gem install html-proofer -v 4.4.1 && apk del build-base

CMD ["htmlproofer","--help"]