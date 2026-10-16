FROM rust:1.85-bookworm AS build
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN useradd -r -u 10001 app && apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/leave-server /usr/local/bin/leave-server
USER app
EXPOSE 8080
CMD ["leave-server"]
