FROM python:3.11-slim

# Install node for frontend build
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app

# Build frontend
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install
COPY frontend/ ./
RUN npm run build

# Setup backend
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# Expose the port
EXPOSE 8000

# We need the backend to serve the frontend dist folder
# But for simplicity if using a start.sh we could run two processes, 
# or just tell FastAPI to serve the frontend.
