# Stage 1: Build the Go binary
FROM golang:1.22-alpine AS builder

# Install build dependencies for SQLite (CGO)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application with CGO enabled
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-w -s" -o api cmd/api/main.go

# Stage 2: Create the minimal runtime image
FROM alpine:latest

WORKDIR /app

# Install ca-certificates and tzdata for proper HTTPS and time handling
RUN apk add --no-cache ca-certificates tzdata

# Create directory for persistent data (SQLite DB)
RUN mkdir -p /data

# Copy the binary from the builder stage
COPY --from=builder /app/api .
# Copy migrations
COPY --from=builder /app/migrations ./migrations

# Expose the API port
EXPOSE 8080

# Environment variables defaults
ENV PORT=8080
ENV DB_PATH=/data/dash-fin.sqlite

# Run the binary
CMD ["./api"]
