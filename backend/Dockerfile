# BakaTracker production Dockerfile using UV dependency manager
FROM ghcr.io/astral-sh/uv:python3.12-bookworm

# Set the working directory in the container
WORKDIR /app

# Enable bytecode compilation and python unbuffered mode for logging
ENV UV_COMPILE_BYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy dependency specifications and lockfiles first to utilize caching
COPY pyproject.toml uv.lock README.md ./

# Install dependencies in the environment (skip installing the project package itself)
RUN uv sync --frozen --no-install-project

# Copy the actual application source code into the container
COPY . .

# Start uvicorn server mapping port to PORT env variable (Google Cloud Run default is 8080)
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
