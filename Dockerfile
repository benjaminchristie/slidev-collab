FROM node:20-alpine

WORKDIR /app

# Install Slidev and default theme globally.
# Pinned rather than `latest` so that rebuilding this image cannot move your
# slides under you. Keep it the same as Dockerfile.export.
ARG SLIDEV_VERSION=52.19.0
RUN npm i -g "@slidev/cli@${SLIDEV_VERSION}" @slidev/theme-default

EXPOSE 3030

# Launch Slidev targeting slides.md in whatever directory is mounted to /app
CMD ["slidev", "slides.md", "--remote"]
